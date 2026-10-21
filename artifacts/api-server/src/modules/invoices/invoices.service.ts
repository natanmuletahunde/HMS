import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, getTableColumns } from 'drizzle-orm';
import { db, invoicesTable, invoiceLineItemsTable, guestsTable } from '@workspace/db';

const invCols = getTableColumns(invoicesTable);
const joinedFields = {
  ...invCols,
  guestName: sql<string>`${guestsTable.firstName} || ' ' || ${guestsTable.lastName}`,
};
const base = () => db.select(joinedFields).from(invoicesTable).leftJoin(guestsTable, eq(invoicesTable.guestId, guestsTable.id));
const fmtInv = async (inv: any) => {
  const items = await db.select().from(invoiceLineItemsTable).where(eq(invoiceLineItemsTable.invoiceId, inv.id));
  return {
    ...inv,
    invoiceNo: inv.invoiceNumber,
    guestName: inv.guestName ?? null,
    total: parseFloat(inv.totalAmount ?? '0'),
    paid: parseFloat(inv.paidAmount ?? '0'),
    reservationId: inv.reservationId ?? null,
    notes: inv.notes ?? null,
    dueDate: inv.dueDate ?? (inv.createdAt instanceof Date ? inv.createdAt.toISOString().slice(0, 10) : String(inv.createdAt || '').slice(0, 10)),
    subtotal: parseFloat(inv.subtotal ?? '0'),
    taxAmount: parseFloat(inv.taxAmount ?? '0'),
    totalAmount: parseFloat(inv.totalAmount ?? '0'),
    paidAmount: parseFloat(inv.paidAmount ?? '0'),
    items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice), total: parseFloat(i.total) })),
    createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : String(inv.createdAt),
  };
};

@Injectable()
export class InvoicesService {
  async findAll(q: any) {
    const { status, guestId, reservationId, page = 1, limit = 20 } = q;
    const l = Math.min(+limit, 100); const offset = (+page - 1) * l;
    const conds: any[] = [];
    if (status) conds.push(eq(invoicesTable.status, status));
    if (guestId) conds.push(eq(invoicesTable.guestId, guestId));
    if (reservationId) conds.push(eq(invoicesTable.reservationId, reservationId));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [rows, [{ count }]] = await Promise.all([
      base().where(where).limit(l).offset(offset).orderBy(invoicesTable.createdAt),
      db.select({ count: sql<number>`count(*)::int` }).from(invoicesTable).where(where),
    ]);
    return { data: await Promise.all(rows.map(fmtInv)), meta: { total: count, page: +page, limit: l, totalPages: Math.ceil(count / l) } };
  }
  async create(b: any) {
    const items = b.items as { description: string; quantity: number; unitPrice: number; total: number }[];
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const tax = b.taxAmount ?? 0; const total = subtotal + tax;
    const [inv] = await db.insert(invoicesTable).values({ guestId: b.guestId, reservationId: b.reservationId, subtotal: String(subtotal.toFixed(2)), taxAmount: String(tax.toFixed(2)), totalAmount: String(total.toFixed(2)), dueDate: b.dueDate, notes: b.notes, status: 'draft' }).returning();
    for (const item of items) await db.insert(invoiceLineItemsTable).values({ invoiceId: inv.id, description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice), total: String(item.total) });
    const [row] = await base().where(eq(invoicesTable.id, inv.id)); return fmtInv(row);
  }
  async findOne(id: string) { const [row] = await base().where(eq(invoicesTable.id, id)); if (!row) throw new NotFoundException(); return fmtInv(row); }
  async update(id: string, b: any) { const u: any = {}; if (b.status !== undefined) u.status = b.status; if (b.notes !== undefined) u.notes = b.notes; await db.update(invoicesTable).set(u).where(eq(invoicesTable.id, id)); const [row] = await base().where(eq(invoicesTable.id, id)); if (!row) throw new NotFoundException(); return fmtInv(row); }
}
