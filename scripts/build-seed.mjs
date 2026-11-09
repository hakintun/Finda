/**
 * builds data/seed.json  —  Member 3 · Task 1 (Map PH markets & load starter products)
 *
 * Run:  node scripts/build-seed.mjs
 *
 * Generates, deterministically:
 *   - 6 Port Harcourt market zones (with polygon boundaries for pin validation)
 *   - a canonical product dictionary (80+ real PH items — grow this to 2,000 before launch) with search aliases
 *   - 32 realistic sample shops spread across the 6 zones
 *   - ~180 listings with realistic prices + a mix of Fresh / Aging / Stale / Expired
 *   - seeded admin work queues (verification requests, reports, pin flags, banned items)
 *
 * IMPORTANT: timestamps are stored as RELATIVE offsets (hours ago), and are
 * turned into real dates the first time the app runs (lib/db.ts). That keeps the
 * demo data looking fresh forever instead of decaying / expiring.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/seed.json");

/* ------------------------------------------------------------------ */
/* deterministic PRNG so every run produces the same demo dataset      */
/* ------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261106);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => Math.round(a + rand() * (b - a));

/* ------------------------------------------------------------------ */
/* 1. ZONES — real Port Harcourt market areas                          */
/*    boundary = approximate polygon used to validate seller pins      */
/* ------------------------------------------------------------------ */
const ZONES = [
  {
    id: "mile1",
    name: "Mile 1 Market",
    cluster: "Mile 1",
    lat: 4.8098, lng: 6.9901,
    radiusKm: 0.9,
    landmarks: ["Beside First Bank, Aggrey Road", "Opposite Mile 1 Police Station", "Line 4, near the water stand", "By Ojoto Street junction"],
    boundary: polygon(4.8098, 6.9901, 0.9),
  },
  {
    id: "mile3",
    name: "Mile 3 Market",
    cluster: "Mile 3",
    lat: 4.8352, lng: 6.9951,
    radiusKm: 1.1,
    landmarks: ["Km 3 Ikwerre Road", "Beside Mile 3 Post Office", "Opposite Slaughter Market", "By Rumuokwurusi junction"],
    boundary: polygon(4.8352, 6.9951, 1.1),
  },
  {
    id: "creek-road",
    name: "Creek Road",
    cluster: "Creek Road",
    lat: 4.8078, lng: 7.0022,
    radiusKm: 0.8,
    landmarks: ["Beside First Bank, Creek Road", "Opposite Creek Road Market gate", "By Bonny Street junction", "Near the waterfront jetty"],
    boundary: polygon(4.8078, 7.0022, 0.8),
  },
  {
    id: "ada-george",
    name: "Ada George",
    cluster: "Ada George",
    lat: 4.8581, lng: 6.9762,
    radiusKm: 1.4,
    landmarks: ["No. 15 Ada George Road, by Iwofe junction", "Opposite Ada George Police Post", "Beside NNPC filling station, Ada George", "By Redeemed Church, Ada George"],
    boundary: polygon(4.8581, 6.9762, 1.4),
  },
  {
    id: "rumuokoro",
    name: "Rumuokoro",
    cluster: "Rumuokoro",
    lat: 4.8752, lng: 6.9351,
    radiusKm: 1.5,
    landmarks: ["Rumuokoro Market, line 2", "Beside Rumuokoro Park", "Opposite Air Force base gate", "By Igwuruta junction"],
    boundary: polygon(4.8752, 6.9351, 1.5),
  },
  {
    id: "choba",
    name: "Choba / Uniport",
    cluster: "Choba",
    lat: 4.8979, lng: 6.9081,
    radiusKm: 1.2,
    landmarks: ["Uniport main gate, Choba", "Beside Choba market square", "Opposite Choba Police Station", "By Alakahia junction"],
    boundary: polygon(4.8979, 6.9081, 1.2),
  },
];

function polygon(lat, lng, radiusKm) {
  // rough square-ish polygon: 1 deg lat ≈ 110.6 km, 1 deg lng ≈ 110.6*cos(lat) km
  const dLat = radiusKm / 110.6;
  const dLng = radiusKm / (110.6 * Math.cos((lat * Math.PI) / 180));
  return [
    { lat: lat + dLat, lng: lng - dLng },
    { lat: lat + dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng - dLng },
  ];
}

/* ------------------------------------------------------------------ */
/* 2. PRODUCT DICTIONARY — the canonical names sellers pick from       */
/*    prices are typical PH market prices, stored in KOBO (x100)        */
/* ------------------------------------------------------------------ */
const P = (id, name, category, naira, aliases = [], unit = "each") => ({
  id, canonical_name: name, category, unit,
  typical_price_kobo: Math.round(naira * 100),
  aliases,
});

