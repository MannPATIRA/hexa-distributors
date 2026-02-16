import { products, Product } from "./products";
import { priceHistory } from "./priceHistory";
import { suppliers } from "./suppliers";

export interface ReorderItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  reorderQty: number;
  urgency: "critical" | "warning" | "normal";
  lastSupplierName: string | null;
  lastUnitPrice: number | null;
}

export function getReorderList(): ReorderItem[] {
  const items: ReorderItem[] = products
    .filter((p) => p.currentStock <= p.reorderPoint)
    .map((p) => {
      const urgency: ReorderItem["urgency"] =
        p.currentStock < p.safetyStock
          ? "critical"
          : p.currentStock <= p.reorderPoint
          ? "warning"
          : "normal";

      // Find last supplier and price
      const history = priceHistory
        .filter((h) => h.sku === p.sku)
        .flatMap((h) =>
          h.prices.map((price) => ({
            supplierId: h.supplierId,
            ...price,
          }))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastOrder = history[0];
      const lastSupplier = lastOrder
        ? suppliers.find((s) => s.id === lastOrder.supplierId)
        : null;

      return {
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderPoint: p.reorderPoint,
        safetyStock: p.safetyStock,
        reorderQty: p.reorderQty,
        urgency,
        lastSupplierName: lastSupplier?.name || null,
        lastUnitPrice: lastOrder?.unitPrice || null,
      };
    });

  // Sort: critical first, then warning, then normal
  const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return items;
}
