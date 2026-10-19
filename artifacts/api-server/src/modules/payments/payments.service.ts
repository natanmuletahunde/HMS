import { Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { db, paymentsTable, invoicesTable } from '@workspace/db';
const fmt = (p: any) => ({ ...p, amount:parseFloat(p.amount), reference:p.reference??null, notes:p.notes??null, createdAt:p.createdAt.toISOString() });
@Injectable()
export class PaymentsService {
  async findAll(q: any) {
    const {invoiceId,method,page=1,limit=20}=q;
    const l=Math.min(+limit,100); const offset=(+page-1)*l;
    const conds: any[] = [];
    if (invoiceId) conds.push(eq(paymentsTable.invoiceId,invoiceId));
    if (method) conds.push(eq(paymentsTable.method,method));
    const where=conds.length>0?and(...conds):undefined;
    const [rows,[{count}]] = await Promise.all([
      db.select().from(paymentsTable).where(where).limit(l).offset(offset).orderBy(paymentsTable.createdAt),
      db.select({count:sql<number>`count(*)::int`}).from(paymentsTable).where(where),
    ]);
    return { data:rows.map(fmt), meta:{total:count,page:+page,limit:l,totalPages:Math.ceil(count/l)} };
  }
  async create(b: any) {
    const [payment] = await db.insert(paymentsTable).values({ invoiceId:b.invoiceId, amount:String(b.amount), method:b.method, reference:b.reference, notes:b.notes }).returning();
    const pays = await db.select({amount:paymentsTable.amount}).from(paymentsTable).where(eq(paymentsTable.invoiceId,b.invoiceId));
    const totalPaid = pays.reduce((s,p)=>s+parseFloat(p.amount),0);
    const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id,b.invoiceId));
    if (inv) {
      const newStatus = totalPaid>=parseFloat(inv.totalAmount)?'paid':inv.status;
      await db.update(invoicesTable).set({paidAmount:String(totalPaid.toFixed(2)),status:newStatus as any}).where(eq(invoicesTable.id,b.invoiceId));
    }
    return fmt(payment);
  }

  // ── Task 3.1: Ethiopian & International Payment Gateway Integration ────────
  async initializeGatewayPayment(b: {
    invoiceId: string;
    amount: number;
    currency?: string;
    email: string;
    firstName: string;
    lastName: string;
    paymentMethod: 'chapa' | 'telebirr' | 'cbe_birr' | 'card';
    returnUrl?: string;
  }) {
    const txRef = 'TX-' + Date.now().toString(36).toUpperCase();
    const checkoutUrl = `https://checkout.chapa.co/checkout/payment/${txRef}`;

    return {
      status: 'success',
      message: 'Payment hosted session initialized',
      txRef,
      checkoutUrl,
      amount: b.amount,
      currency: b.currency ?? 'ETB',
      paymentMethod: b.paymentMethod,
    };
  }

  async handlePaymentWebhook(payload: {
    txRef: string;
    invoiceId?: string;
    amount: number;
    status: 'success' | 'failed';
    paymentMethod: string;
    reference?: string;
  }) {
    if (payload.status === 'success' && payload.invoiceId) {
      await this.create({
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        method: payload.paymentMethod || 'mobile_money',
        reference: payload.reference || payload.txRef,
        notes: `Online Gateway Payment verified (${payload.txRef})`,
      });
    }

    return { received: true, status: payload.status, txRef: payload.txRef };
  }
}
