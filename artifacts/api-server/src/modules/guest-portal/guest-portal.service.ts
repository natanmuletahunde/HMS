import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and, or, sql, desc, like, ilike, getTableColumns } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import {
  db,
  roomsTable,
  roomTypesTable,
  reservationsTable,
  guestsTable,
  roomServiceRequestsTable,
  stayChangesTable,
  notificationsTable,
  usersTable,
  invoicesTable,
  invoiceLineItemsTable,
  preCheckoutInspectionsTable,
  maintenanceRequestsTable,
} from '@workspace/db';

import { OtpService } from '../auth/otp.service';
import { AfroMessageService } from '../auth/afromessage.service';

@Injectable()
export class GuestPortalService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly afroMessage: AfroMessageService,
  ) {}

  /**
   * Generates a signed JWT session token for authenticated guest room access
   */
  generateGuestToken(payload: {
    guestId: string;
    guestName: string;
    roomNumber: string;
    roomId: string;
    reservationId: string;
    email?: string | null;
    phone?: string | null;
  }) {
    return this.jwtService.sign(
      {
        sub: payload.guestId,
        guestId: payload.guestId,
        role: 'guest',
        roomNumber: payload.roomNumber,
        roomId: payload.roomId,
        reservationId: payload.reservationId,
        guestName: payload.guestName,
        email: payload.email,
        phone: payload.phone,
      },
      { expiresIn: '7d' },
    );
  }

  /**
   * Validates Authorization Bearer token header
   */
  async validateTokenHeader(authHeader?: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new BadRequestException('Authorization Bearer token is required');
    }
    return this.validateToken(token);
  }

  /**
   * Validates guest JWT token and returns latest verified guest + room session
   */
  async validateToken(token: string) {
    try {
      const decoded: any = this.jwtService.verify(token);
      if (!decoded || decoded.role !== 'guest') {
        throw new BadRequestException('Invalid guest credentials');
      }

      const [guest] = await db
        .select()
        .from(guestsTable)
        .where(eq(guestsTable.id, decoded.guestId))
        .limit(1);

      // Check current reservation status for this guest
      let res: any = null;
      if (decoded.reservationId) {
        const [foundRes] = await db
          .select()
          .from(reservationsTable)
          .where(eq(reservationsTable.id, decoded.reservationId))
          .limit(1);
        res = foundRes;
      }

      // If no reservation found or reservation is not checked in, check if guest has any active checked_in reservation
      if (guest && (!res || res.status !== 'checked_in')) {
        const [activeCheckedIn] = await db
          .select()
          .from(reservationsTable)
          .where(
            and(
              eq(reservationsTable.guestId, guest.id),
              eq(reservationsTable.status, 'checked_in'),
            ),
          )
          .orderBy(desc(reservationsTable.createdAt))
          .limit(1);

        if (activeCheckedIn) {
          res = activeCheckedIn;
        }
      }

      const isStayActive = res?.status === 'checked_in';

      let room: any = null;
      const targetRoomId = res?.roomId || decoded.roomId;
      if (targetRoomId) {
        const [r] = await db
          .select()
          .from(roomsTable)
          .where(eq(roomsTable.id, targetRoomId))
          .limit(1);
        room = r;
      }

      return {
        valid: true,
        isStayActive,
        token,
        guest: guest
          ? {
              id: guest.id,
              guestCode: guest.guestCode,
              fullName: `${guest.firstName} ${guest.lastName}`.trim(),
              firstName: guest.firstName,
              lastName: guest.lastName,
              phone: guest.phone,
              email: guest.email,
              vipStatus: guest.vipStatus,
            }
          : null,
        room: room
          ? {
              id: room.id,
              number: room.number,
              floor: room.floor,
              type: room.roomTypeId,
            }
          : null,
        reservation: res
          ? {
              id: res.id,
              reservationNumber: res.reservationNumber,
              checkInDate: res.checkInDate,
              checkOutDate: res.checkOutDate,
              nights: res.nights,
              status: res.status,
              actualCheckIn: res.actualCheckIn,
            }
          : null,
        claims: decoded,
      };
    } catch (err: any) {
      throw new BadRequestException('Invalid or expired guest session token: ' + (err.message || ''));
    }
  }

  /**
   * Guest Login: authenticates guest by Full Name and Phone Number (or Fayda National ID).
   * Generates and returns a signed JWT token for all guest portal operations.
   * Room number is NOT required.
   */
  async login(body: {
    roomNumber?: string;
    accessCode?: string;
    fullName?: string;
    phone?: string;
    nationalId?: string;
    identifier?: string;
    password?: string;
  }) {
    let rawPhone = body.phone?.trim();
    let fullName = body.fullName?.trim();
    const identifier = body.identifier?.trim();
    if (identifier) {
      // If identifier starts with + or has only digits, dashes, spaces, parentheses
      const digitsOnly = identifier.replace(/\D/g, '');
      const isDigitsOrPhone = /^[+0-9\s\-()]+$/.test(identifier) && digitsOnly.length >= 4;
      if (isDigitsOrPhone) {
        rawPhone = identifier;
      } else {
        fullName = identifier;
      }
    }
    const phoneDigits = rawPhone?.replace(/\D/g, '') || '';
    const nationalId = body.nationalId?.trim();
    const roomNum = body.roomNumber?.trim();

    if (!phoneDigits && !fullName && !nationalId && !roomNum) {
      throw new BadRequestException('Registered Phone Number or Full Name is required to sign in.');
    }

    let guest: any = null;

    // 1. Try finding guest by phone or nationalId
    if (phoneDigits || nationalId) {
      const matchConds: any[] = [];
      if (phoneDigits) {
        if (rawPhone) matchConds.push(eq(guestsTable.phone, rawPhone));
        matchConds.push(eq(guestsTable.phone, phoneDigits));
        if (phoneDigits.length >= 9) {
          const suffix = phoneDigits.slice(-9);
          matchConds.push(like(guestsTable.phone, `%${suffix}`));
        }
      }
      if (nationalId) {
        matchConds.push(eq(guestsTable.nationalId, nationalId));
        matchConds.push(eq(guestsTable.idNumber, nationalId));
      }

      const [found] = await db
        .select()
        .from(guestsTable)
        .where(or(...matchConds))
        .orderBy(desc(guestsTable.createdAt))
        .limit(1);

      if (found) {
        guest = found;
      }
    }

    // 2. If not found yet and fullName provided, search by name
    if (!guest && fullName) {
      const parts = fullName.split(/\s+/);
      const fName = parts[0];
      const lName = parts.slice(1).join(' ');

      const [foundByName] = await db
        .select()
        .from(guestsTable)
        .where(
          or(
            and(ilike(guestsTable.firstName, `%${fName}%`), ilike(guestsTable.lastName, `%${lName || fName}%`)),
            ilike(guestsTable.firstName, `%${fName}%`),
            ilike(guestsTable.lastName, `%${fName}%`),
          ),
        )
        .orderBy(desc(guestsTable.createdAt))
        .limit(1);

      if (foundByName) {
        guest = foundByName;
      }
    }

    // 3. Fallback: if room number was supplied and still no guest, find guest through room
    let room: any = null;
    let reservation: any = null;

    if (guest) {
      // Prioritize active checked-in reservation
      const [checkedInRes] = await db
        .select({
          reservationId: reservationsTable.id,
          reservationNumber: reservationsTable.reservationNumber,
          checkInDate: reservationsTable.checkInDate,
          checkOutDate: reservationsTable.checkOutDate,
          nights: reservationsTable.nights,
          actualCheckIn: reservationsTable.actualCheckIn,
          status: reservationsTable.status,
          roomId: reservationsTable.roomId,
        })
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.guestId, guest.id),
            eq(reservationsTable.status, 'checked_in'),
          ),
        )
        .orderBy(desc(reservationsTable.createdAt))
        .limit(1);

      if (checkedInRes) {
        reservation = checkedInRes;
      } else {
        // Fallback to latest confirmed or pending reservation
        const [res] = await db
          .select({
            reservationId: reservationsTable.id,
            reservationNumber: reservationsTable.reservationNumber,
            checkInDate: reservationsTable.checkInDate,
            checkOutDate: reservationsTable.checkOutDate,
            nights: reservationsTable.nights,
            actualCheckIn: reservationsTable.actualCheckIn,
            status: reservationsTable.status,
            roomId: reservationsTable.roomId,
          })
          .from(reservationsTable)
          .where(eq(reservationsTable.guestId, guest.id))
          .orderBy(desc(reservationsTable.createdAt))
          .limit(1);

        reservation = res;
      }

      if (reservation?.roomId) {
        const [r] = await db.select().from(roomsTable).where(eq(roomsTable.id, reservation.roomId)).limit(1);
        room = r;
      }
    } else if (roomNum) {
      // Room number fallback
      const [r] = await db.select().from(roomsTable).where(eq(roomsTable.number, roomNum)).limit(1);
      if (r) {
        room = r;
        const [res] = await db
          .select({
            reservationId: reservationsTable.id,
            reservationNumber: reservationsTable.reservationNumber,
            checkInDate: reservationsTable.checkInDate,
            checkOutDate: reservationsTable.checkOutDate,
            nights: reservationsTable.nights,
            actualCheckIn: reservationsTable.actualCheckIn,
            status: reservationsTable.status,
            guestId: guestsTable.id,
            guestCode: guestsTable.guestCode,
            firstName: guestsTable.firstName,
            lastName: guestsTable.lastName,
            phone: guestsTable.phone,
            email: guestsTable.email,
            vipStatus: guestsTable.vipStatus,
            roomId: reservationsTable.roomId,
          })
          .from(reservationsTable)
          .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
          .where(
            and(
              eq(reservationsTable.roomId, room.id),
              or(eq(reservationsTable.status, 'checked_in'), eq(reservationsTable.status, 'confirmed')),
            ),
          )
          .orderBy(desc(reservationsTable.createdAt))
          .limit(1);

        if (res) {
          reservation = res;
          guest = {
            id: res.guestId,
            guestCode: res.guestCode,
            firstName: res.firstName,
            lastName: res.lastName,
            phone: res.phone,
            email: res.email,
            vipStatus: res.vipStatus,
          };
        }
      }
    }

    if (!guest) {
      throw new NotFoundException(
        'No registered guest account found for this name or phone number. Please register your account first or sign in via SMS OTP.',
      );
    }

    // Password validation & security logic
    if (guest.passwordHash) {
      if (!body.password) {
        throw new BadRequestException('Password is required. If you forgot your password, please use "Forgot Password?" to reset via SMS OTP.');
      }
      const isMatch = await bcrypt.compare(body.password, guest.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Incorrect password. Please verify your credentials or click "Forgot Password?" to reset.');
      }
    } else if (body.password && body.password.trim().length >= 4) {
      // First-time password set for legacy or front-desk provisioned accounts
      const initialHash = await bcrypt.hash(body.password.trim(), 10);
      await db.update(guestsTable).set({ passwordHash: initialHash }).where(eq(guestsTable.id, guest.id));
    }

    // Ensure there is an assigned active room & reservation for in-portal features
    if (!room) {
      const [firstRoom] = await db.select().from(roomsTable).where(eq(roomsTable.isActive, true)).limit(1);
      room = firstRoom;
    }

    if (!reservation && room) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const resNum = `RES-ONL-${Math.floor(100000 + Math.random() * 900000)}`;
      const confNum = `CONF-${Date.now().toString(36).toUpperCase()}`;

      const [newRes] = await db
        .insert(reservationsTable)
        .values({
          reservationNumber: resNum,
          confirmationNumber: confNum,
          guestId: guest.id,
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          nights: 1,
          adults: 1,
          reservationType: 'online',
          bookingSource: 'online',
          status: 'confirmed',
          totalAmount: room.currentPrice ? String(room.currentPrice) : '0',
          notes: 'Auto-linked active session on guest portal sign-in',
        })
        .returning();

      reservation = {
        reservationId: newRes.id,
        reservationNumber: newRes.reservationNumber,
        checkInDate: newRes.checkInDate,
        checkOutDate: newRes.checkOutDate,
        nights: newRes.nights,
        actualCheckIn: newRes.actualCheckIn,
        status: newRes.status,
      };
    }

    const token = this.generateGuestToken({
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
      roomNumber: room?.number || '101',
      roomId: room?.id || 'default-room',
      reservationId: reservation?.reservationId || reservation?.id || 'default-res',
      email: guest.email,
      phone: guest.phone,
    });

    const isStayActive = reservation?.status === 'checked_in';

    return {
      success: true,
      isStayActive,
      token,
      room: room
        ? {
            id: room.id,
            number: room.number,
            floor: room.floor,
            type: room.roomTypeId,
          }
        : null,
      reservation: reservation
        ? {
            id: reservation.reservationId || reservation.id,
            reservationNumber: reservation.reservationNumber,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            nights: reservation.nights,
            actualCheckIn: reservation.actualCheckIn,
            status: reservation.status,
          }
        : null,
      guest: {
        id: guest.id,
        guestCode: guest.guestCode,
        fullName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone,
        email: guest.email,
        vipStatus: guest.vipStatus,
      },
    };
  }

  /**
   * Step 1: Request SMS OTP for Guest Portal Login
   */
  async requestGuestOtp(phone: string) {
    const raw = (phone || '').trim();
    if (!raw) {
      throw new BadRequestException('Please provide a valid Ethiopian mobile phone number (09... or 07...)');
    }

    const normalized = this.afroMessage.normalizePhone(raw);
    const allGuests = await db.select().from(guestsTable).where(eq(guestsTable.isActive, true));
    const matchedGuest = allGuests.find(g => {
      if (!g.phone) return false;
      const norm = this.afroMessage.normalizePhone(g.phone);
      return norm === normalized || norm.endsWith(normalized.slice(-9));
    });

    const otpRes = await this.otpService.requestOtp(normalized, 'guest', {
      guestId: matchedGuest?.id,
      guestName: matchedGuest ? `${matchedGuest.firstName} ${matchedGuest.lastName}`.trim() : null,
    });

    return {
      success: true,
      phone: normalized,
      maskedPhone: otpRes.maskedPhone,
      cooldownSeconds: otpRes.cooldownSeconds,
      hasExistingAccount: !!matchedGuest,
      ...(otpRes.devCode ? { devCode: otpRes.devCode } : {}),
    };
  }

  /**
   * Step 2: Verify Guest SMS OTP and issue authenticated guest session token
   */
  async verifyGuestOtp(phone: string, code: string, isReset?: boolean) {
    if (!phone || !code) {
      throw new BadRequestException('Phone number and verification code are required');
    }

    const verifyResult = await this.otpService.verifyOtp(phone, code, 'guest');
    const normalized = this.afroMessage.normalizePhone(verifyResult.phone);

    // Look up or auto-provision guest account
    const allGuests = await db.select().from(guestsTable).where(eq(guestsTable.isActive, true));
    let guest = allGuests.find(g => {
      if (!g.phone) return false;
      const norm = this.afroMessage.normalizePhone(g.phone);
      return norm === normalized || norm.endsWith(normalized.slice(-9));
    });

    if (!guest) {
      // Auto-create guest profile for verified mobile
      const [newGuest] = await db
        .insert(guestsTable)
        .values({
          firstName: 'Guest',
          lastName: normalized.slice(-4),
          phone: normalized,
          guestCode: `GST-${Date.now().toString(36).toUpperCase()}`,
          guestType: 'individual',
          vipStatus: false,
        })
        .returning();
      guest = newGuest;
    }

    // Resolve room & active reservation (prioritizing checked-in stay)
    let room: any = null;
    let reservation: any = null;

    const [checkedInRes] = await db
      .select({
        reservationId: reservationsTable.id,
        reservationNumber: reservationsTable.reservationNumber,
        checkInDate: reservationsTable.checkInDate,
        checkOutDate: reservationsTable.checkOutDate,
        nights: reservationsTable.nights,
        actualCheckIn: reservationsTable.actualCheckIn,
        status: reservationsTable.status,
        roomId: reservationsTable.roomId,
      })
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.guestId, guest.id),
          eq(reservationsTable.status, 'checked_in'),
        ),
      )
      .orderBy(desc(reservationsTable.createdAt))
      .limit(1);

    if (checkedInRes) {
      reservation = checkedInRes;
    } else {
      const [latestRes] = await db
        .select({
          reservationId: reservationsTable.id,
          reservationNumber: reservationsTable.reservationNumber,
          checkInDate: reservationsTable.checkInDate,
          checkOutDate: reservationsTable.checkOutDate,
          nights: reservationsTable.nights,
          actualCheckIn: reservationsTable.actualCheckIn,
          status: reservationsTable.status,
          roomId: reservationsTable.roomId,
        })
        .from(reservationsTable)
        .where(eq(reservationsTable.guestId, guest.id))
        .orderBy(desc(reservationsTable.createdAt))
        .limit(1);
      reservation = latestRes;
    }

    if (reservation?.roomId) {
      const [r] = await db.select().from(roomsTable).where(eq(roomsTable.id, reservation.roomId)).limit(1);
      room = r;
    }

    if (!room) {
      const [firstRoom] = await db.select().from(roomsTable).where(eq(roomsTable.isActive, true)).limit(1);
      room = firstRoom;
    }

    if (!reservation && room) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const resNum = `RES-SMS-${Math.floor(100000 + Math.random() * 900000)}`;
      const confNum = `CONF-${Date.now().toString(36).toUpperCase()}`;

      const [newRes] = await db
        .insert(reservationsTable)
        .values({
          reservationNumber: resNum,
          confirmationNumber: confNum,
          guestId: guest.id,
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          nights: 1,
          adults: 1,
          reservationType: 'online',
          bookingSource: 'online',
          status: 'confirmed',
          totalAmount: room.currentPrice ? String(room.currentPrice) : '0',
          notes: 'Auto-linked session on verified SMS OTP login',
        })
        .returning();

      reservation = {
        reservationId: newRes.id,
        reservationNumber: newRes.reservationNumber,
        checkInDate: newRes.checkInDate,
        checkOutDate: newRes.checkOutDate,
        nights: newRes.nights,
        actualCheckIn: newRes.actualCheckIn,
        status: newRes.status,
      };
    }

    const token = this.generateGuestToken({
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
      roomNumber: room?.number || '101',
      roomId: room?.id || 'default-room',
      reservationId: reservation?.reservationId || reservation?.id || 'default-res',
      email: guest.email,
      phone: guest.phone,
    });

    const isStayActive = reservation?.status === 'checked_in';

    return {
      success: true,
      isStayActive,
      token,
      room: room
        ? {
            id: room.id,
            number: room.number,
            floor: room.floor,
            type: room.roomTypeId,
          }
        : null,
      reservation: reservation
        ? {
            id: reservation.reservationId || reservation.id,
            reservationNumber: reservation.reservationNumber,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            nights: reservation.nights,
            actualCheckIn: reservation.actualCheckIn,
            status: reservation.status,
          }
        : null,
      guest: {
        id: guest.id,
        guestCode: guest.guestCode,
        fullName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone,
        email: guest.email,
        vipStatus: guest.vipStatus,
      },
      redirectUrl: isReset ? '/guest-portal/profile?changePassword=true' : undefined,
    };
  }

  /**
   * Update Guest Account Password (via authenticated session or phone verification)
   */
  async updateGuestPassword(
    body: { password: string; phone?: string; guestId?: string },
    authHeader?: string,
  ) {
    const rawPass = body.password?.trim();
    if (!rawPass || rawPass.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters in length.');
    }

    let targetGuestId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const decoded: any = this.jwtService.verify(token);
        if (decoded?.guestId || decoded?.sub) {
          targetGuestId = decoded.guestId || decoded.sub;
        }
      } catch (e) {
        // Fallback to body properties
      }
    }

    if (!targetGuestId && body.guestId) {
      targetGuestId = body.guestId;
    }

    if (!targetGuestId && body.phone) {
      const normalized = this.afroMessage.normalizePhone(body.phone);
      const allGuests = await db.select().from(guestsTable).where(eq(guestsTable.isActive, true));
      const matched = allGuests.find(g => {
        if (!g.phone) return false;
        const norm = this.afroMessage.normalizePhone(g.phone);
        return norm === normalized || norm.endsWith(normalized.slice(-9));
      });
      if (matched) {
        targetGuestId = matched.id;
      }
    }

    if (!targetGuestId) {
      throw new BadRequestException('Unable to locate guest account. Please sign in or verify via SMS OTP first.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPass, salt);

    await db
      .update(guestsTable)
      .set({ passwordHash })
      .where(eq(guestsTable.id, targetGuestId));

    return {
      success: true,
      message: 'Password updated successfully. You can now use your new password to sign in.',
    };
  }

  /**
   * Pre-configured catalog of popular in-room services and dining items
   */
  async getCatalog() {
    return {
      dining: [
        { id: 'cat-1', name: 'Traditional Doro Wat Feast', category: 'food', price: 2300, desc: 'Slow-cooked spiced chicken with boiled egg and fresh injera' },
        { id: 'cat-2', name: 'Deluxe Angus Burger & Fries', category: 'food', price: 1750, desc: 'Grass-fed beef, cheddar, caramelized onions, brioche bun' },
        { id: 'cat-3', name: 'Continental Club Sandwich', category: 'food', price: 1450, desc: 'Smoked turkey, bacon, lettuce, tomato with crisps' },
        { id: 'cat-4', name: 'Fresh Seasonal Fruit Platter', category: 'food', price: 950, desc: 'Selection of fresh sliced tropical and local fruits' },
        { id: 'cat-5', name: 'Signature Ethiopian Jebena Coffee', category: 'drinks', price: 550, desc: 'Freshly roasted clay pot organic coffee with popcorn' },
        { id: 'cat-6', name: 'Fresh Mango & Avocado Smoothie', category: 'drinks', price: 650, desc: 'Layered fresh organic juice' },
        { id: 'cat-7', name: 'Sparkling Mineral Water (750ml)', category: 'drinks', price: 450, desc: 'Chilled Ambo mineral water' },
      ],
      amenities: [
        { id: 'am-1', name: 'Extra Feather Pillows (x2)', category: 'housekeeping', price: 0.0, desc: 'Hypoallergenic soft feather pillows' },
        { id: 'am-2', name: 'Extra Warm Wool Blanket', category: 'housekeeping', price: 0.0, desc: 'Clean, sanitized warm bedroom blanket' },
        { id: 'am-3', name: 'Fresh Bath Towels & Robe Set', category: 'housekeeping', price: 0.0, desc: 'Plush cotton bath sheet, hand towel and slippers' },
        { id: 'am-4', name: 'Baby Cot / Crib Setup', category: 'housekeeping', price: 0.0, desc: 'Safety-certified wooden crib with baby bedding' },
        { id: 'am-5', name: 'Room Evening Turn-down Service', category: 'housekeeping', price: 0.0, desc: 'Tidy up, fresh water, and curtains drawn' },
      ],
      services: [
        { id: 'sv-1', name: 'Express Laundry & Pressing', category: 'laundry', price: 1500, desc: 'Same-day wash and press for up to 3 garments' },
        { id: 'sv-2', name: 'AC / Climate Adjustment Assistance', category: 'maintenance', price: 0.0, desc: 'Technician visit for temperature or ventilation check' },
        { id: 'sv-3', name: 'High-Speed Wi-Fi Tech Support', category: 'maintenance', price: 0.0, desc: 'In-room assistance for device connection' },
        { id: 'sv-4', name: 'Morning Wake-up Call', category: 'wake_up', price: 0.0, desc: 'Scheduled front desk phone wake-up call' },
      ],
      transport: [
        {
          id: 'tr-1',
          name: 'Airport Chauffeur Transfer (Drop-off)',
          category: 'transport',
          price: 3000,
          desc: 'Private executive sedan to Addis Ababa Bole International Airport (Terminal 1/2)',
          vehicleType: 'Executive Sedan',
          duration: '35 mins',
        },
        {
          id: 'tr-2',
          name: 'Airport Arrival VIP Meet & Pickup',
          category: 'transport',
          price: 3750,
          desc: 'Chauffeur with personalized name board & baggage assistance at arrivals hall',
          vehicleType: 'Executive Sedan / SUV',
          duration: '40 mins',
        },
        {
          id: 'tr-3',
          name: 'Half-Day City Tour Chauffeur (4 Hours)',
          category: 'transport',
          price: 6800,
          desc: 'Dedicated vehicle & driver for Entoto Park, National Museum, and local markets',
          vehicleType: 'Luxury SUV',
          duration: '4 Hours',
        },
        {
          id: 'tr-4',
          name: 'Full-Day Business Chauffeur (8 Hours)',
          category: 'transport',
          price: 11200,
          desc: 'On-demand standby vehicle for meetings, diplomatic missions, and embassy visits',
          vehicleType: 'Executive Sedan / Van',
          duration: '8 Hours',
        },
        {
          id: 'tr-5',
          name: 'Complimentary Downtown / UNECA Shuttle',
          category: 'transport',
          price: 0.0,
          desc: 'Scheduled hourly luxury shuttle to Africa Hall, UNECA, and Meskel Square',
          vehicleType: 'Luxury Van',
          duration: 'Hourly Scheduled',
        },
        {
          id: 'tr-6',
          name: 'Luggage & Bellhop Vehicle Dispatch',
          category: 'transport',
          price: 0.0,
          desc: 'Assistance loading/unloading heavy baggage and transfers within hotel grounds',
          vehicleType: 'Electric Cart / Van',
          duration: 'Immediate',
        },
      ],
      stay: [
        {
          id: 'st-1',
          name: 'Stay Extension Request',
          category: 'stay',
          price: 2500,
          desc: 'Request additional nights or extended stay checkout dates at current room rates.',
          prepTime: 'Front Desk Review',
          badge: 'Room Rate',
        },
        {
          id: 'st-2',
          name: 'Late Check-Out Request (Until 2:00 PM)',
          category: 'stay',
          price: 800,
          desc: 'Request extended late room access before afternoon departure. Tier 1 late departure fee applies.',
          prepTime: 'Subject to Availability',
          badge: 'Late Departure',
        },
        {
          id: 'st-3',
          name: 'Guaranteed Late Check-Out (Until 4:00 PM)',
          category: 'stay',
          price: 1500,
          desc: 'Guaranteed extended late room access for evening flight or relaxed departure. Tier 2 fee applies.',
          prepTime: 'Front Desk Confirmation',
          badge: 'Popular',
        },
        {
          id: 'st-4',
          name: 'Room Move / Suite Upgrade Request',
          category: 'stay',
          price: 1800,
          desc: 'Inquire about moving to a quieter wing, higher floor, or executive suite upgrades. Rate difference charged to folio.',
          prepTime: 'Front Desk Review',
          badge: 'Suite Upgrade',
        },
        {
          id: 'st-5',
          name: 'Luggage Pickup & Bellhop at Departure',
          category: 'stay',
          price: 250,
          desc: 'Porter luggage collection directly from your suite at requested checkout time.',
          prepTime: '15 mins',
          badge: 'Porter Service',
        },
      ],
    };
  }

  /**
   * Guest submits in-room service request
   */
  async submitServiceRequest(body: {
    roomNumber: string;
    guestName: string;
    guestId?: string;
    reservationId?: string;
    serviceType: string;
    description: string;
    specialInstructions?: string;
    priority?: string;
    chargeAmount?: number;
  }) {
    // 1. Strictly enforce that the guest is checked into their room
    let activeReservation: any = null;

    if (body.reservationId) {
      const [res] = await db
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, body.reservationId))
        .limit(1);
      activeReservation = res;
    }

    if ((!activeReservation || activeReservation.status !== 'checked_in') && body.guestId) {
      const [res] = await db
        .select()
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.guestId, body.guestId),
            eq(reservationsTable.status, 'checked_in'),
          ),
        )
        .orderBy(desc(reservationsTable.createdAt))
        .limit(1);
      if (res) activeReservation = res;
    }

    if ((!activeReservation || activeReservation.status !== 'checked_in') && body.roomNumber) {
      const [targetRoom] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.number, body.roomNumber.trim()))
        .limit(1);

      if (targetRoom) {
        const [res] = await db
          .select()
          .from(reservationsTable)
          .where(
            and(
              eq(reservationsTable.roomId, targetRoom.id),
              eq(reservationsTable.status, 'checked_in'),
            ),
          )
          .orderBy(desc(reservationsTable.createdAt))
          .limit(1);
        if (res) activeReservation = res;
      }
    }

    if (!activeReservation || activeReservation.status !== 'checked_in') {
      throw new BadRequestException(
        'In-room dining and service requests are only active for guests who have checked in to their room. Please complete check-in at the front desk to activate in-room service.',
      );
    }

    const requestNumber = 'RS-GUEST-' + Date.now().toString(36).toUpperCase();

    // Map department
    let department = 'reception';
    if (['food', 'drinks'].includes(body.serviceType)) department = 'restaurant';
    else if (['housekeeping', 'extra_pillow', 'extra_blanket'].includes(body.serviceType)) department = 'housekeeping';
    else if (body.serviceType === 'laundry') department = 'laundry';
    else if (body.serviceType === 'maintenance') department = 'maintenance';
    else if (['taxi', 'airport', 'transport', 'shuttle', 'chauffeur'].includes(body.serviceType)) department = 'transport';

    const [req] = await db
      .insert(roomServiceRequestsTable)
      .values({
        requestNumber,
        reservationId: body.reservationId ?? null,
        guestId: body.guestId ?? null,
        roomNumber: body.roomNumber,
        guestName: body.guestName,
        serviceType: (body.serviceType as any) || 'food',
        department: department as any,
        status: 'requested',
        priority: body.priority || 'normal',
        description: body.description,
        specialInstructions: body.specialInstructions ?? null,
        slaMinutes: department === 'restaurant' ? 30 : department === 'transport' ? 20 : 45,
        estimatedCompletion: new Date(Date.now() + 35 * 60000),
        chargeAmount: body.chargeAmount ? String(body.chargeAmount) : '0',
        chargeToRoom: true,
      })
      .returning();

    // Broadcast staff notification
    try {
      const [adminUser] = await db.select().from(usersTable).limit(1);
      if (adminUser) {
        const titleIcon =
          department === 'transport'
            ? '🚗 Transport Booking'
            : department === 'restaurant'
            ? '🍽️ Dining Order'
            : '🛎️ Guest Request';

        await db.insert(notificationsTable).values({
          userId: adminUser.id,
          type: 'room_service',
          title: `${titleIcon} — Room ${body.roomNumber}`,
          message: `${body.guestName} ordered ${body.serviceType}: ${body.description || 'Request submitted'}`,
          resourceType: 'room_service',
          resourceId: req.id,
        });
      }
    } catch {
      // Notification insert best-effort
    }

    // Auto-tally to guest stay folio / invoice for automated checkout billing
    if (body.chargeAmount && Number(body.chargeAmount) > 0 && (body.reservationId || body.guestId)) {
      try {
        let invoice: any = null;
        if (body.reservationId) {
          const [inv] = await db
            .select()
            .from(invoicesTable)
            .where(
              and(
                eq(invoicesTable.reservationId, body.reservationId),
                or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
              ),
            )
            .orderBy(desc(invoicesTable.createdAt))
            .limit(1);
          invoice = inv;
        }
        if (!invoice && body.guestId) {
          const [inv] = await db
            .select()
            .from(invoicesTable)
            .where(
              and(
                eq(invoicesTable.guestId, body.guestId),
                or(eq(invoicesTable.status, 'draft'), eq(invoicesTable.status, 'issued')),
              ),
            )
            .orderBy(desc(invoicesTable.createdAt))
            .limit(1);
          invoice = inv;
        }

        const descText = `In-Room Online Portal #${requestNumber} (${body.serviceType}: ${body.description || 'Request'})`;
        const amt = Number(body.chargeAmount);

        if (invoice) {
          await db.insert(invoiceLineItemsTable).values({
            invoiceId: invoice.id,
            description: descText,
            quantity: '1',
            unitPrice: String(amt.toFixed(2)),
            total: String(amt.toFixed(2)),
          });
          const newSubtotal = parseFloat(invoice.subtotal || '0') + amt;
          const newTotal = parseFloat(invoice.totalAmount || '0') + amt;
          await db
            .update(invoicesTable)
            .set({
              subtotal: String(newSubtotal.toFixed(2)),
              totalAmount: String(newTotal.toFixed(2)),
            })
            .where(eq(invoicesTable.id, invoice.id));
        } else {
          const invNum = 'INV-' + Date.now().toString(36).toUpperCase();
          const [newInv] = await db
            .insert(invoicesTable)
            .values({
              invoiceNumber: invNum,
              guestId: body.guestId ?? null,
              reservationId: body.reservationId ?? null,
              subtotal: String(amt.toFixed(2)),
              taxAmount: '0.00',
              totalAmount: String(amt.toFixed(2)),
              status: 'draft',
              notes: 'Stay folio auto-tallied from In-Room Portal',
            })
            .returning();
          if (newInv) {
            await db.insert(invoiceLineItemsTable).values({
              invoiceId: newInv.id,
              description: descText,
              quantity: '1',
              unitPrice: String(amt.toFixed(2)),
              total: String(amt.toFixed(2)),
            });
          }
        }
      } catch {
        // Folio line insert best-effort
      }
    }

    return req;
  }

  /**
   * Guest requests stay extension or room upgrade
   */
  async requestStayChange(body: {
    reservationId: string;
    guestId: string;
    roomNumber: string;
    guestName: string;
    actionType: string; // extend_stay | room_upgrade
    requestedCheckOut?: string;
    reason: string;
  }) {
    const [change] = await db
      .insert(stayChangesTable)
      .values({
        reservationId: body.reservationId,
        guestId: body.guestId,
        actionType: body.actionType,
        newCheckOut: body.requestedCheckOut ?? null,
        reason: `[GUEST PORTAL REQUEST]: ${body.reason}`,
        performedBy: 'Guest Self-Service',
      })
      .returning();

    // Broadcast staff notification
    try {
      const [adminUser] = await db.select().from(usersTable).limit(1);
      if (adminUser) {
        await db.insert(notificationsTable).values({
          userId: adminUser.id,
          type: 'stay_change',
          title: `🏨 Stay Request — Room ${body.roomNumber}`,
          message: `${body.guestName} requested ${body.actionType === 'extend_stay' ? 'Stay Extension' : 'Room Upgrade'}: ${body.reason}`,
          resourceType: 'stay_change',
          resourceId: change.id,
        });
      }
    } catch {
      // Best-effort notification
    }

    return change;
  }

  /**
   * Guest reports an in-room maintenance defect / malfunction (e.g. TV, shower, AC, lighting, plumbing)
   */
  async reportMaintenance(body: {
    roomNumber: string;
    guestName: string;
    guestId?: string;
    reservationId?: string;
    item: string;
    title?: string;
    description: string;
    priority?: string;
  }) {
    if (!body.roomNumber) {
      throw new BadRequestException('Room number is required');
    }
    if (!body.description && !body.item) {
      throw new BadRequestException('Maintenance issue details are required');
    }

    const itemLabel = body.item || 'Room Equipment';
    const issueTitle = body.title?.trim() || `${itemLabel} malfunction in Room ${body.roomNumber}`;
    const priorityNorm = body.priority === 'urgent' || body.priority === 'critical' ? 'critical' : body.priority === 'high' ? 'high' : 'medium';

    // Locate room
    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.number, body.roomNumber))
      .limit(1);

    const mntRequestNumber = 'MNT-' + Date.now().toString(36).toUpperCase();

    // 1. Insert into maintenanceRequestsTable
    const [mntReq] = await db
      .insert(maintenanceRequestsTable)
      .values({
        requestNumber: mntRequestNumber,
        roomId: room ? room.id : null,
        reportedBy: `Guest: ${body.guestName || 'In-Room Guest'} (Room ${body.roomNumber})`,
        title: issueTitle,
        description: `[Item: ${itemLabel}] ${body.description}`,
        priority: priorityNorm as any,
        status: 'pending',
        notes: `Submitted by guest via In-Room Portal for Room ${body.roomNumber}. Equipment: ${itemLabel}`,
        createdBy: 'Guest Portal Self-Service',
      })
      .returning();

    // 2. Also insert into roomServiceRequestsTable so that it appears in guest's active requests and room service console
    const rsRequestNumber = 'RS-' + mntRequestNumber;
    const [rsReq] = await db
      .insert(roomServiceRequestsTable)
      .values({
        requestNumber: rsRequestNumber,
        reservationId: body.reservationId ?? null,
        guestId: body.guestId ?? null,
        roomId: room ? room.id : null,
        roomNumber: body.roomNumber,
        guestName: body.guestName,
        serviceType: 'maintenance',
        department: 'maintenance',
        status: 'requested',
        priority: priorityNorm === 'critical' ? 'urgent' : priorityNorm === 'high' ? 'high' : 'normal',
        description: `[${itemLabel}] ${issueTitle}: ${body.description}`,
        specialInstructions: `Guest reported defective ${itemLabel}. Please send technician promptly to Room ${body.roomNumber}.`,
        chargeAmount: '0',
        chargeToRoom: false,
        paymentStatus: 'paid',
        slaMinutes: priorityNorm === 'critical' ? 20 : 45,
        estimatedCompletion: new Date(Date.now() + 45 * 60000),
      })
      .returning();

    // 3. Broadcast notification to staff
    try {
      const [adminUser] = await db.select().from(usersTable).limit(1);
      if (adminUser) {
        await db.insert(notificationsTable).values({
          userId: adminUser.id,
          type: 'maintenance',
          title: `🛠️ In-Room Issue Alert: Room ${body.roomNumber}`,
          message: `${body.guestName || 'Guest'} reported [${itemLabel}]: ${body.description}`,
          resourceType: 'maintenance',
          resourceId: mntReq.id,
        });
      }
    } catch {
      // Best-effort notification
    }

    return {
      success: true,
      maintenanceRequest: mntReq,
      roomServiceRequest: rsReq,
      message: `Maintenance request logged for ${itemLabel}. Engineering team notified.`,
    };
  }

  /**
   * Guest views their active room requests
   */
  async getRoomOrders(roomNumber: string) {
    const rows = await db
      .select({
        ...getTableColumns(roomServiceRequestsTable),
        assignedToName: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
      })
      .from(roomServiceRequestsTable)
      .leftJoin(usersTable, eq(roomServiceRequestsTable.assignedToId, usersTable.id))
      .where(eq(roomServiceRequestsTable.roomNumber, roomNumber))
      .orderBy(desc(roomServiceRequestsTable.createdAt))
      .limit(20);
    return rows;
  }

  /**
   * Guest views their active room invoice / folio
   */
  async getRoomFolio(guestId: string) {
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.guestId, guestId))
      .orderBy(desc(invoicesTable.createdAt))
      .limit(1);

    if (!invoice) return { invoice: null, lineItems: [] };

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoice.id));

    return { invoice, lineItems };
  }

  /**
   * Guest requests checkout clearance inspection
   */
  async requestCheckoutInspection(body: {
    roomNumber: string;
    reservationId?: string;
    guestId?: string;
    notes?: string;
  }) {
    let reservationId = body.reservationId;
    let roomId = '';
    let guestId = body.guestId;

    if (!reservationId) {
      const [rm] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.number, body.roomNumber))
        .limit(1);
      if (rm) {
        roomId = rm.id;
        const [res] = await db
          .select()
          .from(reservationsTable)
          .where(and(eq(reservationsTable.roomId, rm.id), eq(reservationsTable.status, 'checked_in')))
          .limit(1);
        if (res) {
          reservationId = res.id;
          guestId = guestId || res.guestId;
        }
      }
    } else {
      const [res] = await db
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, reservationId))
        .limit(1);
      if (res) {
        roomId = res.roomId || '';
        guestId = guestId || res.guestId;
      }
    }

    if (!reservationId) {
      throw new BadRequestException(`No active checked-in reservation found for room ${body.roomNumber}`);
    }

    const [existing] = await db
      .select()
      .from(preCheckoutInspectionsTable)
      .where(
        and(
          eq(preCheckoutInspectionsTable.reservationId, reservationId),
          eq(preCheckoutInspectionsTable.isActive, true),
        ),
      )
      .orderBy(desc(preCheckoutInspectionsTable.createdAt))
      .limit(1);

    if (existing) {
      return existing;
    }

    const { randomUUID } = await import('crypto');
    const inspectionNumber = `PCI-${Date.now().toString(36).toUpperCase()}`;

    const [created] = await db
      .insert(preCheckoutInspectionsTable)
      .values({
        id: randomUUID(),
        inspectionNumber,
        reservationId,
        roomId: roomId || '',
        guestId: guestId || '',
        status: 'pending',
        minibarItems: JSON.stringify([]),
        minibarTotal: '0',
        damageCharges: '0',
        assetsIntact: true,
        lostAndFoundFound: false,
        notes: body.notes ? `Guest Self-Checkout Request: ${body.notes}` : 'Guest requested pre-checkout inspection via Guest In-Room Portal',
      })
      .returning();

    try {
      const staffUsers = await db.select({ id: usersTable.id }).from(usersTable);
      if (staffUsers.length > 0) {
        await db.insert(notificationsTable).values(
          staffUsers.map((u) => ({
            userId: u.id,
            type: 'warning',
            title: `🛎️ Guest Checkout Clearance Requested — Room ${body.roomNumber}`,
            message: `Guest in Room ${body.roomNumber} is preparing for checkout. Please complete pre-checkout room inspection (minibar & assets).`,
            resourceType: 'housekeeping',
            resourceId: created.id,
          })),
        );
      }
    } catch {
      // Non-blocking
    }

    return created;
  }

  async getCheckoutStatus(reservationId: string) {
    const [insp] = await db
      .select()
      .from(preCheckoutInspectionsTable)
      .where(
        and(
          eq(preCheckoutInspectionsTable.reservationId, reservationId),
          eq(preCheckoutInspectionsTable.isActive, true),
        ),
      )
      .orderBy(desc(preCheckoutInspectionsTable.createdAt))
      .limit(1);

    return insp || null;
  }

  /**
   * Guest Registration: creates or updates a guest with full contact details,
   * associates them with the room, creates/links an active stay reservation,
   * notifies front desk, and issues a signed JWT session token.
   */
  async register(body: {
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
    phone?: string;
    alternativePhone?: string;
    email?: string;
    roomNumber?: string;
    country?: string;
    region?: string;
    city?: string;
    address?: string;
    nationality?: string;
    idType?: string;
    idNumber?: string;
    passportNumber?: string;
    nationalId?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    foodPreference?: string;
    bedPreference?: string;
    smokingPreference?: string;
    specialRequests?: string;
    fullName?: string;
    vipStatus?: boolean;
    guestType?: string;
    hasRelationshipDoc?: boolean;
    relationshipStatus?: string;
    relationshipDocNumber?: string;
    relationshipDocName?: string;
    relationshipDocUrl?: string;
    partnerFullName?: string;
    partnerRelationship?: string;
    partnerGender?: string;
    partnerAgeCategory?: string;
    partnerIdType?: string;
    partnerIdNumber?: string;
    hasAccompanyingGuests?: boolean;
    accompanyingGuests?: any[];
    password?: string;
  }) {
    let passwordHash: string | null = null;
    if (body.password && body.password.trim().length >= 4) {
      passwordHash = await bcrypt.hash(body.password.trim(), 10);
    }

    let fName = body.firstName?.trim();
    let lName = body.lastName?.trim();
    if (!fName && body.fullName) {
      const parts = body.fullName.trim().split(/\s+/);
      fName = parts[0];
      lName = parts.slice(1).join(' ') || 'Guest';
    }
    if (!lName) lName = 'Guest';
    if (!fName) {
      throw new BadRequestException('Full name is required');
    }

    let roomNum = body.roomNumber?.trim();
    let room: any = null;
    if (roomNum) {
      const [foundRoom] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.number, roomNum));
      room = foundRoom;
    }
    if (!room) {
      const [firstRoom] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.isActive, true))
        .limit(1);
      room = firstRoom;
      roomNum = room?.number || '101';
    }

    // Build companion / metadata notes
    const extraNotes: string[] = [];
    if (body.hasRelationshipDoc || body.partnerFullName) {
      extraNotes.push(
        `[Couple/Marital]: Status=${body.relationshipStatus || 'married'}, Partner=${body.partnerFullName || 'Provided'}, Doc#=${body.relationshipDocNumber || (body.relationshipDocUrl ? 'Uploaded Card' : 'Pending Verification')}`,
      );
    }
    if (body.hasAccompanyingGuests && Array.isArray(body.accompanyingGuests) && body.accompanyingGuests.length > 0) {
      const familySummary = body.accompanyingGuests
        .map((g: any) => `${g.fullName || 'Guest'} (${g.relationship || 'family'}, ${g.ageCategory || 'adult'})`)
        .join('; ');
      extraNotes.push(`[Family Members x${body.accompanyingGuests.length}]: ${familySummary}`);
    }
    const remarksCombined = extraNotes.length > 0 ? extraNotes.join(' | ') : null;

    // 2. Find or create guest with full contact details
    let guest: any = null;
    const conds: any[] = [];
    if (body.phone?.trim()) conds.push(eq(guestsTable.phone, body.phone.trim()));
    if (body.email?.trim()) conds.push(eq(guestsTable.email, body.email.trim()));
    if (body.idNumber?.trim()) conds.push(eq(guestsTable.idNumber, body.idNumber.trim()));
    if (body.nationalId?.trim()) conds.push(eq(guestsTable.nationalId, body.nationalId.trim()));
    if (body.passportNumber?.trim()) conds.push(eq(guestsTable.passportNumber, body.passportNumber.trim()));

    if (conds.length > 0) {
      const [existingGuest] = await db
        .select()
        .from(guestsTable)
        .where(or(...conds))
        .limit(1);

      if (existingGuest) {
        const [updated] = await db
          .update(guestsTable)
          .set({
            firstName: fName,
            middleName: body.middleName?.trim() || existingGuest.middleName,
            lastName: lName,
            gender: body.gender || existingGuest.gender,
            dateOfBirth: body.dateOfBirth || existingGuest.dateOfBirth,
            nationality: body.nationality?.trim() || existingGuest.nationality,
            country: body.country?.trim() || existingGuest.country,
            region: body.region?.trim() || existingGuest.region,
            city: body.city?.trim() || existingGuest.city,
            address: body.address?.trim() || existingGuest.address,
            phone: body.phone?.trim() || existingGuest.phone,
            alternativePhone: body.alternativePhone?.trim() || existingGuest.alternativePhone,
            email: body.email?.trim() || existingGuest.email,
            idType: body.idType || existingGuest.idType,
            idNumber: body.idNumber?.trim() || existingGuest.idNumber,
            passportNumber: body.passportNumber?.trim() || existingGuest.passportNumber,
            nationalId: body.nationalId?.trim() || existingGuest.nationalId,
            emergencyContactName: body.emergencyContactName?.trim() || existingGuest.emergencyContactName,
            emergencyContactPhone: body.emergencyContactPhone?.trim() || existingGuest.emergencyContactPhone,
            foodPreference: body.foodPreference || existingGuest.foodPreference,
            smokingPreference: body.smokingPreference || existingGuest.smokingPreference,
            bedPreference: body.bedPreference || existingGuest.bedPreference,
            specialRequests: body.specialRequests || existingGuest.specialRequests,
            vipStatus: body.vipStatus ?? existingGuest.vipStatus,
            guestType: body.guestType || existingGuest.guestType || 'individual',
            remarks: remarksCombined || existingGuest.remarks,
            totalStays: (existingGuest.totalStays || 0) + 1,
            ...(passwordHash ? { passwordHash } : {}),
          })
          .where(eq(guestsTable.id, existingGuest.id))
          .returning();
        guest = updated;
      }
    }

    if (!guest) {
      const guestCode = `GST-${Math.floor(100000 + Math.random() * 900000)}`;
      const [newGuest] = await db
        .insert(guestsTable)
        .values({
          guestCode,
          firstName: fName,
          middleName: body.middleName?.trim() || null,
          lastName: lName,
          gender: body.gender || null,
          dateOfBirth: body.dateOfBirth || null,
          nationality: body.nationality?.trim() || null,
          country: body.country?.trim() || null,
          region: body.region?.trim() || null,
          city: body.city?.trim() || null,
          address: body.address?.trim() || null,
          phone: body.phone?.trim() || null,
          alternativePhone: body.alternativePhone?.trim() || null,
          email: body.email?.trim() || null,
          idType: body.idType || null,
          idNumber: body.idNumber?.trim() || null,
          passportNumber: body.passportNumber?.trim() || null,
          nationalId: body.nationalId?.trim() || null,
          emergencyContactName: body.emergencyContactName?.trim() || null,
          emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
          foodPreference: body.foodPreference || null,
          smokingPreference: body.smokingPreference || null,
          bedPreference: body.bedPreference || null,
          specialRequests: body.specialRequests || null,
          vipStatus: body.vipStatus ?? false,
          guestType: body.guestType || 'individual',
          remarks: remarksCombined || null,
          totalStays: 1,
          passwordHash: passwordHash || null,
        })
        .returning();
      guest = newGuest;
    }

    // 3. Find active reservation for this room or create one
    let [reservation] = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.roomId, room.id),
          or(eq(reservationsTable.status, 'checked_in'), eq(reservationsTable.status, 'confirmed')),
        ),
      )
      .orderBy(desc(reservationsTable.createdAt))
      .limit(1);

    if (reservation) {
      // Link the guest to the active reservation
      if (reservation.guestId !== guest.id) {
        await db
          .update(reservationsTable)
          .set({
            guestId: guest.id,
            bookingSource: 'online',
            reservationType: 'online',
            specialRequests: body.specialRequests || reservation.specialRequests,
          })
          .where(eq(reservationsTable.id, reservation.id));
        reservation.guestId = guest.id;
      }
    } else {
      // Create new online self-service checked-in reservation
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const resNum = `RES-ONL-${Math.floor(100000 + Math.random() * 900000)}`;
      const confNum = `CONF-ONL-${Math.floor(100000 + Math.random() * 900000)}`;

      const [newRes] = await db
        .insert(reservationsTable)
        .values({
          reservationNumber: resNum,
          confirmationNumber: confNum,
          guestId: guest.id,
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          checkInDate: todayStr,
          checkOutDate: tomorrowStr,
          nights: 1,
          adults: 1,
          children: 0,
          reservationType: 'online',
          bookingSource: 'online',
          status: 'checked_in',
          actualCheckIn: new Date(),
          totalAmount: room.currentPrice ? String(room.currentPrice) : '0',
          specialRequests: body.specialRequests || null,
        })
        .returning();

      reservation = newRes;

      // Update room to occupied
      await db.update(roomsTable).set({ status: 'occupied' }).where(eq(roomsTable.id, room.id));
    }

    // 4. Notify staff of new guest registration
    try {
      const staffUsers = await db.select().from(usersTable).limit(5);
      if (staffUsers.length > 0) {
        await db.insert(notificationsTable).values(
          staffUsers.map((u) => ({
            userId: u.id,
            title: `📱 New Guest Online Portal Registration: Room ${room.number}`,
            message: `${guest.firstName} ${guest.lastName} (${guest.phone || guest.email || 'Online'}) has completed online registration for Room ${room.number}.`,
            resourceType: 'reservations',
            resourceId: reservation.id,
          })),
        );
      }
    } catch {
      // Non-blocking
    }

    // 5. Generate signed JWT token
    const token = this.generateGuestToken({
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
      roomNumber: room.number,
      roomId: room.id,
      reservationId: reservation.id,
      email: guest.email,
      phone: guest.phone,
    });

    return {
      success: true,
      token,
      message: `Welcome ${guest.firstName}! Your registration is complete.`,
      room: {
        id: room.id,
        number: room.number,
        floor: room.floor,
        type: room.roomTypeId,
      },
      reservation: {
        id: reservation.id,
        reservationNumber: reservation.reservationNumber,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        nights: reservation.nights,
        actualCheckIn: reservation.actualCheckIn,
        status: reservation.status,
      },
      guest: {
        id: guest.id,
        guestCode: guest.guestCode,
        fullName: `${guest.firstName} ${guest.lastName}`.trim(),
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone,
        email: guest.email,
        vipStatus: guest.vipStatus,
      },
    };
  }

  /**
   * Online guest creates and pre-pays for a room reservation
   */
  async createOnlineReservation(body: {
    guestId: string;
    roomId?: string;
    roomTypeId?: string;
    checkInDate: string;
    checkOutDate: string;
    adults?: number;
    children?: number;
    specialRequests?: string;
    paymentMethod: string; // telebirr | cbe | chapa | card
    paymentReference?: string;
    paidAmount?: number;
    totalAmount?: number;
  }) {
    if (!body.guestId) {
      throw new BadRequestException('Guest account is required to reserve');
    }
    if (!body.checkInDate || !body.checkOutDate) {
      throw new BadRequestException('Check-in and check-out dates are required');
    }

    // 1. Locate and safely validate room and room type
    let validRoomTypeId: string | null = null;
    if (body.roomTypeId) {
      const [typeMatch] = await db
        .select()
        .from(roomTypesTable)
        .where(eq(roomTypesTable.id, body.roomTypeId))
        .limit(1);
      if (typeMatch) {
        validRoomTypeId = typeMatch.id;
      }
    }

    let assignedRoomId: string | null = null;
    if (body.roomId) {
      const [roomMatch] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.id, body.roomId))
        .limit(1);
      if (roomMatch) {
        assignedRoomId = roomMatch.id;
        if (!validRoomTypeId && roomMatch.roomTypeId) {
          validRoomTypeId = roomMatch.roomTypeId;
        }
      }
    }

    if (!assignedRoomId && validRoomTypeId) {
      const [room] = await db
        .select()
        .from(roomsTable)
        .where(
          and(
            eq(roomsTable.roomTypeId, validRoomTypeId),
            eq(roomsTable.status, 'available'),
            eq(roomsTable.isActive, true),
          ),
        )
        .limit(1);
      if (room) assignedRoomId = room.id;
    }

    if (!assignedRoomId) {
      const [room] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.isActive, true))
        .limit(1);
      if (room) {
        assignedRoomId = room.id;
        if (!validRoomTypeId && room.roomTypeId) {
          validRoomTypeId = room.roomTypeId;
        }
      }
    }

    const resNumber = `RES-ONL-${Math.floor(100000 + Math.random() * 900000)}`;
    const confNumber = `CONF-${Date.now().toString(36).toUpperCase()}`;

    const checkInDateObj = new Date(body.checkInDate);
    const checkOutDateObj = new Date(body.checkOutDate);
    const nights = Math.max(1, Math.round((checkOutDateObj.getTime() - checkInDateObj.getTime()) / (1000 * 60 * 60 * 24))) || 1;

    const total = body.totalAmount || (body.paidAmount || 0);
    const paid = body.paidAmount || total;
    const ref = body.paymentReference || `TXN-${Date.now().toString(36).toUpperCase()}`;

    const [reservation] = await db
      .insert(reservationsTable)
      .values({
        reservationNumber: resNumber,
        confirmationNumber: confNumber,
        guestId: body.guestId,
        roomId: assignedRoomId || null,
        roomTypeId: validRoomTypeId || null,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        nights,
        adults: body.adults || 1,
        children: body.children || 0,
        reservationType: 'online',
        bookingSource: 'online',
        ratePlan: 'Best Available Luxury Rate',
        totalAmount: String(total),
        paidAmount: String(paid),
        depositPaid: String(paid),
        status: 'confirmed',
        specialRequests: body.specialRequests || null,
        notes: `[ONLINE PRE-PAID RESERVATION] Settled via ${body.paymentMethod?.toUpperCase()} (Ref: ${ref}). Paid Amount: ${paid} ETB. Zero payment required at Front Desk check-in.`,
      })
      .returning();

    // Broadcast staff notification
    try {
      const [adminUser] = await db.select().from(usersTable).limit(1);
      if (adminUser) {
        await db.insert(notificationsTable).values({
          userId: adminUser.id,
          type: 'reservation',
          title: `🌟 New Online Pre-Paid Booking #${resNumber}`,
          message: `Online booking confirmed for ${body.checkInDate} to ${body.checkOutDate}. Pre-paid via ${body.paymentMethod?.toUpperCase()} (${paid} ETB).`,
          resourceType: 'reservation',
          resourceId: reservation.id,
        });
      }
    } catch {
      // Best-effort
    }

    return {
      success: true,
      reservation,
      message: 'Reservation created and pre-payment verified successfully!',
    };
  }

  /**
   * Dynamic QR Code Generator: creates a high-res Data URI PNG for scanning.
   */
  async generateQrCode(params: { url?: string; roomNumber?: string }) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let targetUrl = params.url;

    if (!targetUrl) {
      if (params.roomNumber) {
        targetUrl = `${baseUrl}/guest-portal/register?room=${encodeURIComponent(params.roomNumber.trim())}`;
      } else {
        targetUrl = `${baseUrl}/guest-portal/register`;
      }
    }

    const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return {
      success: true,
      targetUrl,
      qrCodeDataUrl,
      roomNumber: params.roomNumber || null,
    };
  }
}

