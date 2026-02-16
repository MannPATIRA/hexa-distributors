export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  accountNumber: string;
  paymentTerms: string;
  categories: string[];
  avgLeadTimeDays: number;
  onTimeDeliveryRate: number;
  responseTimeHours: number;
  notes: string;
}

const SIM_EMAIL = process.env.SUPPLIER_SIM_EMAIL || "supplier-sim@outlook.com";

export const suppliers: Supplier[] = [
  {
    id: "sup-001",
    name: "RS Components",
    contactName: "Sarah Mitchell",
    contactEmail: SIM_EMAIL,
    phone: "+44 1onal 820 820",
    accountNumber: "MERID-4521",
    paymentTerms: "Net 30",
    categories: ["Fasteners", "Electrical", "Consumables"],
    avgLeadTimeDays: 5,
    onTimeDeliveryRate: 0.96,
    responseTimeHours: 8,
    notes: "Primary supplier for fasteners. Good reliability. Slightly above market on price.",
  },
  {
    id: "sup-002",
    name: "Würth",
    contactName: "Klaus Weber",
    contactEmail: SIM_EMAIL,
    phone: "+49 7940 15-0",
    accountNumber: "MIS-DE-8832",
    paymentTerms: "Net 45",
    categories: ["Fasteners", "Consumables"],
    avgLeadTimeDays: 8,
    onTimeDeliveryRate: 0.82,
    responseTimeHours: 24,
    notes: "Competitive pricing but slower delivery. Based in Germany — longer lead times to UK.",
  },
  {
    id: "sup-003",
    name: "Fabory",
    contactName: "Pieter van Dijk",
    contactEmail: SIM_EMAIL,
    phone: "+31 40 292 92 92",
    accountNumber: "FAB-UK-1190",
    paymentTerms: "Net 30",
    categories: ["Fasteners", "Pipe Fittings"],
    avgLeadTimeDays: 4,
    onTimeDeliveryRate: 0.94,
    responseTimeHours: 12,
    notes: "Fast delivery from Netherlands warehouse. Premium pricing.",
  },
  {
    id: "sup-004",
    name: "Brammer Buck & Hickman",
    contactName: "David Thompson",
    contactEmail: SIM_EMAIL,
    phone: "+44 870 240 2100",
    accountNumber: "BBH-90234",
    paymentTerms: "Net 30",
    categories: ["Valves", "Pipe Fittings", "Hoses"],
    avgLeadTimeDays: 3,
    onTimeDeliveryRate: 0.91,
    responseTimeHours: 6,
    notes: "UK-based. Best for valves and fittings. Quick turnaround.",
  },
  {
    id: "sup-005",
    name: "Anixter (WESCO)",
    contactName: "Rachel Green",
    contactEmail: SIM_EMAIL,
    phone: "+44 121 326 7007",
    accountNumber: "WES-MIS-5567",
    paymentTerms: "Net 60",
    categories: ["Electrical", "Cable"],
    avgLeadTimeDays: 6,
    onTimeDeliveryRate: 0.89,
    responseTimeHours: 16,
    notes: "Specialist electrical supplier. Good range. Net 60 terms are helpful for cash flow.",
  },
  {
    id: "sup-006",
    name: "Bossard",
    contactName: "Anna Schmid",
    contactEmail: SIM_EMAIL,
    phone: "+41 41 749 66 11",
    accountNumber: "BOS-UK-3344",
    paymentTerms: "Net 30",
    categories: ["Fasteners"],
    avgLeadTimeDays: 7,
    onTimeDeliveryRate: 0.93,
    responseTimeHours: 18,
    notes: "Swiss precision fastener specialist. Premium quality, premium price.",
  },
];

export function getSuppliers(): Supplier[] {
  return suppliers;
}

export function getSupplier(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}

export function getSuppliersForCategories(categories: string[]): Supplier[] {
  return suppliers.filter((s) =>
    s.categories.some((cat) => categories.includes(cat))
  );
}
