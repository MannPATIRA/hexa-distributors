export interface Product {
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorderPoint: number;
  reorderQty: number;
  currentStock: number;
  safetyStock: number;
}

export const products: Product[] = [
  { sku: "HB-M10X50-A480", name: "Hex Bolt M10x50mm Grade A4-80 Stainless", category: "Fasteners", unit: "piece", reorderPoint: 200, reorderQty: 500, currentStock: 145, safetyStock: 100 },
  { sku: "HN-M10-A480", name: "Hex Nut M10 Grade A4-80 Stainless", category: "Fasteners", unit: "piece", reorderPoint: 300, reorderQty: 1000, currentStock: 350, safetyStock: 150 },
  { sku: "FW-M10-A4", name: "Flat Washer M10 A4 Stainless", category: "Fasteners", unit: "piece", reorderPoint: 500, reorderQty: 2000, currentStock: 550, safetyStock: 200 },
  { sku: "BV-DN25-PN16", name: "Ball Valve DN25 PN16 Brass", category: "Valves", unit: "piece", reorderPoint: 30, reorderQty: 50, currentStock: 12, safetyStock: 15 },
  { sku: "GV-DN50-PN16", name: "Gate Valve DN50 PN16 Cast Iron", category: "Valves", unit: "piece", reorderPoint: 20, reorderQty: 30, currentStock: 22, safetyStock: 10 },
  { sku: "PF-90-25-CPVC", name: "90° Elbow 25mm CPVC", category: "Pipe Fittings", unit: "piece", reorderPoint: 100, reorderQty: 200, currentStock: 120, safetyStock: 50 },
  { sku: "SS-HOSE-12-1M", name: 'Stainless Braided Hose 1/2" 1m', category: "Hoses", unit: "piece", reorderPoint: 40, reorderQty: 80, currentStock: 50, safetyStock: 20 },
  { sku: "CB-6MM-100M", name: "Cable 6mm² Blue 100m Roll", category: "Electrical", unit: "roll", reorderPoint: 10, reorderQty: 20, currentStock: 4, safetyStock: 5 },
  { sku: "MCB-20A-1P", name: "MCB 20A Single Pole Type B", category: "Electrical", unit: "piece", reorderPoint: 50, reorderQty: 100, currentStock: 52, safetyStock: 25 },
  { sku: "PTFE-12MM-12M", name: "PTFE Tape 12mm x 12m", category: "Consumables", unit: "roll", reorderPoint: 200, reorderQty: 500, currentStock: 250, safetyStock: 100 },
  { sku: "SC-M8X30-A2", name: "Socket Cap Screw M8x30 A2 Stainless", category: "Fasteners", unit: "piece", reorderPoint: 150, reorderQty: 500, currentStock: 420, safetyStock: 75 },
  { sku: "BV-DN50-PN16-SS", name: "Ball Valve DN50 PN16 Stainless 316", category: "Valves", unit: "piece", reorderPoint: 15, reorderQty: 25, currentStock: 8, safetyStock: 8 },
];

export function getProduct(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}
