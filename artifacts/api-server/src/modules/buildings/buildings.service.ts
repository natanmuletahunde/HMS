import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, and, like, sql, inArray, getTableColumns } from 'drizzle-orm';
import {
  db,
  buildingsTable,
  branchesTable,
  hotelsTable,
  floorsTable,
  roomsTable,
  housekeepingAssignmentsTable,
  maintenanceRequestsTable,
  userBranchesTable,
  usersTable,
} from '@workspace/db';

const bldCols = getTableColumns(buildingsTable);
const fmt = (r: any) => ({ ...r, branchName: r.branchName ?? null, hotelName: r.hotelName ?? null, deletedAt: r.deletedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const base = () => db.select({ ...bldCols, branchName: branchesTable.branchName, hotelName: hotelsTable.hotelName }).from(buildingsTable).leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id)).leftJoin(hotelsTable, eq(branchesTable.hotelId, hotelsTable.id));

@Injectable()
export class BuildingsService {
  async findAll(q: any, allowedBranchIds?: string[] | null) {
    const { branchId, hotelId, search, status, isActive, includeInactive, page = 1, limit = 50 } = q;
    const l = Math.min(+limit, 200); const offset = (+page - 1) * l;
    const conds: any[] = [];
    
    if (isActive !== undefined) {
      conds.push(eq(buildingsTable.isActive, isActive === 'true' || isActive === true));
    } else if (status === 'active') {
      conds.push(eq(buildingsTable.isActive, true));
    } else if (status === 'inactive') {
      conds.push(eq(buildingsTable.isActive, false));
    } else if (status !== 'all' && includeInactive !== 'true') {
      // Default: show only active operational buildings
      conds.push(eq(buildingsTable.isActive, true));
    }
    
    if (branchId) {
      if (allowedBranchIds && !allowedBranchIds.includes(branchId)) {
        conds.push(sql`1=0`);
      } else {
        conds.push(eq(buildingsTable.branchId, branchId));
      }
    } else if (allowedBranchIds) {
      if (allowedBranchIds.length === 0) {
        conds.push(sql`1=0`);
      } else {
        conds.push(inArray(buildingsTable.branchId, allowedBranchIds));
      }
    }

    if (hotelId) conds.push(eq(branchesTable.hotelId, hotelId));
    if (search) conds.push(like(buildingsTable.buildingName, `%${search}%`));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(buildingsTable.buildingName),
      db.select({ count: sql<number>`count(*)::int` }).from(buildingsTable).leftJoin(branchesTable, eq(buildingsTable.branchId, branchesTable.id)).where(where),
    ]);
    return { data: rows.map(fmt), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }

  async findOne(id: string) {
    const [r] = await base().where(eq(buildingsTable.id, id));
    if (!r) throw new NotFoundException('Building not found');
    return fmt(r);
  }

  async create(b: any) {
    const [exist] = await db.select().from(buildingsTable).where(eq(buildingsTable.buildingCode, b.buildingCode));
    if (exist) throw new ConflictException('Building code already exists');
    const numFloors = Math.max(1, +(b.numberOfFloors || 1));
    const [row] = await db.insert(buildingsTable).values({ branchId: b.branchId, buildingName: b.buildingName, buildingCode: b.buildingCode, numberOfFloors: numFloors, description: b.description, createdBy: b.createdBy }).returning();
    const floorRows = [];
    for (let i = 1; i <= numFloors; i++) {
      floorRows.push({
        buildingId: row.id,
        floorName: `Floor ${i}`,
        floorNumber: i,
        description: `Level ${i} of ${b.buildingName}`,
        createdBy: b.createdBy,
      });
    }
    if (floorRows.length > 0) {
      await db.insert(floorsTable).values(floorRows).onConflictDoNothing();
    }
    const [r] = await base().where(eq(buildingsTable.id, row.id));
    return fmt(r);
  }

  async update(id: string, b: any) {
    const [existing] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));
    if (!existing) throw new NotFoundException('Building not found');

    const u: any = {};
    for (const k of ['buildingName', 'numberOfFloors', 'description']) {
      if (b[k] !== undefined) u[k] = b[k];
    }

    if (b.isActive !== undefined) {
      const newActive = Boolean(b.isActive);
      u.isActive = newActive;

      // If deactivating, ensure no rooms are currently occupied and no staff are stationed here
      if (!newActive && existing.isActive) {
        const [occupied] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(roomsTable)
          .where(and(eq(roomsTable.buildingId, id), eq(roomsTable.isActive, true), eq(roomsTable.status, 'occupied')));

        if (occupied && occupied.count > 0) {
          throw new BadRequestException(
            `Cannot deactivate building '${existing.buildingName}': ${occupied.count} room(s) are currently occupied by guests. Please check out or relocate guests first.`
          );
        }

        const [stationedStaff] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.buildingId, id), eq(usersTable.isActive, true)));

        if (stationedStaff && stationedStaff.count > 0) {
          throw new BadRequestException(
            `Cannot deactivate building '${existing.buildingName}': ${stationedStaff.count} active staff member(s) are assigned to this building. Please reassign them to another wing first.`
          );
        }

        // Cascade deactivation to associated floors and rooms
        await db.update(floorsTable).set({ isActive: false }).where(eq(floorsTable.buildingId, id));
        await db.update(roomsTable).set({ isActive: false }).where(eq(roomsTable.buildingId, id));
      } else if (newActive && !existing.isActive) {
        // Cascade reactivation to associated floors and rooms
        await db.update(floorsTable).set({ isActive: true }).where(eq(floorsTable.buildingId, id));
        await db.update(roomsTable).set({ isActive: true }).where(eq(roomsTable.buildingId, id));
      }
    }

    u.updatedBy = b.updatedBy;
    const [row] = await db.update(buildingsTable).set(u).where(eq(buildingsTable.id, id)).returning();
    if (!row) throw new NotFoundException('Building not found');
    const [r] = await base().where(eq(buildingsTable.id, id));
    return fmt(r);
  }

  async remove(id: string) {
    const [bld] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));
    if (!bld) throw new NotFoundException('Building not found');

    // 1. Check for active rooms in this building
    const [activeRooms] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(roomsTable)
      .where(and(eq(roomsTable.buildingId, id), eq(roomsTable.isActive, true)));

    if (activeRooms && activeRooms.count > 0) {
      // Check if any rooms are occupied
      const [occupied] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(roomsTable)
        .where(and(eq(roomsTable.buildingId, id), eq(roomsTable.isActive, true), eq(roomsTable.status, 'occupied')));

      if (occupied && occupied.count > 0) {
        throw new BadRequestException(
          `Cannot delete building '${bld.buildingName}': ${occupied.count} room(s) are currently occupied by guests.`
        );
      }

      throw new BadRequestException(
        `Cannot delete building '${bld.buildingName}': ${activeRooms.count} active room(s) exist in this building. Please reassign or remove the rooms first.`
      );
    }

    // 2. Check for active staff task assignments in this building (housekeeping & maintenance)
    const buildingRooms = await db
      .select({ id: roomsTable.id })
      .from(roomsTable)
      .where(eq(roomsTable.buildingId, id));

    const roomIds = buildingRooms.map((r) => r.id);
    if (roomIds.length > 0) {
      const [activeHousekeeping] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(housekeepingAssignmentsTable)
        .where(
          and(
            inArray(housekeepingAssignmentsTable.roomId, roomIds),
            inArray(housekeepingAssignmentsTable.status, ['pending', 'assigned', 'accepted', 'in_progress'])
          )
        );

      if (activeHousekeeping && activeHousekeeping.count > 0) {
        throw new BadRequestException(
          `Cannot delete building '${bld.buildingName}': There are ${activeHousekeeping.count} active housekeeping task(s) assigned to staff in this building.`
        );
      }

      const [activeMaintenance] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(maintenanceRequestsTable)
        .where(
          and(
            inArray(maintenanceRequestsTable.roomId, roomIds),
            inArray(maintenanceRequestsTable.status, ['pending', 'approved', 'assigned', 'in_progress'])
          )
        );

      if (activeMaintenance && activeMaintenance.count > 0) {
        throw new BadRequestException(
          `Cannot delete building '${bld.buildingName}': There are ${activeMaintenance.count} active maintenance task(s) assigned to staff in this building.`
        );
      }
    }

    // 3. Check for stationed staff
    const [stationedStaff] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(and(eq(usersTable.buildingId, id), eq(usersTable.isActive, true)));

    if (stationedStaff && stationedStaff.count > 0) {
      throw new BadRequestException(
        `Cannot delete building '${bld.buildingName}': ${stationedStaff.count} active staff member(s) are assigned to this building. Please reassign them to another wing first.`
      );
    }

    // 4. Soft-delete associated empty floors if any
    await db.update(floorsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(floorsTable.buildingId, id));

    // 5. Soft-delete building
    await db.update(buildingsTable).set({ isActive: false, deletedAt: new Date() }).where(eq(buildingsTable.id, id));
    return { message: 'Building deleted successfully' };
  }
}
