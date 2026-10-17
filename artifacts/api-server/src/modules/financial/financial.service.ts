import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  transactionsTable,
  cashRegistersTable,
  cashShiftsTable,
  creditNotesTable,
} from '@workspace/db';

const parseTxn = (t: any) => ({
  ...t,
  amount: t.amount != null ? parseFloat(t.amount) : 0,
  exchangeRate: t.exchangeRate != null ? parseFloat(t.exchangeRate) : 1,
  amountUsd: t.amountUsd != null ? parseFloat(t.amountUsd) : null,
});

@Injectable()
export class FinancialService {
  async getDashboard() {
    const today = new Date().toISOString().slice(0, 10);

    const [revenueRows, expenseRows, statusRows, shiftRows, categoryRows, recentRows] = await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)::int` })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.transactionType, 'revenue'), eq(transactionsTable.transactionDate, today), eq(transactionsTable.isActive, true))),
      db
        .select({ total: sql<string>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)::int` })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.transactionType, 'expense'), eq(transactionsTable.transactionDate, today), eq(transactionsTable.isActive, true))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.transactionDate, today), eq(transactionsTable.isActive, true))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(cashShiftsTable)
        .where(eq(cashShiftsTable.status, 'open')),
      db
        .select({
          category: transactionsTable.category,
          total: sql<string>`coalesce(sum(amount), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.transactionType, 'revenue'), eq(transactionsTable.transactionDate, today), eq(transactionsTable.isActive, true)))
        .groupBy(transactionsTable.category)
        .orderBy(sql`sum(amount) desc`)
        .limit(5),
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.isActive, true))
        .orderBy(desc(transactionsTable.createdAt))
        .limit(10),
    ]);

    const totalRevenue = parseFloat(revenueRows[0]?.total ?? '0');
    const totalExpenses = parseFloat(expenseRows[0]?.total ?? '0');
    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalTransactions: statusRows[0]?.count ?? 0,
      openShifts: shiftRows[0]?.count ?? 0,
      byCategory: categoryRows.map((c) => ({ ...c, total: parseFloat(c.total) })),
      recentTransactions: recentRows.map(parseTxn),
    };
  }

  async getTransactions(q: any) {
    const conds: any[] = [eq(transactionsTable.isActive, true)];
    if (q.type) conds.push(eq(transactionsTable.transactionType, q.type));
    if (q.category) conds.push(eq(transactionsTable.category, q.category));
    if (q.paymentMethod) conds.push(eq(transactionsTable.paymentMethod, q.paymentMethod));
    if (q.startDate) conds.push(sql`${transactionsTable.transactionDate} >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`${transactionsTable.transactionDate} <= ${q.endDate}`);
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(transactionsTable.description, s), like(transactionsTable.transactionNumber, s)));
    }

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(and(...conds))
      .orderBy(desc(transactionsTable.transactionDate), desc(transactionsTable.createdAt));

    return rows.map(parseTxn);
  }

  async createTransaction(b: any) {
    const transactionNumber = 'TXN-' + Date.now().toString(36).toUpperCase();
    const [txn] = await db
      .insert(transactionsTable)
      .values({
        transactionNumber,
        transactionType: b.transactionType,
        category: b.category,
        subcategory: b.subcategory ?? null,
        amount: String(b.amount),
        currency: b.currency ?? 'USD',
        paymentMethod: b.paymentMethod ?? null,
        referenceType: b.referenceType ?? null,
        referenceId: b.referenceId ?? null,
        referenceNumber: b.referenceNumber ?? null,
        description: b.description,
        cashRegisterId: b.cashRegisterId ?? null,
        processedBy: b.processedBy ?? null,
        transactionDate: b.transactionDate,
        notes: b.notes ?? null,
      })
      .returning();
    return parseTxn(txn);
  }

  async getCashRegisters() {
    return db
      .select()
      .from(cashRegistersTable)
      .where(eq(cashRegistersTable.isActive, true));
  }

  async createCashRegister(b: any) {
    const [reg] = await db
      .insert(cashRegistersTable)
      .values({
        name: b.name,
        location: b.location ?? null,
        currency: b.currency ?? 'USD',
        status: 'closed',
      })
      .returning();
    return reg;
  }

  async updateCashRegister(id: string, b: any) {
    const u: any = {};
    for (const k of ['name', 'location', 'currency', 'status', 'assignedTo', 'currentBalance']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.currentBalance !== undefined) u.currentBalance = String(b.currentBalance);
    const [reg] = await db.update(cashRegistersTable).set(u).where(eq(cashRegistersTable.id, id)).returning();
    if (!reg) throw new NotFoundException(`Cash register ${id} not found`);
    return reg;
  }

  async getCashShifts(q: any) {
    const conds: any[] = [eq(cashShiftsTable.isActive, true)];
    if (q.status) conds.push(eq(cashShiftsTable.status, q.status));
    if (q.registerId) conds.push(eq(cashShiftsTable.cashRegisterId, q.registerId));

    const rows = await db
      .select({
        ...getTableColumns(cashShiftsTable),
        registerName: cashRegistersTable.name,
      })
      .from(cashShiftsTable)
      .leftJoin(cashRegistersTable, eq(cashShiftsTable.cashRegisterId, cashRegistersTable.id))
      .where(and(...conds))
      .orderBy(desc(cashShiftsTable.openedAt));

    return rows.map((r) => ({
      ...r,
      openingBalance: parseFloat(r.openingBalance as string),
      closingBalance: r.closingBalance != null ? parseFloat(r.closingBalance as string) : null,
      expectedBalance: r.expectedBalance != null ? parseFloat(r.expectedBalance as string) : null,
      discrepancy: r.discrepancy != null ? parseFloat(r.discrepancy as string) : null,
    }));
  }

  async openShift(b: any) {
    const shiftNumber = 'SHF-' + Date.now().toString(36).toUpperCase();
    const [shift] = await db
      .insert(cashShiftsTable)
      .values({
        shiftNumber,
        cashRegisterId: b.cashRegisterId,
        cashierId: b.cashierId ?? null,
        openingBalance: String(b.openingBalance),
        status: 'open',
      })
      .returning();

    await db
      .update(cashRegistersTable)
      .set({ status: 'open', currentBalance: String(b.openingBalance) })
      .where(eq(cashRegistersTable.id, b.cashRegisterId));

    return {
      ...shift,
      openingBalance: parseFloat(shift.openingBalance as string),
    };
  }

  async closeShift(id: string, b: any) {
    const [shift] = await db.select().from(cashShiftsTable).where(eq(cashShiftsTable.id, id));
    if (!shift) throw new NotFoundException(`Cash shift ${id} not found`);

    const openingBalance = parseFloat(shift.openingBalance as string);
    const closingBalance = parseFloat(String(b.closingBalance));
    const expectedBalance = openingBalance + parseFloat(shift.cashIn ?? '0') - parseFloat(shift.cashOut ?? '0');
    const discrepancy = closingBalance - expectedBalance;

    const [updated] = await db
      .update(cashShiftsTable)
      .set({
        closingBalance: String(closingBalance),
        expectedBalance: String(expectedBalance),
        discrepancy: String(discrepancy),
        status: 'closed',
        closedAt: new Date(),
        notes: b.notes ?? null,
      })
      .where(eq(cashShiftsTable.id, id))
      .returning();

    await db
      .update(cashRegistersTable)
      .set({ status: 'closed', currentBalance: String(closingBalance) })
      .where(eq(cashRegistersTable.id, shift.cashRegisterId));

    return {
      ...updated,
      openingBalance: parseFloat(updated.openingBalance as string),
      closingBalance: parseFloat(updated.closingBalance as string),
      expectedBalance: parseFloat(updated.expectedBalance as string),
      discrepancy: parseFloat(updated.discrepancy as string),
    };
  }

  async getCreditNotes(q: any) {
    const conds: any[] = [eq(creditNotesTable.isActive, true)];
    if (q.type) conds.push(eq(creditNotesTable.type, q.type));
    if (q.status) conds.push(eq(creditNotesTable.status, q.status));

    const rows = await db
      .select()
      .from(creditNotesTable)
      .where(and(...conds))
      .orderBy(desc(creditNotesTable.createdAt));

    return rows.map((r) => ({ ...r, amount: parseFloat(r.amount as string) }));
  }

  async createCreditNote(b: any) {
    const noteNumber = 'CN-' + Date.now().toString(36).toUpperCase();
    const [note] = await db
      .insert(creditNotesTable)
      .values({
        noteNumber,
        type: b.type ?? 'credit',
        invoiceId: b.invoiceId ?? null,
        guestId: b.guestId ?? null,
        amount: String(b.amount),
        reason: b.reason,
        issuedBy: b.issuedBy ?? null,
        status: 'issued',
      })
      .returning();
    return { ...note, amount: parseFloat(note.amount as string) };
  }

  async getRevenueSummary(q: any) {
    const conds: any[] = [eq(transactionsTable.transactionType, 'revenue'), eq(transactionsTable.isActive, true)];
    if (q.startDate) conds.push(sql`${transactionsTable.transactionDate} >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`${transactionsTable.transactionDate} <= ${q.endDate}`);

    const rows = await db
      .select({
        category: transactionsTable.category,
        total: sql<string>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(and(...conds))
      .groupBy(transactionsTable.category)
      .orderBy(sql`sum(amount) desc`);

    return rows.map((r) => ({ ...r, total: parseFloat(r.total) }));
  }

  async getExpenseSummary(q: any) {
    const conds: any[] = [eq(transactionsTable.transactionType, 'expense'), eq(transactionsTable.isActive, true)];
    if (q.startDate) conds.push(sql`${transactionsTable.transactionDate} >= ${q.startDate}`);
    if (q.endDate) conds.push(sql`${transactionsTable.transactionDate} <= ${q.endDate}`);

    const rows = await db
      .select({
        category: transactionsTable.category,
        total: sql<string>`coalesce(sum(amount), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(and(...conds))
      .groupBy(transactionsTable.category)
      .orderBy(sql`sum(amount) desc`);

    return rows.map((r) => ({ ...r, total: parseFloat(r.total) }));
  }
}
