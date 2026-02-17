import { Router } from "express";
import { products, getProduct } from "../data/products";
import { priceHistory, getHistoryForProduct } from "../data/priceHistory";
import { getSupplier, suppliers } from "../data/suppliers";

const router = Router();

router.get("/", (_req, res) => {
  res.json(products);
});

// Suggestions based on current RFQ items — MUST be before /:sku
router.get("/suggestions", (req, res) => {
  const skusParam = (req.query.skus as string) || "";
  const currentSkus = skusParam.split(",").filter(Boolean);

  const currentCategories = new Set<string>();
  const currentSupplierIds = new Set<string>();

  for (const sku of currentSkus) {
    const p = getProduct(sku);
    if (p) currentCategories.add(p.category);
    const history = getHistoryForProduct(sku);
    for (const h of history) {
      currentSupplierIds.add(h.supplierId);
    }
  }

  const related = products
    .filter((p) => currentCategories.has(p.category) && !currentSkus.includes(p.sku))
    .map((p) => {
      const history = getHistoryForProduct(p.sku);
      const latestEntry = history
        .flatMap((h) => h.prices.map((pr) => ({ ...pr, supplierId: h.supplierId })))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const sup = latestEntry ? getSupplier(latestEntry.supplierId) : null;
      return {
        ...p,
        lastPrice: latestEntry?.unitPrice || null,
        lastSupplier: sup?.name || null,
        reason: "Same category",
      };
    });

  const supplierMatch = products
    .filter((p) => !currentSkus.includes(p.sku) && !currentCategories.has(p.category))
    .filter((p) => {
      const history = getHistoryForProduct(p.sku);
      return history.some((h) => currentSupplierIds.has(h.supplierId));
    })
    .map((p) => {
      const history = getHistoryForProduct(p.sku);
      const matchingSupplier = history.find((h) => currentSupplierIds.has(h.supplierId));
      const latestPrice = matchingSupplier?.prices[0];
      const sup = matchingSupplier ? getSupplier(matchingSupplier.supplierId) : null;
      return {
        ...p,
        lastPrice: latestPrice?.unitPrice || null,
        lastSupplier: sup?.name || null,
        reason: `Also from ${sup?.name || "shared supplier"}`,
      };
    });

  res.json({ related, supplierMatch });
});

// Products by supplier — MUST be before /:sku
router.get("/by-supplier/:supplierId", (req, res) => {
  const supplierId = req.params.supplierId;
  const supplier = getSupplier(supplierId);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  const supplierProducts = priceHistory
    .filter((h) => h.supplierId === supplierId)
    .map((h) => {
      const product = getProduct(h.sku);
      if (!product) return null;
      const latestPrice = h.prices[0];
      return {
        ...product,
        lastPrice: latestPrice?.unitPrice || 0,
        lastOrderDate: latestPrice?.date || "",
        lastQty: latestPrice?.qty || 0,
      };
    })
    .filter(Boolean);

  res.json({
    supplier: { id: supplier.id, name: supplier.name },
    products: supplierProducts,
  });
});

// Single product detail — catch-all, must be LAST
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
