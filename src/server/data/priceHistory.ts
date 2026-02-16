export interface PriceEntry {
  date: string;
  unitPrice: number;
  qty: number;
  leadTimeDays: number;
  onTime: boolean;
}

export interface ProductPriceHistory {
  sku: string;
  supplierId: string;
  prices: PriceEntry[];
}

export const priceHistory: ProductPriceHistory[] = [
  // Hex Bolt M10x50
  { sku: "HB-M10X50-A480", supplierId: "sup-001", prices: [
    { date: "2025-12-15", unitPrice: 0.42, qty: 500, leadTimeDays: 5, onTime: true },
    { date: "2025-09-20", unitPrice: 0.40, qty: 500, leadTimeDays: 5, onTime: true },
    { date: "2025-06-10", unitPrice: 0.39, qty: 1000, leadTimeDays: 4, onTime: true },
  ]},
  { sku: "HB-M10X50-A480", supplierId: "sup-002", prices: [
    { date: "2025-11-01", unitPrice: 0.38, qty: 500, leadTimeDays: 9, onTime: false },
    { date: "2025-07-15", unitPrice: 0.37, qty: 500, leadTimeDays: 8, onTime: true },
  ]},
  { sku: "HB-M10X50-A480", supplierId: "sup-003", prices: [
    { date: "2025-10-05", unitPrice: 0.44, qty: 500, leadTimeDays: 4, onTime: true },
  ]},
  { sku: "HB-M10X50-A480", supplierId: "sup-006", prices: [
    { date: "2025-08-20", unitPrice: 0.46, qty: 500, leadTimeDays: 7, onTime: true },
  ]},

  // Hex Nut M10
  { sku: "HN-M10-A480", supplierId: "sup-001", prices: [
    { date: "2025-12-15", unitPrice: 0.28, qty: 1000, leadTimeDays: 5, onTime: true },
    { date: "2025-09-20", unitPrice: 0.27, qty: 1000, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "HN-M10-A480", supplierId: "sup-002", prices: [
    { date: "2025-11-01", unitPrice: 0.25, qty: 1000, leadTimeDays: 9, onTime: true },
  ]},
  { sku: "HN-M10-A480", supplierId: "sup-003", prices: [
    { date: "2025-10-05", unitPrice: 0.30, qty: 1000, leadTimeDays: 4, onTime: true },
  ]},

  // Flat Washer M10
  { sku: "FW-M10-A4", supplierId: "sup-001", prices: [
    { date: "2025-12-15", unitPrice: 0.12, qty: 2000, leadTimeDays: 5, onTime: true },
    { date: "2025-08-10", unitPrice: 0.11, qty: 2000, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "FW-M10-A4", supplierId: "sup-002", prices: [
    { date: "2025-10-01", unitPrice: 0.10, qty: 2000, leadTimeDays: 8, onTime: false },
  ]},
  { sku: "FW-M10-A4", supplierId: "sup-003", prices: [
    { date: "2025-09-15", unitPrice: 0.13, qty: 2000, leadTimeDays: 4, onTime: true },
  ]},

  // Ball Valve DN25
  { sku: "BV-DN25-PN16", supplierId: "sup-004", prices: [
    { date: "2025-11-20", unitPrice: 18.50, qty: 50, leadTimeDays: 3, onTime: true },
    { date: "2025-07-10", unitPrice: 17.80, qty: 50, leadTimeDays: 3, onTime: true },
  ]},

  // Gate Valve DN50
  { sku: "GV-DN50-PN16", supplierId: "sup-004", prices: [
    { date: "2025-10-15", unitPrice: 42.00, qty: 30, leadTimeDays: 4, onTime: true },
  ]},

  // 90° Elbow CPVC
  { sku: "PF-90-25-CPVC", supplierId: "sup-003", prices: [
    { date: "2025-11-01", unitPrice: 2.10, qty: 200, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "PF-90-25-CPVC", supplierId: "sup-004", prices: [
    { date: "2025-09-15", unitPrice: 2.30, qty: 200, leadTimeDays: 3, onTime: true },
  ]},

  // Stainless Braided Hose
  { sku: "SS-HOSE-12-1M", supplierId: "sup-004", prices: [
    { date: "2025-12-01", unitPrice: 12.50, qty: 80, leadTimeDays: 3, onTime: true },
  ]},

  // Cable 6mm²
  { sku: "CB-6MM-100M", supplierId: "sup-005", prices: [
    { date: "2025-11-15", unitPrice: 85.00, qty: 20, leadTimeDays: 6, onTime: true },
    { date: "2025-08-01", unitPrice: 82.00, qty: 20, leadTimeDays: 7, onTime: false },
  ]},

  // MCB 20A
  { sku: "MCB-20A-1P", supplierId: "sup-005", prices: [
    { date: "2025-12-10", unitPrice: 4.80, qty: 100, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "MCB-20A-1P", supplierId: "sup-001", prices: [
    { date: "2025-10-20", unitPrice: 5.20, qty: 100, leadTimeDays: 5, onTime: true },
  ]},

  // PTFE Tape
  { sku: "PTFE-12MM-12M", supplierId: "sup-001", prices: [
    { date: "2025-11-05", unitPrice: 0.95, qty: 500, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "PTFE-12MM-12M", supplierId: "sup-002", prices: [
    { date: "2025-09-20", unitPrice: 0.85, qty: 500, leadTimeDays: 8, onTime: true },
  ]},

  // Socket Cap Screw
  { sku: "SC-M8X30-A2", supplierId: "sup-001", prices: [
    { date: "2025-12-01", unitPrice: 0.32, qty: 500, leadTimeDays: 5, onTime: true },
  ]},
  { sku: "SC-M8X30-A2", supplierId: "sup-006", prices: [
    { date: "2025-10-15", unitPrice: 0.35, qty: 500, leadTimeDays: 7, onTime: true },
  ]},

  // Ball Valve DN50 SS
  { sku: "BV-DN50-PN16-SS", supplierId: "sup-004", prices: [
    { date: "2025-11-10", unitPrice: 95.00, qty: 25, leadTimeDays: 4, onTime: true },
  ]},
];

export function getHistoryForProduct(sku: string): ProductPriceHistory[] {
  return priceHistory.filter((h) => h.sku === sku);
}

export function getHistoryForProductAndSupplier(
  sku: string,
  supplierId: string
): ProductPriceHistory | undefined {
  return priceHistory.find((h) => h.sku === sku && h.supplierId === supplierId);
}
