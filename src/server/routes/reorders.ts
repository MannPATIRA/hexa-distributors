import { Router } from "express";
import { getReorderList } from "../data/reorderList";
import { store } from "../store";

const router = Router();

router.get("/", (_req, res) => {
  const allItems = getReorderList();

  // Filter out items that already have an open order (not yet delivered)
  const openOrderSkus = new Set<string>();
  for (const order of store.orders.values()) {
    if (order.status !== "delivered") {
      for (const item of order.items) {
        openOrderSkus.add(item.sku);
      }
    }
  }

  // Also filter out items that are part of an active RFQ
  const activeRfqSkus = new Set<string>();
  for (const rfq of store.rfqs.values()) {
    if (rfq.status === "active") {
      for (const item of rfq.items) {
        activeRfqSkus.add(item.sku);
      }
    }
  }

  const filtered = allItems.filter(
    (item) => !openOrderSkus.has(item.sku) && !activeRfqSkus.has(item.sku)
  );

  res.json(filtered);
});

export default router;
