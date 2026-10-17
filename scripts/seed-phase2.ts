import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const {
  hotelsTable, branchesTable, buildingsTable, floorsTable,
  roomCategoriesTable, bedTypesTable, roomAmenitiesTable,
  roomTypesTable, roomsTable, roomAmenityAssignmentsTable, roomImagesTable, roomPricingTable,
} = schema;

async function seed() {
  console.log("🌱 Seeding Phase 2 data...");

  // ── 1. Hotel ─────────────────────────────────────────────
  const [hotel] = await db.insert(hotelsTable).values({
    hotelName: "Nexus Grand Hotel",
    legalName: "Nexus Hospitality PLC",
    hotelCode: "NGH-001",
    email: "info@nexusgrand.com.et",
    phone: "+251-11-554-4000",
    website: "https://nexusgrand.com.et",
    country: "Ethiopia",
    region: "Addis Ababa",
    city: "Addis Ababa",
    subCity: "Bole",
    address: "Bole Road, Near Bole International Airport",
    postalCode: "1000",
    latitude: "9.0192",
    longitude: "38.7525",
    description: "A premier five-star hotel in the heart of Addis Ababa, offering world-class hospitality and Ethiopian cultural experiences.",
    timezone: "Africa/Addis_Ababa",
    currencyCode: "ETB",
    taxNumber: "TIN-ET-001234567",
    licenseNumber: "ETH-HTL-2020-00142",
    starRating: 5,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    status: "active",
  }).onConflictDoNothing().returning();

  const hotelId = hotel?.id ?? (await db.select().from(hotelsTable).where(eq(hotelsTable.hotelCode, "NGH-001")))[0].id;
  console.log("✅ Hotel:", hotelId);

  // ── 2. Branches ───────────────────────────────────────────
  const branchData = [
    { hotelId, branchName: "Nexus Main Branch – Bole", branchCode: "BRN-BOLE", manager: "Alemayehu Tadesse", email: "bole@nexusgrand.com.et", phone: "+251-11-554-4001", address: "Bole Road, Addis Ababa", description: "Main branch near Bole International Airport" },
    { hotelId, branchName: "Nexus City Center Branch", branchCode: "BRN-CITY", manager: "Tigist Haile", email: "city@nexusgrand.com.et", phone: "+251-11-554-4002", address: "Churchill Avenue, Addis Ababa", description: "City center branch near the National Museum" },
  ];
  const branches = await db.insert(branchesTable).values(branchData).onConflictDoNothing().returning();
  const [boleBranch, cityBranch] = branches.length ? branches : await Promise.all(["BRN-BOLE","BRN-CITY"].map(c => db.select().from(branchesTable).where(eq(branchesTable.branchCode, c)).then(r => r[0])));
  console.log("✅ Branches:", boleBranch?.id, cityBranch?.id);

  // ── 3. Buildings ──────────────────────────────────────────
  const buildingData = [
    { branchId: boleBranch.id, buildingName: "Adwa Tower", buildingCode: "BLD-ADWA", numberOfFloors: 12, description: "Primary tower — suites and deluxe rooms" },
    { branchId: boleBranch.id, buildingName: "Lalibela Wing", buildingCode: "BLD-LALIB", numberOfFloors: 8, description: "Standard and superior rooms" },
    { branchId: cityBranch.id, buildingName: "Entoto House", buildingCode: "BLD-ENTO", numberOfFloors: 6, description: "Executive and business rooms" },
  ];
  const buildings = await db.insert(buildingsTable).values(buildingData).onConflictDoNothing().returning();
  const [adwa, lalibela, entoto] = buildings.length ? buildings : await Promise.all(["BLD-ADWA","BLD-LALIB","BLD-ENTO"].map(c => db.select().from(buildingsTable).where(eq(buildingsTable.buildingCode, c)).then(r => r[0])));
  console.log("✅ Buildings:", adwa?.id, lalibela?.id, entoto?.id);

  // ── 4. Floors ─────────────────────────────────────────────
  const floorData: any[] = [];
  const floorBuildings = [
    { building: adwa, count: 4 },
    { building: lalibela, count: 3 },
    { building: entoto, count: 3 },
  ];
  for (const { building, count } of floorBuildings) {
    for (let i = 1; i <= count; i++) {
      floorData.push({ buildingId: building.id, floorName: `Floor ${i}`, floorNumber: i, description: `Level ${i} of ${building.buildingName}` });
    }
  }
  const floors = await db.insert(floorsTable).values(floorData).onConflictDoNothing().returning();
  console.log("✅ Floors:", floors.length);

  // ── 5. Room Categories ────────────────────────────────────
  const categories = ["Standard","Deluxe","Executive","Superior","Premium","Suite","Family","Presidential"];
  const catRows = await db.insert(roomCategoriesTable).values(
    categories.map((name, i) => ({ name, description: `${name} category rooms`, sortOrder: i + 1 }))
  ).onConflictDoNothing().returning();
  const allCats = catRows.length ? catRows : await db.select().from(roomCategoriesTable).where(eq(roomCategoriesTable.isActive, true));
  const catMap = Object.fromEntries(allCats.map(c => [c.name, c.id]));
  console.log("✅ Room Categories:", allCats.length);

  // ── 6. Bed Types ──────────────────────────────────────────
  const bedTypeData = [
    { name: "Single", description: "Single bed, suitable for 1 person", capacity: 1 },
    { name: "Twin", description: "Two single beds", capacity: 2 },
    { name: "Double", description: "Standard double bed", capacity: 2 },
    { name: "Queen", description: "Queen size bed", capacity: 2 },
    { name: "King", description: "King size bed", capacity: 2 },
    { name: "Bunk", description: "Bunk beds for families", capacity: 2 },
    { name: "Sofa Bed", description: "Sofa that converts to a bed", capacity: 1 },
  ];
  const bedRows = await db.insert(bedTypesTable).values(bedTypeData.map((b, i) => ({ ...b, sortOrder: i + 1 }))).onConflictDoNothing().returning();
  const allBeds = bedRows.length ? bedRows : await db.select().from(bedTypesTable).where(eq(bedTypesTable.isActive, true));
  const bedMap = Object.fromEntries(allBeds.map(b => [b.name, b.id]));
  console.log("✅ Bed Types:", allBeds.length);

  // ── 7. Room Amenities ─────────────────────────────────────
  const amenityData = [
    { name: "Television", icon: "tv", category: "technology" },
    { name: "WiFi", icon: "wifi", category: "technology" },
    { name: "Air Conditioner", icon: "wind", category: "comfort" },
    { name: "Mini Bar", icon: "wine", category: "food_beverage" },
    { name: "Balcony", icon: "sunrise", category: "view" },
    { name: "Bathtub", icon: "bath", category: "bathroom" },
    { name: "Hair Dryer", icon: "zap", category: "bathroom" },
    { name: "Coffee Machine", icon: "coffee", category: "food_beverage" },
    { name: "Telephone", icon: "phone", category: "technology" },
    { name: "Safe Box", icon: "lock", category: "comfort" },
    { name: "Iron", icon: "shirt", category: "comfort" },
    { name: "Kitchen", icon: "utensils", category: "food_beverage" },
    { name: "Microwave", icon: "square", category: "food_beverage" },
    { name: "Refrigerator", icon: "thermometer", category: "food_beverage" },
    { name: "Ocean View", icon: "waves", category: "view" },
    { name: "City View", icon: "building-2", category: "view" },
    { name: "Garden View", icon: "flower", category: "view" },
    { name: "Swimming Pool Access", icon: "droplets", category: "recreation" },
    { name: "Parking", icon: "car", category: "other" },
    { name: "Jacuzzi", icon: "bath", category: "bathroom" },
  ];
  const amenRows = await db.insert(roomAmenitiesTable).values(amenityData.map((a, i) => ({ ...a, sortOrder: i + 1 } as any))).onConflictDoNothing().returning();
  const allAmen = amenRows.length ? amenRows : await db.select().from(roomAmenitiesTable).where(eq(roomAmenitiesTable.isActive, true));
  const amenMap = Object.fromEntries(allAmen.map(a => [a.name, a.id]));
  console.log("✅ Amenities:", allAmen.length);

  // ── 8. Room Types (extend existing) ───────────────────────
  const existingTypes = await db.select().from(roomTypesTable).where(eq(roomTypesTable.isActive, true));
  const typeMap = Object.fromEntries(existingTypes.map(t => [t.name, t.id]));
  if (!typeMap["Standard"]) {
    const newTypes = [
      { name: "Standard", description: "Comfortable standard room", basePrice: "2500.00", maximumAdults: 2, maximumChildren: 1 },
      { name: "Deluxe", description: "Spacious deluxe room with city view", basePrice: "4500.00", maximumAdults: 2, maximumChildren: 2 },
      { name: "Executive", description: "Business executive room", basePrice: "6500.00", maximumAdults: 2, maximumChildren: 1 },
      { name: "Suite", description: "Luxury suite with separate living area", basePrice: "12000.00", maximumAdults: 3, maximumChildren: 2 },
      { name: "Family", description: "Spacious family room", basePrice: "8000.00", maximumAdults: 4, maximumChildren: 3 },
      { name: "Presidential", description: "Presidential suite — ultimate luxury", basePrice: "35000.00", maximumAdults: 4, maximumChildren: 2 },
    ];
    const typeRows = await db.insert(roomTypesTable).values(newTypes.map(t => ({ ...t, maxOccupancy: String(t.maximumAdults + t.maximumChildren) }))).onConflictDoNothing().returning();
    typeRows.forEach(t => { typeMap[t.name] = t.id; });
  }
  console.log("✅ Room Types:", Object.keys(typeMap).length);

  // ── 9. 120 Rooms ──────────────────────────────────────────
  // Get all floors with building context
  const allFloors = await db.select({
    id: floorsTable.id, floorNumber: floorsTable.floorNumber,
    buildingId: floorsTable.buildingId,
  }).from(floorsTable).where(eq(floorsTable.isActive, true));
  const adwaFloors = allFloors.filter(f => f.buildingId === adwa.id);
  const lalibelaFloors = allFloors.filter(f => f.buildingId === lalibela.id);
  const entotoFloors = allFloors.filter(f => f.buildingId === entoto.id);

  const views = ["City View", "Garden View", "Mountain View", "Courtyard View"];
  const statuses: schema.RoomStatus[] = ["available", "occupied", "reserved", "cleaning", "available", "available", "available", "available"];

  const roomsToInsert: any[] = [];

  // Adwa Tower: 50 rooms (floors 1-4, ~12-13 per floor)
  const adwaRoomConfigs = [
    { type: "Standard", cat: "Standard", bed: "Twin", priceBase: 2800 },
    { type: "Deluxe", cat: "Deluxe", bed: "Queen", priceBase: 4800 },
    { type: "Executive", cat: "Executive", bed: "King", priceBase: 6800 },
    { type: "Suite", cat: "Suite", bed: "King", priceBase: 13000 },
    { type: "Presidential", cat: "Presidential", bed: "King", priceBase: 36000 },
  ];
  let roomNum = 100;
  for (const fl of adwaFloors) {
    for (let r = 1; r <= 12; r++) {
      roomNum++;
      const cfg = adwaRoomConfigs[Math.floor(Math.random() * adwaRoomConfigs.length)];
      roomsToInsert.push({
        number: `A${fl.floorNumber}0${r}`,
        roomName: `${cfg.cat} Room A${fl.floorNumber}0${r}`,
        roomCode: `NGH-A${fl.floorNumber}0${r}`,
        floor: String(fl.floorNumber),
        floorId: fl.id,
        buildingId: adwa.id,
        roomTypeId: typeMap[cfg.type] ?? existingTypes[0]?.id ?? Object.values(typeMap)[0],
        roomCategoryId: catMap[cfg.cat] ?? Object.values(catMap)[0],
        bedTypeId: bedMap[cfg.bed] ?? Object.values(bedMap)[0],
        capacityAdults: Math.floor(Math.random() * 2) + 1,
        capacityChildren: 1,
        size: String(25 + Math.floor(Math.random() * 40)),
        view: views[Math.floor(Math.random() * views.length)],
        smokingAllowed: Math.random() < 0.1,
        description: `${cfg.cat} room on floor ${fl.floorNumber} of Adwa Tower with premium amenities.`,
        currentPrice: String(cfg.priceBase + Math.floor(Math.random() * 500)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }

  // Lalibela Wing: 40 rooms
  const lalibelaConfigs = [
    { type: "Standard", cat: "Standard", bed: "Double", priceBase: 2500 },
    { type: "Deluxe", cat: "Deluxe", bed: "Queen", priceBase: 4500 },
    { type: "Family", cat: "Family", bed: "King", priceBase: 8200 },
    { type: "Suite", cat: "Superior", bed: "King", priceBase: 7500 },
  ];
  for (const fl of lalibelaFloors) {
    for (let r = 1; r <= 13; r++) {
      const cfg = lalibelaConfigs[Math.floor(Math.random() * lalibelaConfigs.length)];
      roomsToInsert.push({
        number: `L${fl.floorNumber}0${r}`,
        roomName: `${cfg.cat} Room L${fl.floorNumber}0${r}`,
        roomCode: `NGH-L${fl.floorNumber}0${r}`,
        floor: String(fl.floorNumber),
        floorId: fl.id,
        buildingId: lalibela.id,
        roomTypeId: typeMap[cfg.type] ?? existingTypes[0]?.id ?? Object.values(typeMap)[0],
        roomCategoryId: catMap[cfg.cat] ?? Object.values(catMap)[0],
        bedTypeId: bedMap[cfg.bed] ?? Object.values(bedMap)[0],
        capacityAdults: 2,
        capacityChildren: cfg.cat === "Family" ? 2 : 1,
        size: String(22 + Math.floor(Math.random() * 30)),
        view: views[Math.floor(Math.random() * views.length)],
        smokingAllowed: false,
        description: `${cfg.cat} room on floor ${fl.floorNumber} of Lalibela Wing.`,
        currentPrice: String(cfg.priceBase + Math.floor(Math.random() * 400)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }

  // Entoto House: 30 rooms
  const entotoConfigs = [
    { type: "Executive", cat: "Executive", bed: "King", priceBase: 6500 },
    { type: "Standard", cat: "Premium", bed: "Queen", priceBase: 5500 },
    { type: "Suite", cat: "Suite", bed: "King", priceBase: 12500 },
  ];
  for (const fl of entotoFloors) {
    for (let r = 1; r <= 10; r++) {
      const cfg = entotoConfigs[Math.floor(Math.random() * entotoConfigs.length)];
      roomsToInsert.push({
        number: `E${fl.floorNumber}0${r}`,
        roomName: `${cfg.cat} Room E${fl.floorNumber}0${r}`,
        roomCode: `NGH-E${fl.floorNumber}0${r}`,
        floor: String(fl.floorNumber),
        floorId: fl.id,
        buildingId: entoto.id,
        roomTypeId: typeMap[cfg.type] ?? existingTypes[0]?.id ?? Object.values(typeMap)[0],
        roomCategoryId: catMap[cfg.cat] ?? Object.values(catMap)[0],
        bedTypeId: bedMap[cfg.bed] ?? Object.values(bedMap)[0],
        capacityAdults: 2,
        capacityChildren: 1,
        size: String(30 + Math.floor(Math.random() * 25)),
        view: "City View",
        smokingAllowed: false,
        description: `${cfg.cat} room on floor ${fl.floorNumber} of Entoto House — business-focused with premium connectivity.`,
        currentPrice: String(cfg.priceBase + Math.floor(Math.random() * 600)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
  }

  // Insert rooms in batches to avoid unique constraint issues
  const inserted: any[] = [];
  for (const room of roomsToInsert.slice(0, 120)) {
    try {
      const [r] = await db.insert(roomsTable).values(room).onConflictDoNothing().returning();
      if (r) inserted.push(r);
    } catch {}
  }
  console.log(`✅ Rooms: ${inserted.length}`);

  // ── 10. Assign amenities to first 20 rooms ────────────────
  const baseAmenities = ["WiFi", "Television", "Air Conditioner"].map(n => amenMap[n]).filter(Boolean);
  for (const room of inserted.slice(0, 20)) {
    const extra = ["Mini Bar", "Balcony", "Bathtub", "Coffee Machine", "Safe Box"]
      .filter(() => Math.random() > 0.5)
      .map(n => amenMap[n]).filter(Boolean);
    const all = [...new Set([...baseAmenities, ...extra])];
    try {
      await db.insert(roomAmenityAssignmentsTable).values(all.map(amenityId => ({ roomId: room.id, amenityId }))).onConflictDoNothing();
    } catch {}
  }
  console.log("✅ Amenity assignments done");

  // ── 11. Base pricing for first 20 rooms ───────────────────
  for (const room of inserted.slice(0, 20)) {
    const base = parseFloat(room.currentPrice ?? "3000");
    try {
      await db.insert(roomPricingTable).values([
        { roomId: room.id, pricingType: "base", price: String(base) },
        { roomId: room.id, pricingType: "weekend", price: String((base * 1.2).toFixed(2)) },
        { roomId: room.id, pricingType: "vip", price: String((base * 0.9).toFixed(2)), discountPercent: "10" },
      ]).onConflictDoNothing();
    } catch {}
  }
  console.log("✅ Base pricing done");

  await pool.end();
  console.log("\n✨ Phase 2 seed complete!");
}

seed().catch(e => { console.error(e); process.exit(1); });