const PRODUCTS = [
  // ---- generators & power
  P("gen-1kva", "1KVA Generator", "Generators", 185000, ["gen", "jennerator", "small generator", "i better pass my neighbour", "1kva gen"]),
  P("gen-75kva", "7.5KVA Generator", "Generators", 620000, ["big gen", "7.5 kva", "generator set", "gen 7.5"]),
  P("gen-35kva", "3.5KVA Generator", "Generators", 385000, ["3.5 gen", "medium gen"]),
  P("gen-oil", "Generator Engine Oil 1L", "Generators", 4200, ["gen oil", "engine oil small"]),
  P("gen-plug", "Generator Spark Plug", "Generators", 2500, ["plug", "sparkplug"]),
  P("gen-fuel-pipe", "Generator Fuel Pipe", "Generators", 1800, ["fuel hose", "gen hose"]),
  // ---- phones & accessories
  P("ph-usbc", "USB-C Charging Cable", "Phone Accessories", 1500, ["usb c", "type c cable", "charger cord"]),
  P("ph-tecno-charger", "Tecno Phone Charger", "Phone Accessories", 2500, ["tecno charger", "tecno charge"]),
  P("ph-iphone-screen", "iPhone 13 Screen Replacement", "Phone Accessories", 58000, ["iphone screen", "iphone 13 glass"]),
  P("ph-powerbank", "Power Bank 20000mAh", "Phone Accessories", 12500, ["power bank", "powerbank", "pawa bank"]),
  P("ph-earpiece", "Wired Earpiece", "Phone Accessories", 2000, ["earpiece", "earphones", "headset"]),
  P("ph-case", "Phone Pouch", "Phone Accessories", 1800, ["pouch", "phone case", "cover"]),
  P("ph-screen-guard", "Screen Protector", "Phone Accessories", 1000, ["tempered glass", "screen guard"]),
  P("ph-memory-card", "Memory Card 32GB", "Phone Accessories", 6500, ["memory card", "sd card"]),
  // ---- electronics & appliances
  P("el-tv42", '42" Smart TV', "Electronics", 245000, ["tv", "television", "flat screen", "smart tv"]),
  P("el-tv32", '32" LED TV', "Electronics", 135000, ["small tv", "led tv"]),
  P("el-freezer", "Deep Freezer 200L", "Electronics", 285000, ["deep freezer", "freezer", "chest freezer"]),
  P("el-fridge", "Double Door Fridge", "Electronics", 340000, ["fridge", "refrigerator", "frij"]),
  P("el-ac15", "1.5HP Air Conditioner", "Electronics", 385000, ["ac", "air con", "air conditioner", "split ac", "1.5hp ac"]),
  P("el-fan-rechargeable", "Rechargeable Standing Fan", "Electronics", 28500, ["standing fan", "fan", "rechargeable fan"]),
  P("el-blender", "Blender", "Electronics", 18500, ["blender", "blenda", "liquidizer"]),
  P("el-kettle", "Electric Kettle", "Electronics", 9500, ["kettle", "electric kettle"]),
  P("el-iron", "Pressing Iron", "Electronics", 8500, ["iron", "pressing iron"]),
  P("el-home-theatre", "Home Theatre System", "Electronics", 78000, ["home theatre", "sound system", "speaker"]),
  P("el-microwave", "Microwave Oven", "Electronics", 65000, ["microwave", "oven"]),
  P("el-dvd", "DVD Player", "Electronics", 22000, ["dvd"]),
  // ---- foodstuff
  P("fd-rice50", "50kg Bag of Rice", "Foodstuff", 92000, ["rice", "bag of rice", "50kg rice", "long grain"]),
  P("fd-rice25", "25kg Bag of Rice", "Foodstuff", 47000, ["half bag rice", "25kg rice"]),
  P("fd-beans", "Beans 5kg", "Foodstuff", 9500, ["beans", "bean", "bins"]),
  P("fd-garri", "Garri 5kg", "Foodstuff", 4500, ["garri", "gari", "cassava flakes"]),
  P("fd-palm-oil", "Palm Oil 5L", "Foodstuff", 7800, ["palm oil", "palm oyel", "red oil"]),
  P("fd-groundnut-oil", "Groundnut Oil 5L", "Foodstuff", 12500, ["groundnut oil", "vegetable oil", "oil"]),
  P("fd-indomie", "Indomie Carton (40 packs)", "Foodstuff", 9800, ["indomie", "indomine", "noodles", "indomie carton"]),
  P("fd-tomato", "Tomato Paste Carton", "Foodstuff", 14500, ["tomato paste", "tomatos", "tin tomato"]),
  P("fd-onion", "Onions 10kg Bag", "Foodstuff", 12500, ["onion", "onions", "alubosa"]),
  P("fd-crayfish", "Crayfish 1kg", "Foodstuff", 8800, ["crayfish", "crafish"]),
  P("fd-pepper", "Dry Pepper 1kg", "Foodstuff", 6500, ["pepper", "dry pepper", "shombo"]),
  P("fd-yam", "Yam Tubers (5 pieces)", "Foodstuff", 11000, ["yam", "ji"]),
  P("fd-eggs", "Crate of Eggs", "Foodstuff", 5200, ["egg", "eggs", "crate of egg"]),
  P("fd-chicken", "Frozen Chicken 1kg", "Foodstuff", 6200, ["chicken", "frozen chicken"]),
  P("fd-fish", "Titus Fish (carton)", "Foodstuff", 42000, ["fish", "titus", "mackerel"]),
  // ---- provisions & groceries
  P("pv-peak", "Peak Milk Carton (24 tins)", "Provisions", 26500, ["peak milk", "milk", "peak"]),
  P("pv-milo", "Milo Refill 500g", "Provisions", 5200, ["milo", "milo refill"]),
  P("pv-sugar", "Sugar 50kg Bag", "Provisions", 68000, ["sugar", "sugar bag"]),
  P("pv-detergent", "Detergent 10kg", "Provisions", 14500, ["detergent", "omo", "washing soap"]),
  P("pv-tissue", "Tissue Paper Carton", "Provisions", 18500, ["tissue", "toilet roll", "tissue carton"]),
  P("pv-water", "Bottled Water Pack (12)", "Provisions", 2400, ["water", "bottle water", "eva water"]),
  P("pv-malt", "Malt Drink Crate", "Provisions", 8200, ["malt", "maltina", "malt drink"]),
  P("pv-bournvita", "Bournvita Refill 500g", "Provisions", 4800, ["bournvita", "bornvita", "bov"]),
  P("pv-golden-morn", "Golden Morn 1kg", "Provisions", 3600, ["golden morn", "goldenmorn"]),
  P("pv-seasoning", "Knorr Seasoning Cube Carton", "Provisions", 9800, ["knorr", "maggi", "seasoning"]),
  P("pv-toothpaste", "Toothpaste Carton", "Provisions", 12500, ["toothpaste", "colgate", "close up"]),
  P("pv-soap", "Bar Soap Carton", "Provisions", 16500, ["soap", "bar soap", "lux"]),
  // ---- gas
  P("gas-125", "12.5kg Cooking Gas Refill", "Gas", 14500, ["gas", "cooking gas", "gas refill", "12.5kg gas"]),
  P("gas-6", "6kg Cooking Gas Refill", "Gas", 8200, ["small gas", "6kg gas"]),
  P("gas-cyl-125", "12.5kg Gas Cylinder (new)", "Gas", 32000, ["cylinder", "gas cylinder"]),
  P("gas-cyl-50", "50kg Gas Cylinder", "Gas", 78000, ["big cylinder", "50kg cylinder"]),
  P("gas-hose", "Gas Hose & Regulator Set", "Gas", 6500, ["hose", "regulator", "gas head"]),
  P("gas-burner", "Two-Burner Gas Cooker", "Gas", 28500, ["gas cooker", "burner", "cooker"]),
  // ---- car parts
  P("car-brake", "Toyota Corolla Brake Pad", "Car Parts", 14500, ["brake pad", "break pad", "brake"]),
  P("car-headlamp", "Camry Headlamp", "Car Parts", 32000, ["headlamp", "head light", "headlight"]),
  P("car-battery", "Car Battery 75Ah", "Car Parts", 85000, ["battery", "car battery", "batery"]),
  P("car-tyre", "Tyre 205/55 R16", "Car Parts", 62000, ["tyre", "tire", "taya"]),
  P("car-oil", "Engine Oil 5L", "Car Parts", 18500, ["engine oil", "mobil oil", "oil 5l"]),
  P("car-wiper", "Windscreen Wiper Pair", "Car Parts", 6500, ["wiper", "wiper blade"]),
  P("car-alternator", "Alternator (Corolla)", "Car Parts", 68000, ["alternator", "alternata"]),
  P("car-fuel-pump", "Fuel Pump", "Car Parts", 42000, ["fuel pump", "pump"]),
  P("car-side-mirror", "Side Mirror", "Car Parts", 16500, ["side mirror", "mirror"]),
  // ---- building materials
  P("bm-cement", "50kg Dangote Cement", "Building Materials", 11500, ["cement", "dangote", "simiti"]),
  P("bm-iron12", "Iron Rod 12mm", "Building Materials", 9800, ["iron rod", "12mm rod", "rods"]),
  P("bm-roofing", "Roofing Sheet (per metre)", "Building Materials", 4200, ["roofing sheet", "zinc", "roof sheet"]),
  P("bm-paint", "Emulsion Paint 20L", "Building Materials", 38500, ["paint", "emulsion", "pent"]),
  P("bm-pvc", "PVC Pipe 4 inch", "Building Materials", 5500, ["pvc", "pipe", "pipes"]),
  P("bm-ceiling", "Ceiling Board (per piece)", "Building Materials", 3800, ["ceiling board", "ceiling", "pop"]),
  P("bm-tiles", "Floor Tiles (per carton)", "Building Materials", 12500, ["tiles", "tile", "floor tiles"]),
  P("bm-nails", "Nails 2 inch (carton)", "Building Materials", 8500, ["nails", "nail"]),
  // ---- services
  P("sv-tailor", "Tailoring (per outfit)", "Services", 12000, ["tailor", "sewing", "tailoring"]),
  P("sv-phone-repair", "Phone Screen Repair", "Services", 15000, ["phone repair", "screen repair", "fix phone"]),
  P("sv-vulcanizer", "Vulcanizing (per tyre)", "Services", 1500, ["vulcanizer", "vulcaniser", "tyre repair"]),
  P("sv-fridge-repair", "Fridge Repair", "Services", 18000, ["fridge repair", "fix fridge", "freezer repair"]),
  P("sv-gen-repair", "Generator Repair", "Services", 15000, ["gen repair", "repair generator", "fix gen"]),
  P("sv-barbing", "Barbing (haircut)", "Services", 3000, ["barbing", "haircut", "barb"]),
];

