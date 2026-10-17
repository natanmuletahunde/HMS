import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc, inArray } from 'drizzle-orm';
import {
  db,
  inventoryCategoriesTable,
  inventoryItemsTable,
  stockMovementsTable,
} from '@workspace/db';

const parseItem = (i: any) => ({
  ...i,
  currentStock: i.currentStock != null ? parseFloat(i.currentStock) : 0,
  minStock: i.minStock != null ? parseFloat(i.minStock) : 0,
  maxStock: i.maxStock != null ? parseFloat(i.maxStock) : null,
  reorderLevel: i.reorderLevel != null ? parseFloat(i.reorderLevel) : 0,
  unitCost: i.unitCost != null ? parseFloat(i.unitCost) : null,
  purchasePrice: i.purchasePrice != null ? parseFloat(i.purchasePrice) : null,
  sellingPrice: i.sellingPrice != null ? parseFloat(i.sellingPrice) : null,
});

const computeStatus = (currentStock: number, reorderLevel: number): string => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= reorderLevel) return 'low_stock';
  return 'active';
};

@Injectable()
export class InventoryService {
  async getDashboard() {
    const [stats, byCategory, recentMovements] = await Promise.all([
      db
        .select({
          totalItems: sql<number>`count(*)::int`,
          lowStock: sql<number>`count(*) filter (where status = 'low_stock')::int`,
          outOfStock: sql<number>`count(*) filter (where status = 'out_of_stock')::int`,
          totalValue: sql<string>`coalesce(sum(current_stock::numeric * purchase_price::numeric), 0)`,
        })
        .from(inventoryItemsTable)
        .where(eq(inventoryItemsTable.isActive, true)),
      db
        .select({
          category: inventoryItemsTable.category,
          count: sql<number>`count(*)::int`,
          value: sql<string>`coalesce(sum(current_stock::numeric * purchase_price::numeric), 0)`,
        })
        .from(inventoryItemsTable)
        .where(eq(inventoryItemsTable.isActive, true))
        .groupBy(inventoryItemsTable.category),
      db
        .select({
          ...getTableColumns(stockMovementsTable),
          itemName: inventoryItemsTable.name,
        })
        .from(stockMovementsTable)
        .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
        .orderBy(desc(stockMovementsTable.createdAt))
        .limit(10),
    ]);

    const s = stats[0];
    return {
      totalItems: s?.totalItems ?? 0,
      lowStock: s?.lowStock ?? 0,
      outOfStock: s?.outOfStock ?? 0,
      totalValue: parseFloat(s?.totalValue ?? '0'),
      byCategory: byCategory.map((c) => ({ ...c, value: parseFloat(c.value) })),
      recentMovements: recentMovements.map((m) => ({
        ...m,
        quantity: parseFloat(m.quantity as string),
        previousStock: parseFloat(m.previousStock as string),
        newStock: parseFloat(m.newStock as string),
      })),
    };
  }

  async getCategories() {
    return db
      .select()
      .from(inventoryCategoriesTable)
      .where(eq(inventoryCategoriesTable.isActive, true))
      .orderBy(inventoryCategoriesTable.name);
  }

  async createCategory(b: any) {
    const [cat] = await db
      .insert(inventoryCategoriesTable)
      .values({
        name: b.name,
        description: b.description ?? null,
        isActive: true,
      })
      .returning();
    return cat;
  }

