import { Injectable } from '@nestjs/common';
import { sql, or } from 'drizzle-orm';
import {
  db,
  guestsTable,
  reservationsTable,
  roomsTable,
  inventoryItemsTable,
  suppliersTable,
  employeesTable,
  conferenceBookingsTable,
  vehiclesTable,
  complaintsTable,
  invoicesTable,
} from '@workspace/db';

@Injectable()
export class SearchService {
  async searchAll(q: string, limit = 20): Promise<any[]> {
    if (!q || q.length < 2) return [];

    const pattern = `%${q.toLowerCase()}%`;

    const [guests, reservations, rooms, inventory, suppliers, employees, complaints, vehicles] =
      await Promise.all([
        db
          .select({
            id: guestsTable.id,
            firstName: guestsTable.firstName,
            lastName: guestsTable.lastName,
            email: guestsTable.email,
            phone: guestsTable.phone,
          })
          .from(guestsTable)
          .where(
            sql`lower(first_name) like ${pattern} or lower(last_name) like ${pattern} or lower(coalesce(email,'')) like ${pattern}`,
          )
          .limit(limit),

        db
          .select({
            id: reservationsTable.id,
            reservationNumber: reservationsTable.reservationNumber,
            status: reservationsTable.status,
            guestId: reservationsTable.guestId,
          })
          .from(reservationsTable)
          .where(sql`lower(reservation_number) like ${pattern} or lower(coalesce(confirmation_number,'')) like ${pattern}`)
          .limit(limit),

        db
          .select({
            id: roomsTable.id,
            roomNumber: roomsTable.number,
            status: roomsTable.status,
          })
          .from(roomsTable)
          .where(sql`lower(number) like ${pattern}`)
          .limit(limit),

        db
          .select({
            id: inventoryItemsTable.id,
            name: inventoryItemsTable.name,
            category: inventoryItemsTable.category,
            status: inventoryItemsTable.status,
          })
          .from(inventoryItemsTable)
          .where(sql`lower(name) like ${pattern} or lower(coalesce(item_code,'')) like ${pattern}`)
          .limit(limit),

        db
          .select({
            id: suppliersTable.id,
            name: suppliersTable.companyName,
            email: suppliersTable.email,
          })
          .from(suppliersTable)
          .where(sql`lower(company_name) like ${pattern} or lower(coalesce(email,'')) like ${pattern}`)
          .limit(limit),

        db
          .select({
            id: employeesTable.id,
            firstName: employeesTable.firstName,
            lastName: employeesTable.lastName,
            employeeCode: employeesTable.employeeCode,
          })
          .from(employeesTable)
          .where(
            sql`lower(first_name) like ${pattern} or lower(last_name) like ${pattern} or lower(coalesce(employee_code,'')) like ${pattern}`,
          )
          .limit(limit),

        db
          .select({
            id: complaintsTable.id,
            complaintNumber: complaintsTable.complaintNumber,
            subject: complaintsTable.subject,
            status: complaintsTable.status,
          })
          .from(complaintsTable)
          .where(sql`lower(subject) like ${pattern} or lower(complaint_number) like ${pattern}`)
          .limit(limit),

        db
          .select({
            id: vehiclesTable.id,
            vehicleNumber: vehiclesTable.vehicleNumber,
            make: vehiclesTable.make,
            model: vehiclesTable.model,
          })
          .from(vehiclesTable)
          .where(sql`lower(vehicle_number) like ${pattern} or lower(coalesce(plate_number,'')) like ${pattern}`)
          .limit(limit),
      ]);

    const results: any[] = [
      ...guests.map((g) => ({
        type: 'guest',
        id: g.id,
        label: `${g.firstName} ${g.lastName}`,
        sublabel: g.email ?? g.phone ?? '',
      })),
      ...reservations.map((r) => ({
        type: 'reservation',
        id: r.id,
        label: r.reservationNumber,
        sublabel: r.status,
      })),
      ...rooms.map((r) => ({
        type: 'room',
        id: r.id,
        label: `Room ${r.roomNumber}`,
        sublabel: r.status,
      })),
      ...inventory.map((i) => ({
        type: 'inventory',
        id: i.id,
        label: i.name,
        sublabel: i.category,
      })),
      ...suppliers.map((s) => ({
        type: 'supplier',
        id: s.id,
        label: s.name,
        sublabel: s.email ?? '',
      })),
      ...employees.map((e) => ({
        type: 'employee',
        id: e.id,
        label: `${e.firstName} ${e.lastName}`,
        sublabel: e.employeeCode ?? '',
      })),
      ...complaints.map((c) => ({
        type: 'complaint',
        id: c.id,
        label: c.subject,
        sublabel: c.complaintNumber,
      })),
      ...vehicles.map((v) => ({
        type: 'vehicle',
        id: v.id,
        label: v.vehicleNumber,
        sublabel: `${v.make ?? ''} ${v.model ?? ''}`.trim(),
      })),
    ];

    return results.slice(0, limit);
  }
}