/* ------------------------------------------------------------------ */
/* 3. 32 REALISTIC SHOPS across the 6 zones                            */
/* ------------------------------------------------------------------ */
const SHOP_BLUEPRINTS = [
  // --- MILE 1 -----------------------------------------------------------------
  { name: "Ngozi Provisions", zone: "mile1", type: "stall", cat: "Provisions", owner: "Ngozi Okafor", tier: "phone", acc: 0.94,
    items: [["pv-peak", 1.02], ["pv-milo", 1.0], ["pv-golden-morn", 0.98], ["pv-bournvita", 1.03], ["pv-seasoning", 1.0], ["fd-indomie", 0.97]] },
  { name: "Emeka Electronics", zone: "mile1", type: "shop", cat: "Electronics", owner: "Emeka Nwosu", tier: "visit", acc: 0.97,
    items: [["el-tv32", 1.0], ["el-dvd", 0.95], ["el-home-theatre", 1.04], ["el-fan-rechargeable", 0.96], ["el-iron", 0.98]] },
  { name: "Blessing Phone Accessories", zone: "mile1", type: "stall", cat: "Phone Accessories", owner: "Blessing Etim", tier: "id", acc: 0.91,
    items: [["ph-usbc", 0.95], ["ph-tecno-charger", 1.0], ["ph-powerbank", 1.05], ["ph-screen-guard", 0.9], ["ph-memory-card", 1.0], ["ph-case", 1.0]] },
  { name: "Alhaji Gas Point", zone: "mile1", type: "shop", cat: "Gas", owner: "Musa Alhaji", tier: "phone", acc: 0.88,
    items: [["gas-125", 0.98], ["gas-6", 1.0], ["gas-hose", 1.02], ["gas-cyl-125", 1.0]] },
  { name: "Chukwudi Generators", zone: "mile1", type: "stall", cat: "Generators", owner: "Chukwudi Eze", tier: "visit", acc: 0.96,
    items: [["gen-1kva", 0.97], ["gen-35kva", 1.0], ["gen-75kva", 1.02], ["gen-oil", 1.0], ["gen-plug", 1.0]] },
  { name: "Mama Chioma Foodstuff", zone: "mile1", type: "stall", cat: "Foodstuff", owner: "Chioma Amadi", tier: "phone", acc: 0.9,
    items: [["fd-rice50", 1.0], ["fd-beans", 0.94], ["fd-garri", 0.92], ["fd-palm-oil", 1.0], ["fd-crayfish", 1.03], ["fd-pepper", 1.0]] },
  { name: "Sunny Auto Parts", zone: "mile1", type: "shop", cat: "Car Parts", owner: "Sunday Okoro", tier: "phone", acc: 0.85,
    items: [["car-brake", 1.0], ["car-oil", 0.97], ["car-wiper", 1.0], ["car-side-mirror", 1.04]] },
  // --- MILE 3 -----------------------------------------------------------------
  { name: "Godwin Building Materials", zone: "mile3", type: "shop", cat: "Building Materials", owner: "Godwin Okafor", tier: "visit", acc: 0.93,
    items: [["bm-cement", 1.0], ["bm-iron12", 0.98], ["bm-roofing", 1.02], ["bm-nails", 1.0], ["bm-pvc", 0.96]] },
  { name: "Ify Fabrics & Tailoring", zone: "mile3", type: "service", cat: "Services", owner: "Ifeoma Nwankwo", tier: "id", acc: 0.95,
    items: [["sv-tailor", 1.0], ["sv-barbing", 0.9]] },
  { name: "Trust Computer & Phones", zone: "mile3", type: "shop", cat: "Phone Accessories", owner: "Tunde Bakare", tier: "phone", acc: 0.87,
    items: [["ph-iphone-screen", 1.03], ["ph-usbc", 1.0], ["ph-powerbank", 0.96], ["sv-phone-repair", 1.0]] },
  { name: "Mile 3 Cement Depot", zone: "mile3", type: "shop", cat: "Building Materials", owner: "Hassan Bello", tier: "phone", acc: 0.92,
    items: [["bm-cement", 0.97], ["bm-ceiling", 1.0], ["bm-tiles", 1.02], ["bm-paint", 1.0]] },
  { name: "Uche Fridge Repairs", zone: "mile3", type: "service", cat: "Services", owner: "Uche Anyanwu", tier: "phone", acc: 0.89,
    items: [["sv-fridge-repair", 1.0], ["sv-gen-repair", 0.95]] },
  { name: "De Young Electronics", zone: "mile3", type: "shop", cat: "Electronics", owner: "Chinedu Obi", tier: "visit", acc: 0.98,
    items: [["el-tv42", 1.0], ["el-ac15", 1.02], ["el-freezer", 1.0], ["el-fridge", 0.98], ["el-microwave", 1.0], ["el-blender", 0.95]] },
  // --- CREEK ROAD -------------------------------------------------------------
  { name: "Creek Road Phone Hub", zone: "creek-road", type: "stall", cat: "Phone Accessories", owner: "Ibrahim Sule", tier: "visit", acc: 0.96,
    items: [["ph-iphone-screen", 1.0], ["ph-tecno-charger", 0.97], ["ph-powerbank", 1.0], ["ph-earpiece", 0.95], ["ph-memory-card", 0.98], ["ph-screen-guard", 0.95]] },
  { name: "Aunty Rose Provisions", zone: "creek-road", type: "stall", cat: "Provisions", owner: "Rose Adeyemi", tier: "phone", acc: 0.91,
    items: [["pv-tissue", 1.0], ["pv-soap", 0.98], ["pv-detergent", 1.0], ["pv-water", 0.9], ["pv-malt", 1.02]] },
  { name: "Port Gas & Cylinder", zone: "creek-road", type: "shop", cat: "Gas", owner: "Victor Amadi", tier: "phone", acc: 0.86,
    items: [["gas-125", 1.03], ["gas-cyl-50", 1.0], ["gas-burner", 0.98], ["gas-hose", 1.0]] },
  { name: "Bright Electronics Creek", zone: "creek-road", type: "shop", cat: "Electronics", owner: "Bright Osas", tier: "phone", acc: 0.83,
    items: [["el-tv32", 0.98], ["el-kettle", 0.95], ["el-iron", 1.0], ["el-blender", 1.03]] },
  { name: "Okoro Car Parts", zone: "creek-road", type: "shop", cat: "Car Parts", owner: "Peter Okoro", tier: "id", acc: 0.94,
    items: [["car-battery", 1.0], ["car-tyre", 0.99], ["car-headlamp", 1.02], ["car-alternator", 1.0], ["car-fuel-pump", 0.97]] },
  { name: "Mama Eka Soup Market", zone: "creek-road", type: "stall", cat: "Foodstuff", owner: "Ekaette Bassey", tier: "phone", acc: 0.9,
    items: [["fd-crayfish", 0.95], ["fd-pepper", 0.92], ["fd-fish", 1.0], ["fd-palm-oil", 0.98], ["fd-onion", 1.0]] },
  // --- ADA GEORGE -------------------------------------------------------------
  { name: "Ada George Superstore", zone: "ada-george", type: "shop", cat: "Provisions", owner: "Grace Nwosu", tier: "visit", acc: 0.97,
    items: [["pv-peak", 1.0], ["pv-sugar", 0.99], ["pv-detergent", 1.0], ["pv-toothpaste", 0.97], ["pv-soap", 1.0], ["pv-tissue", 1.02]] },
  { name: "Kelvin Phone World", zone: "ada-george", type: "shop", cat: "Phone Accessories", owner: "Kelvin Udom", tier: "phone", acc: 0.88,
    items: [["ph-usbc", 1.0], ["ph-powerbank", 0.94], ["ph-case", 0.92], ["sv-phone-repair", 1.0]] },
  { name: "Ada George Gas Fill", zone: "ada-george", type: "shop", cat: "Gas", owner: "Nkem Eze", tier: "phone", acc: 0.9,
    items: [["gas-125", 0.96], ["gas-6", 0.95], ["gas-burner", 1.0]] },
  { name: "Grace Electronics Ada George", zone: "ada-george", type: "shop", cat: "Electronics", owner: "Grace Ogbonna", tier: "phone", acc: 0.84,
    items: [["el-fan-rechargeable", 1.0], ["el-tv32", 1.04], ["el-freezer", 0.99], ["el-ac15", 0.97]] },
  { name: "Rumuola Tailors", zone: "ada-george", type: "service", cat: "Services", owner: "Samuel Nwosu", tier: "phone", acc: 0.92,
    items: [["sv-tailor", 0.92], ["sv-barbing", 1.0]] },
  { name: "Emmanuella Foodstuff", zone: "ada-george", type: "stall", cat: "Foodstuff", owner: "Emmanuella John", tier: "phone", acc: 0.87,
    items: [["fd-rice25", 1.0], ["fd-beans", 0.98], ["fd-garri", 0.95], ["fd-eggs", 1.0], ["fd-chicken", 1.03]] },
  // --- RUMUOKORO --------------------------------------------------------------
  { name: "Rumuokoro Building Line", zone: "rumuokoro", type: "shop", cat: "Building Materials", owner: "Ikechukwu Umeh", tier: "phone", acc: 0.85,
    items: [["bm-cement", 1.02], ["bm-iron12", 1.0], ["bm-roofing", 1.0], ["bm-tiles", 0.98]] },
  { name: "Chuks Generator Repairs", zone: "rumuokoro", type: "service", cat: "Services", owner: "Chuks Nnamdi", tier: "visit", acc: 0.95,
    items: [["sv-gen-repair", 1.0], ["gen-oil", 0.97], ["gen-plug", 1.0], ["gen-fuel-pipe", 1.0]] },
  { name: "Victory Provisions Rumuokoro", zone: "rumuokoro", type: "stall", cat: "Provisions", owner: "Victoria Bassey", tier: "phone", acc: 0.9,
    items: [["pv-water", 1.0], ["pv-malt", 0.98], ["pv-golden-morn", 1.0], ["pv-milo", 1.02]] },
  { name: "Ovie Phone Accessories", zone: "rumuokoro", type: "stall", cat: "Phone Accessories", owner: "Ovie Oghenekaro", tier: "phone", acc: 0.82,
    items: [["ph-tecno-charger", 1.0], ["ph-usbc", 1.0], ["ph-earpiece", 0.92], ["ph-screen-guard", 1.0]] },
  { name: "Rumuokoro Gas Plant", zone: "rumuokoro", type: "shop", cat: "Gas", owner: "Suleiman Yakubu", tier: "id", acc: 0.93,
    items: [["gas-125", 0.99], ["gas-cyl-125", 1.0], ["gas-6", 1.0], ["gas-hose", 1.0]] },
  // --- CHOBA / UNIPORT --------------------------------------------------------
  { name: "Choba Student Mart", zone: "choba", type: "shop", cat: "Provisions", owner: "Ada Nwankwo", tier: "phone", acc: 0.91,
    items: [["pv-golden-morn", 1.0], ["pv-bournvita", 0.98], ["pv-water", 0.95], ["fd-indomie", 0.95], ["pv-tissue", 1.0]] },
  { name: "Uniport Gate Phone Repairs", zone: "choba", type: "service", cat: "Services", owner: "Boma Wike", tier: "visit", acc: 0.96,
    items: [["sv-phone-repair", 0.95], ["ph-iphone-screen", 1.0], ["ph-usbc", 1.0], ["ph-memory-card", 1.0]] },
  { name: "Choba Fresh Foods", zone: "choba", type: "stall", cat: "Foodstuff", owner: "Ijeoma Okwu", tier: "phone", acc: 0.89,
    items: [["fd-yam", 1.0], ["fd-garri", 0.94], ["fd-beans", 1.0], ["fd-onion", 0.97], ["fd-eggs", 1.0]] },
];

