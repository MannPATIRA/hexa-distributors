export interface RFQItem {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  specs?: string;
}

export interface RFQSupplierStatus {
  supplierId: string;
  status: "pending" | "responded" | "no-response";
  sentAt: string;
  respondedAt?: string;
  reminderSentAt?: string;
}

export interface RFQ {
  id: string;
  referenceNumber: string;
  items: RFQItem[];
  suppliers: RFQSupplierStatus[];
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  quoteDeadline: string;
  deliveryDate: string;
  notes: string;
}

export interface QuoteLineItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  items: QuoteLineItem[];
  subtotal: number;
  deliveryCost: number;
  landedTotal: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
  capturedAt: string;
  responseTimeHours: number;
}

export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  poNumber: string;
  rfqId?: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  total: number;
  status: "sent" | "confirmed" | "shipped" | "delivered";
  createdAt: string;
  expectedDelivery: string;
  paymentTerms: string;
}

export interface SimulationTask {
  rfqId: string;
  supplierId: string;
  status: "scheduled" | "sent" | "failed";
  scheduledFor: string;
  sentAt?: string;
}

// In-memory store
class Store {
  rfqs: Map<string, RFQ> = new Map();
  quotes: Map<string, Quote> = new Map();
  orders: Map<string, Order> = new Map();
  simulationTasks: SimulationTask[] = [];

  private rfqCounter = 91;
  private orderCounter = 1000;

  nextRfqNumber(): string {
    this.rfqCounter++;
    return `RFQ-${String(this.rfqCounter).padStart(4, "0")}`;
  }

  nextPoNumber(): string {
    this.orderCounter++;
    return `PO-${String(this.orderCounter).padStart(5, "0")}`;
  }

  getRfqByRef(ref: string): RFQ | undefined {
    for (const rfq of this.rfqs.values()) {
      if (rfq.referenceNumber === ref) return rfq;
    }
    return undefined;
  }

  getQuotesForRfq(rfqId: string): Quote[] {
    return Array.from(this.quotes.values()).filter((q) => q.rfqId === rfqId);
  }

  getOrdersAll(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const store = new Store();
