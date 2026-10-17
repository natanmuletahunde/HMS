import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc } from 'drizzle-orm';
import {
  db,
  suppliersTable,
  purchaseRequestsTable,
  purchaseRequestItemsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  goodsReceiptsTable,
  goodsReceiptItemsTable,
  inventoryItemsTable,
  stockMovementsTable,
} from '@workspace/db';

@Injectable()
export class ProcurementService {
  // ── Suppliers ──────────────────────────────────────────────────────────────

  async getSuppliers(q: any) {
    const conds: any[] = [eq(suppliersTable.isActive, true)];
    if (q.status) conds.push(eq(suppliersTable.status, q.status));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(suppliersTable.companyName, s), like(suppliersTable.contactPerson, s)));
    }
    return db.select().from(suppliersTable).where(and(...conds)).orderBy(suppliersTable.companyName);
  }

  async createSupplier(b: any) {
    const supplierCode = 'SUP-' + Date.now().toString(36).toUpperCase();
    const [s] = await db
      .insert(suppliersTable)
      .values({
        supplierCode,
        companyName: b.companyName,
        contactPerson: b.contactPerson ?? null,
        phone: b.phone ?? null,
        email: b.email ?? null,
        address: b.address ?? null,
        city: b.city ?? null,
        country: b.country ?? null,
        tin: b.tin ?? null,
        bankName: b.bankName ?? null,
        bankAccount: b.bankAccount ?? null,
        paymentTerms: b.paymentTerms ?? null,
        rating: b.rating ?? 5,
        status: b.status ?? 'active',
        notes: b.notes ?? null,
      })
      .returning();
    return s;
  }

  async updateSupplier(id: string, b: any) {
    const u: any = {};
    for (const k of ['companyName', 'contactPerson', 'phone', 'email', 'address', 'city', 'country', 'tin', 'bankName', 'bankAccount', 'paymentTerms', 'rating', 'status', 'notes']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [s] = await db.update(suppliersTable).set(u).where(eq(suppliersTable.id, id)).returning();
    if (!s) throw new NotFoundException(`Supplier ${id} not found`);
    return s;
  }

  // ── Purchase Requests ─────────────────────────────────────────────────────

  async getPurchaseRequests(q: any) {
    const conds: any[] = [eq(purchaseRequestsTable.isActive, true)];
    if (q.status) conds.push(eq(purchaseRequestsTable.status, q.status));
    if (q.priority) conds.push(eq(purchaseRequestsTable.priority, q.priority));
    if (q.department) conds.push(eq(purchaseRequestsTable.department, q.department));

    const rows = await db
      .select({
        ...getTableColumns(purchaseRequestsTable),
        itemCount: sql<number>`(select count(*) from purchase_request_items where request_id = purchase_requests.id)::int`,
      })
      .from(purchaseRequestsTable)
      .where(and(...conds))
      .orderBy(desc(purchaseRequestsTable.createdAt));

    return rows.map((r) => ({
      ...r,
      totalAmount: r.totalAmount != null ? parseFloat(r.totalAmount as string) : 0,
    }));
  }

  async createPurchaseRequest(b: any) {
    const requestNumber = 'PR-' + Date.now().toString(36).toUpperCase();
    const [req] = await db
      .insert(purchaseRequestsTable)
      .values({
        requestNumber,
        department: b.department,
        requestedBy: b.requestedBy ?? null,
        priority: b.priority ?? 'normal',
        requiredDate: b.requiredDate ?? null,
        status: 'draft',
        notes: b.notes ?? null,
        totalAmount: '0',
      })
      .returning();

    const items = b.items ?? [];
    let totalAmount = 0;
    for (const item of items) {
      const est = item.estimatedUnitCost != null ? parseFloat(String(item.estimatedUnitCost)) : 0;
      const qty = parseFloat(String(item.quantityRequested));
      const estTotal = est * qty;
      totalAmount += estTotal;
      await db.insert(purchaseRequestItemsTable).values({
        requestId: req.id,
        itemId: item.itemId ?? null,
        itemName: item.itemName,
        unit: item.unit,
        quantityRequested: String(qty),
        estimatedUnitCost: est > 0 ? String(est) : null,
        estimatedTotal: estTotal > 0 ? String(estTotal) : null,
        notes: item.notes ?? null,
      });
    }

    const [updated] = await db
      .update(purchaseRequestsTable)
      .set({ totalAmount: String(totalAmount) })
      .where(eq(purchaseRequestsTable.id, req.id))
      .returning();

    const reqItems = await db
      .select()
      .from(purchaseRequestItemsTable)
      .where(eq(purchaseRequestItemsTable.requestId, req.id));
    return { ...updated, totalAmount: parseFloat(updated.totalAmount ?? '0'), items: reqItems };
  }

  async updatePurchaseRequest(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'approvedBy', 'rejectionReason', 'notes']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'approved') {
      u.approvedAt = new Date();
      u.approvedBy = b.approvedBy ?? null;
    }
    const [req] = await db.update(purchaseRequestsTable).set(u).where(eq(purchaseRequestsTable.id, id)).returning();
    if (!req) throw new NotFoundException(`Purchase request ${id} not found`);
    return { ...req, totalAmount: parseFloat(req.totalAmount ?? '0') };
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  async getPurchaseOrders(q: any) {
    const conds: any[] = [eq(purchaseOrdersTable.isActive, true)];
    if (q.status) conds.push(eq(purchaseOrdersTable.status, q.status));
    if (q.supplierId) conds.push(eq(purchaseOrdersTable.supplierId, q.supplierId));

    const rows = await db
      .select({
        ...getTableColumns(purchaseOrdersTable),
        supplierName: suppliersTable.companyName,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
      .where(and(...conds))
      .orderBy(desc(purchaseOrdersTable.createdAt));

    return rows.map((r) => ({
      ...r,
      subtotal: parseFloat(r.subtotal ?? '0'),
      taxAmount: parseFloat(r.taxAmount ?? '0'),
      discountAmount: parseFloat(r.discountAmount ?? '0'),
      totalAmount: parseFloat(r.totalAmount ?? '0'),
    }));
  }

  async createPurchaseOrder(b: any) {
    const poNumber = 'PO-' + Date.now().toString(36).toUpperCase();
    const items = b.items ?? [];

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const processedItems: any[] = [];
    for (const item of items) {
      const qty = parseFloat(String(item.quantityOrdered));
      const unitPrice = parseFloat(String(item.unitPrice));
      const discount = item.discountAmount ? parseFloat(String(item.discountAmount)) : 0;
      const tax = item.taxAmount ? parseFloat(String(item.taxAmount)) : 0;
      const total = qty * unitPrice - discount + tax;
      subtotal += qty * unitPrice;
      totalTax += tax;
      totalDiscount += discount;
      processedItems.push({ ...item, qty, unitPrice, discount, tax, total });
    }
    const totalAmount = subtotal - totalDiscount + totalTax;

    const [order] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber,
        supplierId: b.supplierId ?? null,
        requestId: b.requestId ?? null,
        orderDate: b.orderDate ?? new Date().toISOString().slice(0, 10),
        expectedDelivery: b.expectedDelivery ?? null,
        status: 'draft',
        subtotal: String(subtotal),
        taxAmount: String(totalTax),
        discountAmount: String(totalDiscount),
        totalAmount: String(totalAmount),
        paymentTerms: b.paymentTerms ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    for (const item of processedItems) {
      await db.insert(purchaseOrderItemsTable).values({
        orderId: order.id,
        itemId: item.itemId ?? null,
        itemName: item.itemName,
        unit: item.unit,
        quantityOrdered: String(item.qty),
        unitPrice: String(item.unitPrice),
        discountAmount: String(item.discount),
        taxAmount: String(item.tax),
        total: String(item.total),
        notes: item.notes ?? null,
      });
    }

    const orderItems = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.orderId, order.id));

    return {
      ...order,
      subtotal: parseFloat(order.subtotal ?? '0'),
      taxAmount: parseFloat(order.taxAmount ?? '0'),
      discountAmount: parseFloat(order.discountAmount ?? '0'),
      totalAmount: parseFloat(order.totalAmount ?? '0'),
      items: orderItems,
    };
  }

  async updatePurchaseOrder(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'approvedBy', 'actualDelivery', 'notes', 'paymentStatus']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    if (b.status === 'confirmed' && b.approvedBy) u.approvedAt = new Date();
    const [order] = await db.update(purchaseOrdersTable).set(u).where(eq(purchaseOrdersTable.id, id)).returning();
    if (!order) throw new NotFoundException(`Purchase order ${id} not found`);
    return {
      ...order,
      subtotal: parseFloat(order.subtotal ?? '0'),
      taxAmount: parseFloat(order.taxAmount ?? '0'),
      discountAmount: parseFloat(order.discountAmount ?? '0'),
      totalAmount: parseFloat(order.totalAmount ?? '0'),
    };
  }

  // ── Goods Receipts ────────────────────────────────────────────────────────

  async getGoodsReceipts(q: any) {
    const conds: any[] = [eq(goodsReceiptsTable.isActive, true)];
    if (q.status) conds.push(eq(goodsReceiptsTable.status, q.status));
    if (q.orderId) conds.push(eq(goodsReceiptsTable.orderId, q.orderId));

    const rows = await db
      .select({
        ...getTableColumns(goodsReceiptsTable),
        supplierName: suppliersTable.companyName,
      })
      .from(goodsReceiptsTable)
      .leftJoin(suppliersTable, eq(goodsReceiptsTable.supplierId, suppliersTable.id))
      .where(and(...conds))
      .orderBy(desc(goodsReceiptsTable.createdAt));

    return rows;
  }

  async createGoodsReceipt(b: any) {
    const receiptNumber = 'GRN-' + Date.now().toString(36).toUpperCase();
    const [receipt] = await db
      .insert(goodsReceiptsTable)
      .values({
        receiptNumber,
        orderId: b.orderId ?? null,
        supplierId: b.supplierId ?? null,
        receivedDate: b.receivedDate,
        receivedBy: b.receivedBy ?? null,
        status: 'pending',
        notes: b.notes ?? null,
      })
      .returning();

    const receiptItems = b.items ?? [];
    for (const item of receiptItems) {
      const qtyAccepted = parseFloat(String(item.quantityAccepted ?? 0));
      await db.insert(goodsReceiptItemsTable).values({
        receiptId: receipt.id,
        orderItemId: item.orderItemId ?? null,
        itemId: item.itemId ?? null,
        itemName: item.itemName,
        unit: item.unit,
        quantityExpected: item.quantityExpected != null ? String(item.quantityExpected) : null,
        quantityReceived: String(item.quantityReceived),
        quantityAccepted: String(qtyAccepted),
        quantityRejected: item.quantityRejected != null ? String(item.quantityRejected) : '0',
        unitCost: item.unitCost != null ? String(item.unitCost) : null,
        inspectionNotes: item.inspectionNotes ?? null,
        status: 'pending',
      });

      // Update inventory stock for accepted items
      if (item.itemId && qtyAccepted > 0) {
        const [invItem] = await db
          .select()
          .from(inventoryItemsTable)
          .where(eq(inventoryItemsTable.id, item.itemId));
        if (invItem) {
          const prevStock = parseFloat(invItem.currentStock as string);
          const newStock = prevStock + qtyAccepted;
          const reorderLevel = parseFloat(invItem.reorderLevel ?? '0');
          const status = newStock <= 0 ? 'out_of_stock' : newStock <= reorderLevel ? 'low_stock' : 'active';

          await db.insert(stockMovementsTable).values({
            itemId: item.itemId,
            movementType: 'stock_in',
            quantity: String(qtyAccepted),
            previousStock: String(prevStock),
            newStock: String(newStock),
            unitCost: item.unitCost != null ? String(item.unitCost) : null,
            referenceType: 'goods_receipt',
            referenceId: receipt.id,
            notes: `Goods Receipt ${receiptNumber}`,
          });

          await db
            .update(inventoryItemsTable)
            .set({ currentStock: String(newStock), status })
            .where(eq(inventoryItemsTable.id, item.itemId));
        }
      }
    }

    const items = await db
      .select()
      .from(goodsReceiptItemsTable)
      .where(eq(goodsReceiptItemsTable.receiptId, receipt.id));

    return { ...receipt, items };
  }

  async updateGoodsReceipt(id: string, b: any) {
    const u: any = {};
    for (const k of ['status', 'qualityScore', 'notes']) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const [receipt] = await db.update(goodsReceiptsTable).set(u).where(eq(goodsReceiptsTable.id, id)).returning();
    if (!receipt) throw new NotFoundException(`Goods receipt ${id} not found`);
    return receipt;
  }
}