const HOURS_DEFAULT = {
  mon: "8:00-18:00", tue: "8:00-18:00", wed: "8:00-18:00",
  thu: "8:00-18:00", fri: "8:00-18:00", sat: "8:00-16:00", sun: "closed",
};

/* ------------------------------------------------------------------ */
/* 4. Build the seed                                                   */
/* ------------------------------------------------------------------ */
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function jitterPrice(base, mult) {
  const naira = Math.round((base / 100) * mult / 50) * 50; // round to nearest ₦50
  return naira * 100;
}
function humanPhone(i) {
  // stable fake Nigerian numbers (0803 …)
  const prefixes = ["0803", "0806", "0813", "0703", "0906", "0816"];
  const p = prefixes[i % prefixes.length];
  const rest = String(1000000 + i * 7919).slice(-7);
  return p + rest;
}

const shops = [];
const listings = [];
const sellers = [];
const users = [];
let listingSeq = 1;

SHOP_BLUEPRINTS.forEach((bp, i) => {
  const zone = ZONES.find((z) => z.id === bp.zone);
  // pin: inside the zone polygon (small random offset inside radius)
  const dLat = (rand() - 0.5) * zone.radiusKm * 0.9 / 110.6;
  const dLng = (rand() - 0.5) * zone.radiusKm * 0.9 / (110.6 * Math.cos((zone.lat * Math.PI) / 180));
  const lat = zone.lat + dLat;
  const lng = zone.lng + dLng;

  const shopId = `shop_${String(i + 1).padStart(2, "0")}`;
  const userId = `usr_seller_${String(i + 1).padStart(2, "0")}`;
  const phone = humanPhone(i + 10);

  users.push({
    id: userId,
    phone,
    role: "seller",
    name: bp.owner,
    created_at_hours_ago: between(200, 900),
  });

  sellers.push({
    id: shopId,
    user_id: userId,
    business_name: bp.name,
    slug: slugify(bp.name),
    seller_type: bp.type,
    primary_category: bp.cat,
    zone_id: zone.id,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    landmark_text: `${pick(zone.landmarks)} — ask for ${bp.owner.split(" ")[0]}`,
    whatsapp_number: phone,
    phone,
    hours: HOURS_DEFAULT,
    verification_tier: bp.tier,          // unverified | phone | id | visit
    accuracy_score: bp.acc,
    response_rate: Math.min(0.98, 0.55 + rand() * 0.4),
    view_count_30d: between(30, 900),
    status: "active",
    created_at_hours_ago: between(200, 900),
    last_nudge_hours_ago: between(2, 40),
    owner_name: bp.owner,
  });

  shops.push({ id: shopId, name: bp.name, zone: bp.zone });

  bp.items.forEach(([pid, mult], j) => {
    const product = PRODUCTS.find((p) => p.id === pid);
    if (!product) throw new Error("Unknown product in blueprint: " + pid);

    // freshness mix: mostly fresh, some aging/stale/expired
    const roll = rand();
    let hoursAgo;
    if (roll < 0.52) hoursAgo = between(1, 40);        // Fresh  (<48h)
    else if (roll < 0.78) hoursAgo = between(50, 160); // Aging  (3–7d)
    else if (roll < 0.93) hoursAgo = between(170, 320);// Stale  (>7d)
    else hoursAgo = between(340, 400);                 // Expired(>14d)

    const stockRoll = rand();
    const stock_status = stockRoll < 0.72 ? "in" : stockRoll < 0.86 ? "low" : stockRoll < 0.94 ? "unconfirmed" : "out";

    listings.push({
      id: `lst_${String(listingSeq++).padStart(4, "0")}`,
      seller_id: shopId,
      product_id: pid,
      title_as_listed: product.canonical_name,
      category: product.category,
      price_kobo: jitterPrice(product.typical_price_kobo, mult),
      price_negotiable: rand() < 0.25,
      unit: product.unit,
      stock_status,
      condition: rand() < 0.9 ? "new" : "used",
      photo_url: null,
      confirmed_at_hours_ago: hoursAgo,
      evidence: pick(["self", "self", "self", "agent", "buyer_report"]),
      status: "active",
      views_7d: between(0, 120),
      report_count: 0,
      created_at_hours_ago: hoursAgo + between(24, 600),
    });
  });
});

