import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import { db, employeesTable, departmentsTable } from '@workspace/db';

const parseEmployee = (e: any) => ({
  ...e,
  salary: e.salary != null ? parseFloat(e.salary) : null,
});

@Injectable()
export class EmployeesService {
  async findAll(q: any) {
    const conds: any[] = [];
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(employeesTable.firstName, s), like(employeesTable.lastName, s), like(employeesTable.email, s)));
    }
    if (q.department) conds.push(eq(employeesTable.department, q.department));
    if (q.employmentType) conds.push(eq(employeesTable.employmentType, q.employmentType));
    if (q.isActive !== undefined) conds.push(eq(employeesTable.isActive, q.isActive === 'true' || q.isActive === true));

    const rows = await db
      .select({
        ...getTableColumns(employeesTable),
        departmentName: departmentsTable.name,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(employeesTable.firstName, employeesTable.lastName);

    return rows.map((r) => ({ ...parseEmployee(r), departmentName: r.departmentName ?? null }));
  }

  async create(b: any) {
    const employeeCode = 'EMP-' + Date.now().toString(36).toUpperCase();
    const [e] = await db
      .insert(employeesTable)
      .values({
        employeeCode,
        firstName: b.firstName,
        middleName: b.middleName ?? null,
        lastName: b.lastName,
        email: b.email,
        phone: b.phone ?? null,
        alternativePhone: b.alternativePhone ?? null,
        gender: b.gender ?? null,
        dateOfBirth: b.dateOfBirth ?? null,
        nationalId: b.nationalId ?? null,
        nationality: b.nationality ?? null,
        address: b.address ?? null,
        city: b.city ?? null,
        country: b.country ?? null,
        emergencyContactName: b.emergencyContactName ?? null,
        emergencyContactPhone: b.emergencyContactPhone ?? null,
        department: b.department,
        departmentId: b.departmentId ?? null,
        position: b.position,
        employmentType: b.employmentType ?? 'full_time',
        salaryGrade: b.salaryGrade ?? null,
        salary: b.salary != null ? String(b.salary) : null,
        supervisorId: b.supervisorId ?? null,
        userId: b.userId ?? null,
        hiredAt: b.hiredAt,
      })
      .returning();
    return parseEmployee(e);
  }

  async findOne(id: string) {
    const [row] = await db
      .select({
        ...getTableColumns(employeesTable),
        departmentName: departmentsTable.name,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(eq(employeesTable.id, id));
    if (!row) throw new NotFoundException(`Employee ${id} not found`);
    return { ...parseEmployee(row), departmentName: row.departmentName ?? null };
  }

  async update(id: string, b: any) {
    const u: any = {};
    const fields = ['firstName', 'middleName', 'lastName', 'email', 'phone', 'alternativePhone', 'gender', 'dateOfBirth',
      'nationalId', 'nationality', 'address', 'city', 'country', 'emergencyContactName', 'emergencyContactPhone',
      'department', 'departmentId', 'position', 'employmentType', 'salaryGrade', 'supervisorId', 'userId',
      'hiredAt', 'terminationDate', 'terminationReason', 'isActive', 'profilePhoto'];
    for (const k of fields) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.salary !== undefined) u.salary = String(b.salary);

    const [e] = await db.update(employeesTable).set(u).where(eq(employeesTable.id, id)).returning();
    if (!e) throw new NotFoundException(`Employee ${id} not found`);
    return parseEmployee(e);
  }

  async remove(id: string) {
    await db
      .update(employeesTable)
      .set({ isActive: false, deletedAt: new Date() })
      .where(eq(employeesTable.id, id));
    return { success: true };
  }

  async getStats() {
    const [total, byDept, byType] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where is_active = true)::int`,
        })
        .from(employeesTable),
      db
        .select({
          department: employeesTable.department,
          count: sql<number>`count(*)::int`,
        })
        .from(employeesTable)
        .where(eq(employeesTable.isActive, true))
        .groupBy(employeesTable.department),
      db
        .select({
          employmentType: employeesTable.employmentType,
          count: sql<number>`count(*)::int`,
        })
        .from(employeesTable)
        .where(eq(employeesTable.isActive, true))
        .groupBy(employeesTable.employmentType),
    ]);

    return {
      total: total[0]?.total ?? 0,
      active: total[0]?.active ?? 0,
      byDepartment: byDept,
      byEmploymentType: byType,
    };
  }
}
