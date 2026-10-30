import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, like, sql, getTableColumns, desc, inArray } from 'drizzle-orm';
import {
  db,
  inventoryCategoriesTable,
  inventoryItemsTable,
  stockMovementsTable,
  inventoryLocationsTable,
  inventoryLocationStocksTable,
  floorRequisitionsTable,
  floorRequisitionItemsTable,
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

  // ─── Multi-Tier Inventory Locations & Inter-Stock Transfers ───────────────────

  async getLocations() {
    const locations = await db
      .select({
        ...getTableColumns(inventoryLocationsTable),
        itemCount: sql<number>`count(${inventoryLocationStocksTable.id})::int`,
        totalStock: sql<number>`coalesce(sum(${inventoryLocationStocksTable.currentStock}::numeric), 0)::float`,
      })
      .from(inventoryLocationsTable)
      .leftJoin(inventoryLocationStocksTable, eq(inventoryLocationsTable.id, inventoryLocationStocksTable.locationId))
      .where(eq(inventoryLocationsTable.isActive, true))
      .groupBy(inventoryLocationsTable.id)
      .orderBy(inventoryLocationsTable.type, inventoryLocationsTable.name);

    return locations;
  }

  async getLocationStocks(locationIdOrCode: string, q?: any) {
    let resolvedLocationId = locationIdOrCode;
    const [loc] = await db
      .select({ id: inventoryLocationsTable.id })
      .from(inventoryLocationsTable)
      .where(or(eq(inventoryLocationsTable.id, locationIdOrCode), eq(inventoryLocationsTable.code, locationIdOrCode)))
      .limit(1);
    if (loc) resolvedLocationId = loc.id;

    const conds: any[] = [eq(inventoryLocationStocksTable.locationId, resolvedLocationId)];
    if (q?.status && q.status !== 'all') {
      conds.push(eq(inventoryLocationStocksTable.status, q.status));
    }
    if (q?.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(inventoryItemsTable.name, s), like(inventoryItemsTable.itemCode, s)));
    }

    const rows = await db
      .select({
        id: inventoryLocationStocksTable.id,
        locationId: inventoryLocationStocksTable.locationId,
        itemId: inventoryLocationStocksTable.itemId,
        itemCode: inventoryItemsTable.itemCode,
        name: inventoryItemsTable.name,
        category: inventoryItemsTable.category,
        unit: inventoryItemsTable.unit,
        currentStock: sql<number>`${inventoryLocationStocksTable.currentStock}::numeric::float`,
        minStock: sql<number>`${inventoryLocationStocksTable.minStock}::numeric::float`,
        reorderLevel: sql<number>`${inventoryLocationStocksTable.reorderLevel}::numeric::float`,
        status: inventoryLocationStocksTable.status,
        updatedAt: inventoryLocationStocksTable.updatedAt,
      })
      .from(inventoryLocationStocksTable)
      .innerJoin(inventoryItemsTable, eq(inventoryLocationStocksTable.itemId, inventoryItemsTable.id))
      .where(and(...conds))
      .orderBy(inventoryItemsTable.name);

    return rows;
  }

  async transferStock(b: { itemId: string; fromLocationId: string; toLocationId: string; quantity: number; notes?: string; reference?: string }) {
    const qty = parseFloat(String(b.quantity));
    if (!qty || qty <= 0) throw new BadRequestException('Transfer quantity must be greater than 0');

    // Resolve fromLocationId
    let fromLocId = b.fromLocationId;
    const [fromLoc] = await db
      .select({ id: inventoryLocationsTable.id })
      .from(inventoryLocationsTable)
      .where(or(eq(inventoryLocationsTable.id, b.fromLocationId), eq(inventoryLocationsTable.code, b.fromLocationId)))
      .limit(1);
    if (fromLoc) fromLocId = fromLoc.id;

    // Resolve toLocationId
    let toLocId = b.toLocationId;
    const [toLoc] = await db
      .select({ id: inventoryLocationsTable.id })
      .from(inventoryLocationsTable)
      .where(or(eq(inventoryLocationsTable.id, b.toLocationId), eq(inventoryLocationsTable.code, b.toLocationId)))
      .limit(1);
    if (toLoc) toLocId = toLoc.id;

    if (fromLocId === toLocId) throw new BadRequestException('Source and destination locations must be different');

    // 1. Check Source location balance
    const [fromStock] = await db
      .select()
      .from(inventoryLocationStocksTable)
      .where(and(eq(inventoryLocationStocksTable.locationId, fromLocId), eq(inventoryLocationStocksTable.itemId, b.itemId)));

    if (!fromStock || parseFloat(String(fromStock.currentStock)) < qty) {
      throw new BadRequestException('Insufficient stock available in source location');
    }

    const fromPrev = parseFloat(String(fromStock.currentStock));
    const fromNew = fromPrev - qty;
    const fromStatus = fromNew <= 0 ? 'depleted' : fromNew <= parseFloat(String(fromStock.reorderLevel ?? '0')) ? 'running_low' : 'adequate';

    // Deduct from source
    await db
      .update(inventoryLocationStocksTable)
      .set({ currentStock: String(fromNew), status: fromStatus })
      .where(eq(inventoryLocationStocksTable.id, fromStock.id));

    // 2. Add to destination location
    const [toStock] = await db
      .select()
      .from(inventoryLocationStocksTable)
      .where(and(eq(inventoryLocationStocksTable.locationId, toLocId), eq(inventoryLocationStocksTable.itemId, b.itemId)));

    let toNew = qty;
    if (toStock) {
      const toPrev = parseFloat(String(toStock.currentStock));
      toNew = toPrev + qty;
      const toStatus = toNew <= 0 ? 'depleted' : toNew <= parseFloat(String(toStock.reorderLevel ?? '0')) ? 'running_low' : 'adequate';
      await db
        .update(inventoryLocationStocksTable)
        .set({ currentStock: String(toNew), status: toStatus })
        .where(eq(inventoryLocationStocksTable.id, toStock.id));
    } else {
      await db.insert(inventoryLocationStocksTable).values({
        locationId: toLocId,
        itemId: b.itemId,
        currentStock: String(toNew),
        minStock: '5',
        reorderLevel: '10',
        status: 'adequate',
      });
    }

    // 3. Log movement audit
    await db.insert(stockMovementsTable).values({
      itemId: b.itemId,
      movementType: 'transfer',
      quantity: String(qty),
      previousStock: String(fromPrev),
      newStock: String(fromNew),
      referenceType: 'inter_store_transfer',
      referenceId: `${b.fromLocationId}->${b.toLocationId}`,
      notes: b.notes || `Transferred ${qty} units from location ${b.fromLocationId} to ${b.toLocationId}`,
    });

    return { success: true, fromNew, toNew };
  }

  // ─── Frontline Staff Supplies (Waiters & Housekeeping) ───────────────────────

  async getStaffSupplies(q?: { department?: string; search?: string; status?: string }) {
    const dept = (q?.department || 'housekeeping').toLowerCase();
    const targetCode = dept.includes('restaurant') || dept.includes('waiter') ? 'MINI_REST' : 'MINI_HK';

    const [location] = await db
      .select()
      .from(inventoryLocationsTable)
      .where(eq(inventoryLocationsTable.code, targetCode));

    if (!location) return [];

    const conds: any[] = [eq(inventoryLocationStocksTable.locationId, location.id)];

    if (q?.status && q.status !== 'all') {
      conds.push(eq(inventoryLocationStocksTable.status, q.status));
    }

    if (q?.search) {
      const s = `%${q.search}%`;
      conds.push(or(like(inventoryItemsTable.name, s), like(inventoryItemsTable.itemCode, s)));
    }

    const rows = await db
      .select({
        id: inventoryLocationStocksTable.id,
        itemId: inventoryLocationStocksTable.itemId,
        itemCode: inventoryItemsTable.itemCode,
        name: inventoryItemsTable.name,
        category: inventoryItemsTable.category,
        unit: inventoryItemsTable.unit,
        currentStock: sql<number>`${inventoryLocationStocksTable.currentStock}::numeric::float`,
        currentLevel: sql<number>`${inventoryLocationStocksTable.currentStock}::numeric::float`,
        minStock: sql<number>`${inventoryLocationStocksTable.minStock}::numeric::float`,
        minRequired: sql<number>`${inventoryLocationStocksTable.minStock}::numeric::float`,
        reorderLevel: sql<number>`${inventoryLocationStocksTable.reorderLevel}::numeric::float`,
        status: inventoryLocationStocksTable.status,
        storageLocation: inventoryItemsTable.storageLocation,
        department: sql<string>`${location.department}`,
        locationName: sql<string>`${location.name}`,
      })
      .from(inventoryLocationStocksTable)
      .innerJoin(inventoryItemsTable, eq(inventoryLocationStocksTable.itemId, inventoryItemsTable.id))
      .where(and(...conds))
      .orderBy(
        sql`CASE WHEN ${inventoryLocationStocksTable.status} = 'depleted' THEN 1 WHEN ${inventoryLocationStocksTable.status} = 'running_low' THEN 2 ELSE 3 END`,
        inventoryItemsTable.name
      );

    return rows;
  }

  // ─── Floor Requisitions (Staff -> Coordinator Distribution) ───────────────────

  async getFloorRequisitions(q?: { department?: string; status?: string }) {
    const conds: any[] = [];
    if (q?.department && q.department !== 'all') {
      conds.push(eq(floorRequisitionsTable.department, q.department));
    }
    if (q?.status && q.status !== 'all') {
      conds.push(eq(floorRequisitionsTable.status, q.status));
    }

    const requisitions = await db
      .select({
        ...getTableColumns(floorRequisitionsTable),
        sourceLocationName: inventoryLocationsTable.name,
      })
      .from(floorRequisitionsTable)
      .leftJoin(inventoryLocationsTable, eq(floorRequisitionsTable.sourceLocationId, inventoryLocationsTable.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(floorRequisitionsTable.createdAt));

    // Fetch items for each requisition
    const reqWithItems = await Promise.all(
      requisitions.map(async (r) => {
        const items = await db
          .select()
          .from(floorRequisitionItemsTable)
          .where(eq(floorRequisitionItemsTable.requisitionId, r.id));
        return {
          ...r,
          items: items.map((i) => ({
            ...i,
            requestedQty: parseFloat(String(i.quantityRequested)),
            quantityRequested: parseFloat(String(i.quantityRequested)),
            issuedQty: parseFloat(String(i.quantityIssued || '0')),
            quantityIssued: parseFloat(String(i.quantityIssued || '0')),
          })),
        };
      })
    );

    return reqWithItems;
  }

  async createFloorRequisition(b: {
    department: string;
    requestedBy: string;
    stationName?: string;
    urgency?: string;
    notes?: string;
    items: Array<any>;
  }) {
    if (!b.items || b.items.length === 0) {
      throw new BadRequestException('Requisition must contain at least one item');
    }

    const dept = (b.department || 'housekeeping').toLowerCase();
    const targetCode = dept.includes('restaurant') || dept.includes('waiter') ? 'MINI_REST' : 'MINI_HK';
    const [loc] = await db.select().from(inventoryLocationsTable).where(eq(inventoryLocationsTable.code, targetCode));

    const reqNumber = 'REQ-' + Date.now().toString(36).toUpperCase();

    const [req] = await db
      .insert(floorRequisitionsTable)
      .values({
        requisitionNumber: reqNumber,
        department: b.department,
        requestedBy: b.requestedBy,
        stationName: b.stationName ?? 'Floor Station',
        sourceLocationId: loc?.id ?? null,
        status: 'pending',
        urgency: b.urgency || 'normal',
        notes: b.notes ?? null,
      })
      .returning();

    for (const item of b.items) {
      const qty = item.quantityRequested ?? item.requestedQty ?? item.qty ?? 1;
      let name = item.itemName;
      let unit = item.unit;
      if ((!name || !unit) && item.itemId) {
        const [master] = await db
          .select({ name: inventoryItemsTable.name, unit: inventoryItemsTable.unit })
          .from(inventoryItemsTable)
          .where(eq(inventoryItemsTable.id, item.itemId));
        if (master) {
          name = name || master.name;
          unit = unit || master.unit;
        }
      }

      await db.insert(floorRequisitionItemsTable).values({
        requisitionId: req.id,
        itemId: item.itemId ?? null,
        itemName: name || 'Supply Item',
        unit: unit || 'pcs',
        quantityRequested: String(qty),
        quantityIssued: '0',
        notes: item.notes ?? null,
      });
    }

    const createdItems = await db
      .select()
      .from(floorRequisitionItemsTable)
      .where(eq(floorRequisitionItemsTable.requisitionId, req.id));

    return {
      ...req,
      items: createdItems.map((i) => ({
        ...i,
        requestedQty: parseFloat(String(i.quantityRequested)),
        quantityRequested: parseFloat(String(i.quantityRequested)),
        issuedQty: 0,
      })),
    };
  }

  async issueFloorRequisition(id: string, b?: { approvedBy?: string; notes?: string }) {
    const [req] = await db.select().from(floorRequisitionsTable).where(eq(floorRequisitionsTable.id, id));
    if (!req) throw new NotFoundException(`Floor requisition ${id} not found`);
    if (req.status === 'approved') throw new BadRequestException('Requisition has already been issued');

    const items = await db.select().from(floorRequisitionItemsTable).where(eq(floorRequisitionItemsTable.requisitionId, id));

    // For each item, stock-out from mini stock
    for (const item of items) {
      const qty = parseFloat(String(item.quantityRequested));
      if (req.sourceLocationId && item.itemId && qty > 0) {
        const [locStock] = await db
          .select()
          .from(inventoryLocationStocksTable)
          .where(and(eq(inventoryLocationStocksTable.locationId, req.sourceLocationId), eq(inventoryLocationStocksTable.itemId, item.itemId)));

        if (locStock) {
          const prev = parseFloat(String(locStock.currentStock));
          const nextStock = Math.max(0, prev - qty);
          const nextStatus = nextStock <= 0 ? 'depleted' : nextStock <= parseFloat(String(locStock.reorderLevel ?? '0')) ? 'running_low' : 'adequate';

          await db
            .update(inventoryLocationStocksTable)
            .set({ currentStock: String(nextStock), status: nextStatus })
            .where(eq(inventoryLocationStocksTable.id, locStock.id));
        }

        // Also update master inventory items current stock
        const [master] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, item.itemId));
        if (master) {
          const masterPrev = parseFloat(String(master.currentStock));
          const masterNext = Math.max(0, masterPrev - qty);
          await db
            .update(inventoryItemsTable)
            .set({ currentStock: String(masterNext), status: computeStatus(masterNext, parseFloat(String(master.reorderLevel ?? '0'))) })
            .where(eq(inventoryItemsTable.id, item.itemId));
        }

        // Record stock movement
        await db.insert(stockMovementsTable).values({
          itemId: item.itemId,
          movementType: 'stock_out',
          quantity: String(qty),
          previousStock: '0',
          newStock: '0',
          referenceType: 'floor_distribution',
          referenceId: req.requisitionNumber,
          notes: `Issued to ${req.requestedBy} (${req.stationName || req.department})`,
        });
      }

      await db
        .update(floorRequisitionItemsTable)
        .set({ quantityIssued: String(qty) })
        .where(eq(floorRequisitionItemsTable.id, item.id));
    }

    const [updated] = await db
      .update(floorRequisitionsTable)
      .set({
        status: 'approved',
        approvedBy: b?.approvedBy || 'Coordinator',
        approvedAt: new Date(),
        notes: b?.notes || req.notes,
      })
      .where(eq(floorRequisitionsTable.id, id))
      .returning();

    return updated;
  }
}