/* --- demo buyers + demo admin -------------------------------------- */
users.push({ id: "usr_admin_demo", phone: "08000000000", role: "admin", name: "Member 3 (Admin)", created_at_hours_ago: 900 });
users.push({ id: "usr_buyer_demo", phone: "08111111111", role: "buyer", name: "Chinedu (demo buyer)", created_at_hours_ago: 400 });

/* --- ADMIN QUEUES: seeded so the Control Center is not empty ------ */
const verification_requests = [
  {
    id: "ver_0001", seller_id: "shop_02", tier_requested: "visit",
    note: "Stall photographed, GPS captured at the shop. Wants the Verified stall badge.",
    evidence_photo_url: null, agent_name: "Field agent — Tobias",
    state: "pending", created_at_hours_ago: 26, reviewed_by: null, reviewed_at_hours_ago: null, rejection_reason: null,
  },
  {
    id: "ver_0002", seller_id: "shop_15", tier_requested: "id",
    note: "Uploaded NIN slip. Name on ID matches the business owner.",
    evidence_photo_url: null, agent_name: null,
    state: "pending", created_at_hours_ago: 14, reviewed_by: null, reviewed_at_hours_ago: null, rejection_reason: null,
  },
  {
    id: "ver_0003", seller_id: "shop_24", tier_requested: "id",
    note: "Blurry ID photo, cannot read the name.",
    evidence_photo_url: null, agent_name: null,
    state: "pending", created_at_hours_ago: 8, reviewed_by: null, reviewed_at_hours_ago: null, rejection_reason: null,
  },
];

