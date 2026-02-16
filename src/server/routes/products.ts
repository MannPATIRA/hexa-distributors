import { Router } from "express";
import { products, getProduct } from "../data/products";
import { getHistoryForProduct } from "../data/priceHistory";
import { getSupplier } from "../data/suppliers";

const router = Router();

router.get("/", (_req, res) => {
  res.json(products);
});

router.get("/:sku", (req, res) => {
  const product = getProduct(req.params.sku);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const history = getHistoryForProduct(req.params.sku);
  const supplierHistory = history.map((h) => {
    const supplier = getSupplier(h.supplierId);
    const latestPrice = h.prices[0];
    const avgLeadTime =
      h.prices.reduce((sum, p) => sum + p.leadTimeDays, 0) / h.prices.length;
    const onTimeRate =
      h.prices.filter((p) => p.onTime).length / h.prices.length;

    return {
      supplierId: h.supplierId,
      supplierName: supplier?.name || "Unknown",
      contactName: supplier?.contactName || "",
      paymentTerms: supplier?.paymentTerms || "",
      lastPrice: latestPrice?.unitPrice || 0,
      lastOrderDate: latestPrice?.date || "",
      lastQty: latestPrice?.qty || 0,
      avgLeadTimeDays: Math.round(avgLeadTime * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 100),
      orderCount: h.prices.length,
      overallOnTimeRate: supplier?.onTimeDeliveryRate
        ? Math.round(supplier.onTimeDeliveryRate * 100)
        : 0,
    };
  });

  res.json({
    ...product,
    supplierHistory,
  });
});

export default router;