  async findAll(q: any) {
    const conds: any[] = [eq(inventoryItemsTable.isActive, true)];
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(inventoryItemsTable.name, s), like(inventoryItemsTable.itemCode, s)));
    }
    if (q.category) conds.push(eq(inventoryItemsTable.category, q.category));
    if (q.status) conds.push(eq(inventoryItemsTable.status, q.status));
    if (q.lowStock === 'true' || q.lowStock === true) {
      conds.push(sql`${inventoryItemsTable.currentStock}::numeric <= ${inventoryItemsTable.reorderLevel}::numeric`);
    }

    const rows = await db
      .select({
        ...getTableColumns(inventoryItemsTable),
        categoryName: inventoryCategoriesTable.name,
      })
      .from(inventoryItemsTable)
      .leftJoin(inventoryCategoriesTable, eq(inventoryItemsTable.categoryId, inventoryCategoriesTable.id))
      .where(and(...conds))
      .orderBy(inventoryItemsTable.name);

    return rows.map((r) => ({ ...parseItem(r), categoryName: r.categoryName ?? null }));
  }

  async create(b: any) {
    const itemCode = 'ITM-' + Date.now().toString(36).toUpperCase();
    const [item] = await db
      .insert(inventoryItemsTable)
      .values({
        itemCode,
        barcode: b.barcode ?? null,
        name: b.name,
        categoryId: b.categoryId ?? null,
        category: b.category,
        unit: b.unit,
        currentStock: b.currentStock != null ? String(b.currentStock) : '0',
        minStock: b.minStock != null ? String(b.minStock) : '0',
        maxStock: b.maxStock != null ? String(b.maxStock) : null,
        reorderLevel: b.reorderLevel != null ? String(b.reorderLevel) : '0',
        unitCost: b.unitCost != null ? String(b.unitCost) : null,
        purchasePrice: b.purchasePrice != null ? String(b.purchasePrice) : null,
        sellingPrice: b.sellingPrice != null ? String(b.sellingPrice) : null,
        storageLocation: b.storageLocation ?? null,
        supplier: b.supplier ?? null,
        supplierId: b.supplierId ?? null,
        status: b.status ?? 'active',
        description: b.description ?? null,
      })
      .returning();
    return parseItem(item);
  }

  async findOne(id: string) {
    const [row] = await db
      .select({
        ...getTableColumns(inventoryItemsTable),
        categoryName: inventoryCategoriesTable.name,
      })
      .from(inventoryItemsTable)
      .leftJoin(inventoryCategoriesTable, eq(inventoryItemsTable.categoryId, inventoryCategoriesTable.id))
      .where(eq(inventoryItemsTable.id, id));
    if (!row) throw new NotFoundException(`Inventory item ${id} not found`);
    return { ...parseItem(row), categoryName: row.categoryName ?? null };
  }

  async update(id: string, b: any) {
    const u: any = {};
    const fields = ['name', 'categoryId', 'category', 'unit', 'storageLocation', 'supplier', 'supplierId', 'description', 'barcode', 'expiryDate'];
    for (const k of fields) {
      if (b[k] !== undefined) u[k] = b[k];
    }
    const numFields = ['currentStock', 'minStock', 'maxStock', 'reorderLevel', 'unitCost', 'purchasePrice', 'sellingPrice'];
    for (const k of numFields) {
      if (b[k] !== undefined) u[k] = String(b[k]);
    }

    // Auto-update status based on stock
    const currentStock = b.currentStock !== undefined ? parseFloat(String(b.currentStock)) : null;
    const reorderLevel = b.reorderLevel !== undefined ? parseFloat(String(b.reorderLevel)) : null;
    if (currentStock !== null) {
      const [existing] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
      const rl = reorderLevel ?? (existing ? parseFloat(existing.reorderLevel ?? '0') : 0);
      u.status = computeStatus(currentStock, rl);
    }

    const [item] = await db.update(inventoryItemsTable).set(u).where(eq(inventoryItemsTable.id, id)).returning();
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return parseItem(item);
  }

  async getAlerts() {
    const rows = await db
      .select()
      .from(inventoryItemsTable)
      .where(
        and(
          eq(inventoryItemsTable.isActive, true),
          inArray(inventoryItemsTable.status, ['low_stock', 'out_of_stock']),
        ),
      )
      .orderBy(inventoryItemsTable.name);
    return rows.map(parseItem);
  }

  async getMovements(q: any) {
    const conds: any[] = [];
    if (q.itemId) conds.push(eq(stockMovementsTable.itemId, q.itemId));
    if (q.movementType) conds.push(eq(stockMovementsTable.movementType, q.movementType));

    const rows = await db
      .select({
        ...getTableColumns(stockMovementsTable),
        itemName: inventoryItemsTable.name,
      })
      .from(stockMovementsTable)
      .leftJoin(inventoryItemsTable, eq(stockMovementsTable.itemId, inventoryItemsTable.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(200);

    return rows.map((m) => ({
      ...m,
      quantity: parseFloat(m.quantity as string),
      previousStock: parseFloat(m.previousStock as string),
      newStock: parseFloat(m.newStock as string),
      unitCost: m.unitCost != null ? parseFloat(m.unitCost as string) : null,
    }));
  }

  async stockIn(b: any) {
    const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, b.itemId));
    if (!item) throw new NotFoundException(`Inventory item ${b.itemId} not found`);

    const prevStock = parseFloat(item.currentStock as string);
    const quantity = parseFloat(String(b.quantity));
    const newStock = prevStock + quantity;
    const status = computeStatus(newStock, parseFloat(item.reorderLevel ?? '0'));

    await db.insert(stockMovementsTable).values({
      itemId: b.itemId,
      movementType: 'stock_in',
      quantity: String(quantity),
      previousStock: String(prevStock),
      newStock: String(newStock),
      unitCost: b.unitCost != null ? String(b.unitCost) : null,
      referenceType: b.referenceType ?? null,
      referenceId: b.referenceId ?? null,
      notes: b.notes ?? null,
    });

    const [updated] = await db
      .update(inventoryItemsTable)
      .set({ currentStock: String(newStock), status })
      .where(eq(inventoryItemsTable.id, b.itemId))
      .returning();
    return parseItem(updated);
  }

  async stockOut(b: any) {
    const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, b.itemId));
    if (!item) throw new NotFoundException(`Inventory item ${b.itemId} not found`);

    const prevStock = parseFloat(item.currentStock as string);
    const quantity = parseFloat(String(b.quantity));
    if (prevStock < quantity) throw new BadRequestException('Insufficient stock');

    const newStock = prevStock - quantity;
    const status = computeStatus(newStock, parseFloat(item.reorderLevel ?? '0'));

    await db.insert(stockMovementsTable).values({
      itemId: b.itemId,
      movementType: 'stock_out',
      quantity: String(quantity),
      previousStock: String(prevStock),
      newStock: String(newStock),
      referenceType: b.referenceType ?? null,
      referenceId: b.referenceId ?? null,
      notes: b.notes ?? null,
    });

    const [updated] = await db
      .update(inventoryItemsTable)
      .set({ currentStock: String(newStock), status })
      .where(eq(inventoryItemsTable.id, b.itemId))
      .returning();
    return parseItem(updated);
  }

  async stockAdjustment(b: any) {
    const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, b.itemId));
    if (!item) throw new NotFoundException(`Inventory item ${b.itemId} not found`);

    const prevStock = parseFloat(item.currentStock as string);
    const newStock = parseFloat(String(b.newStock));
    const difference = newStock - prevStock;
    const status = computeStatus(newStock, parseFloat(item.reorderLevel ?? '0'));

    await db.insert(stockMovementsTable).values({
      itemId: b.itemId,
      movementType: 'adjustment',
      quantity: String(Math.abs(difference)),
      previousStock: String(prevStock),
      newStock: String(newStock),
      notes: b.notes ?? null,
    });

    const [updated] = await db
      .update(inventoryItemsTable)
      .set({ currentStock: String(newStock), status })
      .where(eq(inventoryItemsTable.id, b.itemId))
      .returning();
    return parseItem(updated);
  }
}