const reports = [
  {
    id: "rep_0001", listing_id: "lst_0005", reason: "wrong_price",
    note: "Price on the app was ₦185,000 but the shop said ₦240,000 when I got there.",
    reporter: "usr_buyer_demo", state: "open", created_at_hours_ago: 20,
    handled_by: null, handled_at_hours_ago: null, resolution_note: null,
  },
  {
    id: "rep_0002", listing_id: "lst_0031", reason: "not_available",
    note: "Went to the stall twice, they never had this item in stock.",
    reporter: "usr_buyer_demo", state: "open", created_at_hours_ago: 6,
    handled_by: null, handled_at_hours_ago: null, resolution_note: null,
  },
  {
    id: "rep_0003", listing_id: "lst_0062", reason: "wrong_location",
    note: "The pin sends you to a totally different street. Shop is not at Creek Road.",
    reporter: "usr_buyer_demo", state: "open", created_at_hours_ago: 3,
    handled_by: null, handled_at_hours_ago: null, resolution_note: null,
  },
];

/* --- pin-validation flags: 2 sellers whose pin is outside their zone */
const pin_flags = [
  {
    id: "pin_0001", seller_id: "shop_27", claimed_zone: "rumuokoro",
    distance_km: 4.8, lat: 4.8321, lng: 6.9012,
    note: "Pin dropped ~4.8 km outside Rumuokoro boundary (suspected pin-dropping into a richer zone).",
    state: "open", created_at_hours_ago: 30,
  },
  {
    id: "pin_0002", seller_id: "shop_19", claimed_zone: "creek-road",
    distance_km: 2.6, lat: 4.7892, lng: 7.0210,
    note: "Pin is ~2.6 km outside Creek Road boundary.",
    state: "open", created_at_hours_ago: 11,
  },
];

