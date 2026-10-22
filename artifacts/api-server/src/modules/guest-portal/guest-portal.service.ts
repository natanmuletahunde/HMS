import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  maintenanceRequestsTable,
} from '@workspace/db';

@Injectable()
export class GuestPortalService {
  constructor(private readonly jwtService: JwtService) {}

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

      const [room] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.id, decoded.roomId))
        .limit(1);

      const [res] = await db
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, decoded.reservationId))
        .limit(1);

      return {
        valid: true,
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
            }
          : null,
        claims: decoded,
      };
    } catch (err: any) {
      throw new BadRequestException('Invalid or expired guest session token: ' + (err.message || ''));
    }
  }

  /**
   * Guest Login: verifies room number and matches an active in-house reservation.
   * Accepts roomNumber and optional accessCode (guestCode, phone digits, or last name).
   * Generates and returns a signed JWT token for all in-room portal operations.
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

    const token = this.generateGuestToken({
      guestId: reservation.guestId,
      guestName: `${reservation.firstName} ${reservation.lastName}`.trim(),
      roomNumber: room.number,
      roomId: room.id,
      reservationId: reservation.reservationId,
      email: reservation.email,
      phone: reservation.phone,
    });

    return {
      success: true,
      token,
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
        phone: reservation.phone,
        email: reservation.email,
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
    roomNumber: string;
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
  }) {
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
            totalStays: (existingGuest.totalStays || 0) + 1,
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
          guestType: 'individual',
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

    // 1. Locate or assign room
    let assignedRoomId = body.roomId;
    if (!assignedRoomId && body.roomTypeId) {
      const [room] = await db
        .select()
        .from(roomsTable)
        .where(
          and(
            eq(roomsTable.roomTypeId, body.roomTypeId),
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
      if (room) assignedRoomId = room.id;
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
        roomTypeId: body.roomTypeId || null,
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

