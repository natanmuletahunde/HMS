import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  departmentsTable,
  attendanceRecordsTable,
  leaveRequestsTable,
  shiftsTable,
  shiftAssignmentsTable,
  performanceReviewsTable,
  employeesTable,
} from '@workspace/db';

@Injectable()
export class HrService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [empStats, deptStats, attStats, leaveStats, reviewStats] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where is_active = true)::int`,
        })
        .from(employeesTable),
      db.select({ count: sql<number>`count(*)::int` }).from(departmentsTable).where(eq(departmentsTable.isActive, true)),
      db
        .select({
          present: sql<number>`count(*) filter (where status = 'present')::int`,
          absent: sql<number>`count(*) filter (where status = 'absent')::int`,
        })
        .from(attendanceRecordsTable)
        .where(eq(attendanceRecordsTable.attendanceDate, today)),
      db
        .select({ pending: sql<number>`count(*) filter (where status = 'pending')::int` })
        .from(leaveRequestsTable),
      db
        .select({ upcoming: sql<number>`count(*)::int` })
        .from(performanceReviewsTable)
        .where(and(sql`review_date >= ${today}`, eq(performanceReviewsTable.status, 'draft'))),
    ]);

    // on leave today
    const onLeaveRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequestsTable)
      .where(
        and(
          eq(leaveRequestsTable.status, 'approved'),
          sql`start_date <= ${today}`,
          sql`end_date >= ${today}`,
        ),
      );

    return {
      totalEmployees: empStats[0]?.total ?? 0,
      activeEmployees: empStats[0]?.active ?? 0,
      onLeave: onLeaveRows[0]?.count ?? 0,
      todayPresent: attStats[0]?.present ?? 0,
      todayAbsent: attStats[0]?.absent ?? 0,
      totalDepartments: deptStats[0]?.count ?? 0,
      pendingLeaves: leaveStats[0]?.pending ?? 0,
      upcomingReviews: reviewStats[0]?.upcoming ?? 0,
    };
  }

  async getDepartments() {
    const rows = await db
      .select({
        ...getTableColumns(departmentsTable),
        employeeCount: sql<number>`(select count(*) from employees where department_id = departments.id and is_active = true)::int`,
      })
      .from(departmentsTable)
      .where(eq(departmentsTable.isActive, true))
      .orderBy(departmentsTable.name);
    return rows;
  }

  async createDepartment(b: any) {
    const [dept] = await db
      .insert(departmentsTable)
      .values({
        name: b.name,
        code: b.code ?? null,
        description: b.description ?? null,
        managerId: b.managerId ?? null,
      })
      .returning();
    return dept;
  }

  async updateDepartment(id: string, b: any) {
    const u: any = {};
    for (const k of ['name', 'code', 'description', 'managerId', 'isActive']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [dept] = await db.update(departmentsTable).set(u).where(eq(departmentsTable.id, id)).returning();
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async getAttendance(q: any) {
    const conds: any[] = [];
    if (q.employeeId) conds.push(eq(attendanceRecordsTable.employeeId, q.employeeId));
    if (q.date) conds.push(eq(attendanceRecordsTable.attendanceDate, q.date));
    if (q.status) conds.push(eq(attendanceRecordsTable.status, q.status));
    if (q.startDate) conds.push(sql`${attendanceRecordsTable.attendanceDate} >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`${attendanceRecordsTable.attendanceDate} <= ${q.endDate}`);

    const rows = await db
      .select({
        ...getTableColumns(attendanceRecordsTable),
        employeeFirstName: employeesTable.firstName,
        employeeLastName: employeesTable.lastName,
      })
      .from(attendanceRecordsTable)
      .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(attendanceRecordsTable.attendanceDate), attendanceRecordsTable.employeeId)
      .limit(500);

    return rows.map((r) => ({
      ...r,
      employeeName: r.employeeFirstName ? `${r.employeeFirstName} ${r.employeeLastName}` : null,
      workedHours: r.workedHours != null ? parseFloat(r.workedHours as string) : 0,
      overtimeHours: r.overtimeHours != null ? parseFloat(r.overtimeHours as string) : 0,
    }));
  }

  async clockIn(b: any) {
    const today = new Date().toISOString().slice(0, 10);

    // Check no open attendance for today
    const [existing] = await db
      .select()
      .from(attendanceRecordsTable)
      .where(
        and(
          eq(attendanceRecordsTable.employeeId, b.employeeId),
          eq(attendanceRecordsTable.attendanceDate, today),
        ),
      );
    if (existing) throw new BadRequestException('Employee already clocked in today');

    const [record] = await db
      .insert(attendanceRecordsTable)
      .values({
        employeeId: b.employeeId,
        attendanceDate: today,
        clockIn: new Date(),
        status: 'present',
        notes: b.notes ?? null,
      })
      .returning();
    return record;
  }

  async clockOut(id: string, b: any) {
    const [record] = await db.select().from(attendanceRecordsTable).where(eq(attendanceRecordsTable.id, id));
    if (!record) throw new NotFoundException(`Attendance record ${id} not found`);

    const clockOut = new Date();
    const clockIn = record.clockIn ? new Date(record.clockIn) : null;
    let workedHours = 0;
    let lateMinutes = 0;

    if (clockIn) {
      workedHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    }

    if (record.scheduledIn && clockIn) {
      const [sh, sm] = record.scheduledIn.split(':').map(Number);
      const scheduledInMs = new Date(clockIn).setHours(sh, sm, 0, 0);
      if (clockIn.getTime() > scheduledInMs) {
        lateMinutes = Math.floor((clockIn.getTime() - scheduledInMs) / 60000);
      }
    }

    const [updated] = await db
      .update(attendanceRecordsTable)
      .set({
        clockOut,
        workedHours: String(workedHours.toFixed(2)),
        lateMinutes,
        notes: b.notes ?? record.notes,
      })
      .where(eq(attendanceRecordsTable.id, id))
      .returning();
    return {
      ...updated,
      workedHours: parseFloat(updated.workedHours as string),
    };
  }

  async getLeaves(q: any) {
    const conds: any[] = [eq(leaveRequestsTable.isActive, true)];
    if (q.employeeId) conds.push(eq(leaveRequestsTable.employeeId, q.employeeId));
    if (q.status) conds.push(eq(leaveRequestsTable.status, q.status));
    if (q.leaveType) conds.push(eq(leaveRequestsTable.leaveType, q.leaveType));

    const rows = await db
      .select({
        ...getTableColumns(leaveRequestsTable),
        employeeFirstName: employeesTable.firstName,
        employeeLastName: employeesTable.lastName,
      })
      .from(leaveRequestsTable)
      .leftJoin(employeesTable, eq(leaveRequestsTable.employeeId, employeesTable.id))
      .where(and(...conds))
      .orderBy(desc(leaveRequestsTable.startDate));

    return rows.map((r) => ({
      ...r,
      employeeName: r.employeeFirstName ? `${r.employeeFirstName} ${r.employeeLastName}` : null,
    }));
  }

  async createLeave(b: any) {
    const leaveNumber = 'LV-' + Date.now().toString(36).toUpperCase();
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const [leave] = await db
      .insert(leaveRequestsTable)
      .values({
        leaveNumber,
        employeeId: b.employeeId,
        leaveType: b.leaveType,
        startDate: b.startDate,
        endDate: b.endDate,
        totalDays,
        reason: b.reason ?? null,
        handoverTo: b.handoverTo ?? null,
        status: 'pending',
      })
      .returning();
    return leave;
  }

  async updateLeave(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'approvedBy', 'rejectionReason']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'approved') {
      u.approvedAt = new Date();
      u.approvedBy = b.approvedBy ?? null;
    }
    const [leave] = await db.update(leaveRequestsTable).set(u).where(eq(leaveRequestsTable.id, id)).returning();
    if (!leave) throw new NotFoundException(`Leave request ${id} not found`);
    return leave;
  }

  async getShifts() {
    return db
      .select()
      .from(shiftsTable)
      .where(eq(shiftsTable.isActive, true))
      .orderBy(shiftsTable.name);
  }

  async createShift(b: any) {
    const [shift] = await db
      .insert(shiftsTable)
      .values({
        name: b.name,
        code: b.code ?? null,
        startTime: b.startTime,
        endTime: b.endTime,
        breakMinutes: b.breakMinutes ?? 30,
        isNightShift: b.isNightShift ?? false,
      })
      .returning();
    return shift;
  }

  async getShiftAssignments(q: any) {
    const conds: any[] = [eq(shiftAssignmentsTable.isActive, true)];
    if (q.employeeId) conds.push(eq(shiftAssignmentsTable.employeeId, q.employeeId));
    if (q.date) conds.push(eq(shiftAssignmentsTable.assignedDate, q.date));
    if (q.shiftId) conds.push(eq(shiftAssignmentsTable.shiftId, q.shiftId));

    const rows = await db
      .select({
        ...getTableColumns(shiftAssignmentsTable),
        employeeFirstName: employeesTable.firstName,
        employeeLastName: employeesTable.lastName,
        shiftName: shiftsTable.name,
        shiftStart: shiftsTable.startTime,
        shiftEnd: shiftsTable.endTime,
      })
      .from(shiftAssignmentsTable)
      .leftJoin(employeesTable, eq(shiftAssignmentsTable.employeeId, employeesTable.id))
      .leftJoin(shiftsTable, eq(shiftAssignmentsTable.shiftId, shiftsTable.id))
      .where(and(...conds));

    return rows.map((r) => ({
      ...r,
      employeeName: r.employeeFirstName ? `${r.employeeFirstName} ${r.employeeLastName}` : null,
    }));
  }

  async assignShift(b: any) {
    const [assignment] = await db
      .insert(shiftAssignmentsTable)
      .values({
        employeeId: b.employeeId,
        shiftId: b.shiftId,
        assignedDate: b.assignedDate,
        status: 'scheduled',
      })
      .returning();
    return assignment;
  }

  async getPerformanceReviews(q: any) {
    const conds: any[] = [eq(performanceReviewsTable.isActive, true)];
    if (q.employeeId) conds.push(eq(performanceReviewsTable.employeeId, q.employeeId));
    if (q.reviewPeriod) conds.push(eq(performanceReviewsTable.reviewPeriod, q.reviewPeriod));
    if (q.status) conds.push(eq(performanceReviewsTable.status, q.status));

    const rows = await db
      .select({
        ...getTableColumns(performanceReviewsTable),
        employeeFirstName: employeesTable.firstName,
        employeeLastName: employeesTable.lastName,
      })
      .from(performanceReviewsTable)
      .leftJoin(employeesTable, eq(performanceReviewsTable.employeeId, employeesTable.id))
      .where(and(...conds))
      .orderBy(desc(performanceReviewsTable.reviewDate));

    return rows.map((r) => ({
      ...r,
      employeeName: r.employeeFirstName ? `${r.employeeFirstName} ${r.employeeLastName}` : null,
    }));
  }

  async createPerformanceReview(b: any) {
    const [review] = await db
      .insert(performanceReviewsTable)
      .values({
        employeeId: b.employeeId,
        reviewerId: b.reviewerId ?? null,
        reviewPeriod: b.reviewPeriod,
        reviewDate: b.reviewDate,
        strengths: b.strengths ?? null,
        improvements: b.improvements ?? null,
        goals: b.goals ?? null,
        status: 'draft',
      })
      .returning();
    return review;
  }

  async updatePerformanceReview(id: string, b: any) {
    const u: any = {};
    for (const k of [
      'overallScore', 'attendanceScore', 'performanceScore', 'teamworkScore', 'initiativeScore',
      'strengths', 'improvements', 'goals', 'status', 'employeeComment',
    ]) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [review] = await db
      .update(performanceReviewsTable)
      .set(u)
      .where(eq(performanceReviewsTable.id, id))
      .returning();
    if (!review) throw new NotFoundException(`Performance review ${id} not found`);
    return review;
  }
}