/* --- banned-category attempts (prohibited list enforcement) -------- */
const banned_attempts = [
  {
    id: "ban_0001", seller_id: "shop_09", attempted_name: "Tramadol 500mg (prescription drug)",
    reason: "prescription_drugs", raw_input: "tramadol 500mg", state: "blocked", created_at_hours_ago: 52,
  },
  {
    id: "ban_0002", seller_id: "shop_23", attempted_name: "Rolex watch (replica)",
    reason: "counterfeit", raw_input: "rolex replica", state: "blocked", created_at_hours_ago: 18,
  },
];

const BANNED_TERMS = [
  { term: "tramadol", reason: "prescription_drugs", label: "Prescription drugs" },
  { term: "codeine", reason: "prescription_drugs", label: "Prescription drugs" },
  { term: "morphine", reason: "prescription_drugs", label: "Prescription drugs" },
  { term: "gun", reason: "weapons", label: "Weapons" },
  { term: "pistol", reason: "weapons", label: "Weapons" },
  { term: "rifle", reason: "weapons", label: "Weapons" },
  { term: "ammunition", reason: "weapons", label: "Weapons" },
  { term: "replica", reason: "counterfeit", label: "Counterfeit branded goods" },
  { term: "fake rolex", reason: "counterfeit", label: "Counterfeit branded goods" },
  { term: "ivory", reason: "wildlife", label: "Ivory / protected wildlife" },
  { term: "bushmeat", reason: "wildlife", label: "Ivory / protected wildlife" },
  { term: "sex", reason: "sexual_services", label: "Sexual services" },
  { term: "escort", reason: "sexual_services", label: "Sexual services" },
];

