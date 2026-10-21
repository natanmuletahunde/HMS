import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import {
  db,
  roomsTable,
  reservationsTable,
  guestsTable,
  roomServiceRequestsTable,
  stayChangesTable,
  notificationsTable,
  usersTable,
  invoicesTable,
  invoiceLineItemsTable,
  preCheckoutInspectionsTable,
} from '@workspace/db';

@Injectable()
export class GuestPortalService {
  /**
   * Guest Login: verifies room number and matches an active in-house reservation.
   * Accepts roomNumber and optional accessCode (guestCode, phone digits, or last name).
   */
  async login(body: { roomNumber: string; accessCode?: string }) {
    const roomNum = body.roomNumber?.trim();
    if (!roomNum) throw new BadRequestException('Room number is required');

    // Find the room
    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.number, roomNum));

    if (!room) {
      throw new NotFoundException(`Room ${roomNum} was not found in the hotel.`);
    }

    // Find active checked-in reservation for this room
    const [reservation] = await db
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

    if (!reservation) {
      throw new NotFoundException(
        `No active checked-in guest found for Room ${roomNum}. Please contact the front desk.`,
      );
    }

    // If an access code was provided, verify it
    if (body.accessCode && body.accessCode.trim() !== '') {
      const code = body.accessCode.trim().toLowerCase();
      const matchCode =
        reservation.guestCode?.toLowerCase() === code ||
        reservation.lastName?.toLowerCase() === code ||
        reservation.reservationNumber?.toLowerCase() === code ||
        (reservation.phone && reservation.phone.endsWith(code));

      if (!matchCode) {
        throw new BadRequestException('Access code, reservation #, or last name does not match guest on file.');
      }
    }

    return {
      success: true,
      room: {
        id: room.id,
        number: room.number,
        floor: room.floor,
        type: room.roomTypeId,
      },
      reservation: {
        id: reservation.reservationId,
        reservationNumber: reservation.reservationNumber,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
        nights: reservation.nights,
        actualCheckIn: reservation.actualCheckIn,
        status: reservation.status,
      },
      guest: {
        id: reservation.guestId,
        guestCode: reservation.guestCode,
        fullName: `${reservation.firstName} ${reservation.lastName}`.trim(),
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        vipStatus: reservation.vipStatus,
      },
    };
  }

  /**
   * Pre-configured catalog of popular in-room services and dining items
   */
  async getCatalog() {
    return {
      dining: [
        { id: 'cat-1', name: 'Traditional Doro Wat Feast', category: 'food', price: 18.5, desc: 'Slow-cooked spiced chicken with boiled egg and fresh injera' },
        { id: 'cat-2', name: 'Deluxe Angus Burger & Fries', category: 'food', price: 14.0, desc: 'Grass-fed beef, cheddar, caramelized onions, brioche bun' },
        { id: 'cat-3', name: 'Continental Club Sandwich', category: 'food', price: 11.5, desc: 'Smoked turkey, bacon, lettuce, tomato with crisps' },
        { id: 'cat-4', name: 'Fresh Seasonal Fruit Platter', category: 'food', price: 8.0, desc: 'Selection of fresh sliced tropical and local fruits' },
        { id: 'cat-5', name: 'Signature Ethiopian Jebena Coffee', category: 'drinks', price: 4.5, desc: 'Freshly roasted clay pot organic coffee with popcorn' },
        { id: 'cat-6', name: 'Fresh Mango & Avocado Smoothie', category: 'drinks', price: 5.5, desc: 'Layered fresh organic juice' },
        { id: 'cat-7', name: 'Sparkling Mineral Water (750ml)', category: 'drinks', price: 3.5, desc: 'Chilled Ambo mineral water' },
      ],
      amenities: [
        { id: 'am-1', name: 'Extra Feather Pillows (x2)', category: 'housekeeping', price: 0.0, desc: 'Hypoallergenic soft feather pillows' },
        { id: 'am-2', name: 'Extra Warm Wool Blanket', category: 'housekeeping', price: 0.0, desc: 'Clean, sanitized warm bedroom blanket' },
        { id: 'am-3', name: 'Fresh Bath Towels & Robe Set', category: 'housekeeping', price: 0.0, desc: 'Plush cotton bath sheet, hand towel and slippers' },
        { id: 'am-4', name: 'Baby Cot / Crib Setup', category: 'housekeeping', price: 0.0, desc: 'Safety-certified wooden crib with baby bedding' },
        { id: 'am-5', name: 'Room Evening Turn-down Service', category: 'housekeeping', price: 0.0, desc: 'Tidy up, fresh water, and curtains drawn' },
      ],
      services: [
        { id: 'sv-1', name: 'Express Laundry & Pressing', category: 'laundry', price: 12.0, desc: 'Same-day wash and press for up to 3 garments' },
        { id: 'sv-2', name: 'AC / Climate Adjustment Assistance', category: 'maintenance', price: 0.0, desc: 'Technician visit for temperature or ventilation check' },
        { id: 'sv-3', name: 'High-Speed Wi-Fi Tech Support', category: 'maintenance', price: 0.0, desc: 'In-room assistance for device connection' },
        { id: 'sv-4', name: 'Morning Wake-up Call', category: 'wake_up', price: 0.0, desc: 'Scheduled front desk phone wake-up call' },
      ],
      transport: [
        {
          id: 'tr-1',
          name: 'Airport Chauffeur Transfer (Drop-off)',
          category: 'transport',
          price: 25.0,
          desc: 'Private executive sedan to Addis Ababa Bole International Airport (Terminal 1/2)',
          vehicleType: 'Executive Sedan',
          duration: '35 mins',
        },
        {
          id: 'tr-2',
          name: 'Airport Arrival VIP Meet & Pickup',
          category: 'transport',
          price: 30.0,
          desc: 'Chauffeur with personalized name board & baggage assistance at arrivals hall',
          vehicleType: 'Executive Sedan / SUV',
          duration: '40 mins',
        },
        {
          id: 'tr-3',
          name: 'Half-Day City Tour Chauffeur (4 Hours)',
          category: 'transport',
          price: 55.0,
          desc: 'Dedicated vehicle & driver for Entoto Park, National Museum, and local markets',
          vehicleType: 'Luxury SUV',
          duration: '4 Hours',
        },
        {
          id: 'tr-4',
          name: 'Full-Day Business Chauffeur (8 Hours)',
          category: 'transport',
          price: 90.0,
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
   * Guest views their active room requests
   */
  async getRoomOrders(roomNumber: string) {
    return db
      .select()
      .from(roomServiceRequestsTable)
      .where(eq(roomServiceRequestsTable.roomNumber, roomNumber))
      .orderBy(desc(roomServiceRequestsTable.createdAt))
      .limit(20);
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
   * Guest Registration: creates or updates a guest, associates them with the room,
   * creates/links an active stay reservation, notifies front desk, and returns an active session.
   */
  async register(body: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    roomNumber: string;
    nationality?: string;
    idType?: string;
    idNumber?: string;
    foodPreference?: string;
    bedPreference?: string;
    smokingPreference?: string;
    specialRequests?: string;
  }) {
    const fName = body.firstName?.trim();
    const lName = body.lastName?.trim();
    const roomNum = body.roomNumber?.trim();

    if (!fName || !lName) {
      throw new BadRequestException('First name and last name are required');
    }
    if (!roomNum) {
      throw new BadRequestException('Room number is required for portal registration');
    }

    // 1. Locate the room
    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.number, roomNum));

    if (!room) {
      throw new NotFoundException(`Room ${roomNum} is not a valid room number in this hotel.`);
    }

    // 2. Find or create guest
    let guest: any = null;
    if (body.phone || body.email) {
      const conds: any[] = [];
      if (body.phone?.trim()) conds.push(eq(guestsTable.phone, body.phone.trim()));
      if (body.email?.trim()) conds.push(eq(guestsTable.email, body.email.trim()));

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
              lastName: lName,
              phone: body.phone?.trim() || existingGuest.phone,
              email: body.email?.trim() || existingGuest.email,
              nationality: body.nationality || existingGuest.nationality,
              idType: body.idType || existingGuest.idType,
              idNumber: body.idNumber || existingGuest.idNumber,
              foodPreference: body.foodPreference || existingGuest.foodPreference,
              smokingPreference: body.smokingPreference || existingGuest.smokingPreference,
              bedPreference: body.bedPreference || existingGuest.bedPreference,
              specialRequests: body.specialRequests || existingGuest.specialRequests,
              totalStays: (existingGuest.totalStays || 0) + 1,
            })
            .where(eq(guestsTable.id, existingGuest.id))
            .returning();
          guest = updated;
        }
      }
    }

    if (!guest) {
      const guestCode = `GST-${Math.floor(100000 + Math.random() * 900000)}`;
      const [newGuest] = await db
        .insert(guestsTable)
        .values({
          guestCode,
          firstName: fName,
          lastName: lName,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          nationality: body.nationality || null,
          idType: body.idType || null,
          idNumber: body.idNumber || null,
          foodPreference: body.foodPreference || null,
          smokingPreference: body.smokingPreference || null,
          bedPreference: body.bedPreference || null,
          specialRequests: body.specialRequests || null,
          totalStays: 1,
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
            specialRequests: body.specialRequests || reservation.specialRequests,
          })
          .where(eq(reservationsTable.id, reservation.id));
        reservation.guestId = guest.id;
      }
    } else {
      // Create new walk-in / self-service checked-in reservation
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const resNum = `RES-QR-${Math.floor(100000 + Math.random() * 900000)}`;
      const confNum = `CONF-QR-${Math.floor(100000 + Math.random() * 900000)}`;

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
          reservationType: 'walk_in',
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
            title: `📱 New Guest QR Registration: Room ${room.number}`,
            message: `${guest.firstName} ${guest.lastName} has registered via QR code for Room ${room.number}.`,
            resourceType: 'reservations',
            resourceId: reservation.id,
          })),
        );
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
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