/* --- search alias / synonym table (starter set for search to work) - */
const SYNONYMS = [];
PRODUCTS.forEach((p) => {
  p.aliases.forEach((a) => SYNONYMS.push({ term: a.toLowerCase(), maps_to: p.id, weight: 1 }));
});
// extra Pidgin / misspelling entries
[
  ["gen", "gen-1kva"], ["generator", "gen-1kva"], ["jennerator", "gen-1kva"],
  ["i better pass my neighbour", "gen-1kva"], ["indomine", "fd-indomie"],
  ["noddles", "fd-indomie"], ["rice", "fd-rice50"], ["simiti", "bm-cement"],
  ["taya", "car-tyre"], ["pent", "bm-paint"], ["frij", "el-fridge"],
  ["air con", "el-ac15"], ["ac", "el-ac15"], ["gas", "gas-125"],
  ["cooking gas", "gas-125"], ["bubble", "gas-125"],
].forEach(([term, maps_to]) => SYNONYMS.push({ term, maps_to, weight: 1.2 }));

/* --- zero-result searches already logged (drives admin dashboard) -- */
const search_seed = [
  { raw_query: "wedding cake", cluster: "Mile 1", result_count: 0, hours_ago: 6 },
  { raw_query: "solar panel", cluster: "Mile 1", result_count: 0, hours_ago: 9 },
  { raw_query: "school bag", cluster: "Ada George", result_count: 0, hours_ago: 12 },
  { raw_query: "bulb", cluster: "Mile 3", result_count: 0, hours_ago: 15 },
  { raw_query: "washing machine", cluster: "Creek Road", result_count: 0, hours_ago: 18 },
  { raw_query: "baby pram", cluster: "Rumuokoro", result_count: 0, hours_ago: 22 },
  { raw_query: "iron rod 16mm", cluster: "Choba", result_count: 0, hours_ago: 26 },
  { raw_query: "paint brush", cluster: "Mile 1", result_count: 0, hours_ago: 30 },
  { raw_query: "printer ink", cluster: "Ada George", result_count: 0, hours_ago: 33 },
  { raw_query: "generator", cluster: "Mile 1", result_count: 3, hours_ago: 2 },
  { raw_query: "indomine", cluster: "Mile 1", result_count: 2, hours_ago: 4 },
  { raw_query: "cement", cluster: "Mile 3", result_count: 4, hours_ago: 5 },
];

/* --- demand posts ("tell sellers what you need") ------------------ */
const demand_posts = [
  { id: "dmd_0001", raw_text: "I need a 1.5HP air conditioner, anyone around Woji?", cluster: "Ada George", created_at_hours_ago: 5 },
  { id: "dmd_0002", raw_text: "Looking for wedding cake in Mile 1", cluster: "Mile 1", created_at_hours_ago: 7 },
  { id: "dmd_0003", raw_text: "Solar panel and inverter, 1KVA", cluster: "Mile 1", created_at_hours_ago: 10 },
  { id: "dmd_0004", raw_text: "School bag for primary 3", cluster: "Ada George", created_at_hours_ago: 13 },
];

const seed = {
  meta: {
    version: 1,
    generated_at_client: new Date().toISOString(),
    note: "Demo dataset for Member 3. Timestamps are relative offsets (hours ago) and are materialised on first run.",
    city: "Port Harcourt, Rivers State",
  },
  zones: ZONES,
  products: PRODUCTS,
  synonyms: SYNONYMS,
  banned_terms: BANNED_TERMS,
  users,
  sellers,
  listings,
  verification_requests,
  reports,
  pin_flags,
  banned_attempts,
  search_queries: search_seed,
  demand_posts,
  // runtime tables start empty — they get real rows as you click through the demo
  confirm_requests: [],
  accuracy_reports: [],
  audit_log: [],
  events: [],
  admin_sessions: [],
};

mkdirSync(resolve(__dirname, "../data"), { recursive: true });
writeFileSync(OUT, JSON.stringify(seed, null, 2));

const productCount = PRODUCTS.length;
const listingCount = listings.length;
const fresh = listings.filter((l) => l.confirmed_at_hours_ago < 48).length;
console.log(`✓ data/seed.json written`);
console.log(`  zones: ${ZONES.length}  |  products: ${productCount}  |  shops: ${sellers.length}  |  listings: ${listingCount}`);
console.log(`  fresh(<48h): ${fresh}  aging: ${listings.filter(l=>l.confirmed_at_hours_ago>=48&&l.confirmed_at_hours_ago<168).length}  stale(>7d): ${listings.filter(l=>l.confirmed_at_hours_ago>=168&&l.confirmed_at_hours_ago<336).length}  expired(>14d): ${listings.filter(l=>l.confirmed_at_hours_ago>=336).length}`);
console.log(`  admin queues → verifications: ${verification_requests.length}  reports: ${reports.length}  pin flags: ${pin_flags.length}`);
