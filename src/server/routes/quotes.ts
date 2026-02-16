import { Router } from "express";
import { v4 as uuid } from "uuid";
import { store, Quote } from "../store";
import { extractQuoteFromEmail } from "../services/emailParser";
import { getSupplier } from "../data/suppliers";

const router = Router();

// Extract quote data from email body
router.post("/extract", (req, res) => {
  try {
    const { emailBody, rfqId } = req.body;
    if (!emailBody) return res.status(400).json({ error: "emailBody is required" });

    const extracted = extractQuoteFromEmail(emailBody);

    // Try to match items with RFQ items if rfqId provided
    if (rfqId) {
      const rfq = store.rfqs.get(rfqId);
      if (rfq) {
        // Try to match extracted items with RFQ items by name similarity
        extracted.items = extracted.items.map((extItem) => {
          const rfqItem = rfq.items.find(
            (ri) =>
              ri.name.toLowerCase().includes(extItem.name.toLowerCase().substring(0, 10)) ||
              extItem.name.toLowerCase().includes(ri.name.toLowerCase().substring(0, 10))
          );
          if (rfqItem) {
            return {
              ...extItem,
              name: rfqItem.name,
            };
          }
          return extItem;
        });
      }
    }

    res.json(extracted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Capture (save) a verified quote
router.post("/capture", (req, res) => {
  try {
    const { rfqId, supplierId, items, subtotal, deliveryCost, leadTimeDays, paymentTerms, validity } = req.body;

    if (!rfqId || !supplierId) {
      return res.status(400).json({ error: "rfqId and supplierId are required" });
    }

    const rfq = store.rfqs.get(rfqId);
    if (!rfq) return res.status(404).json({ error: "RFQ not found" });

    const supplier = getSupplier(supplierId);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    // Calculate response time
    const supplierStatus = rfq.suppliers.find((s) => s.supplierId === supplierId);
    const sentAt = supplierStatus ? new Date(supplierStatus.sentAt).getTime() : Date.now();
    const responseTimeHours = Math.round((Date.now() - sentAt) / 3600000 * 10) / 10;

    const id = uuid();
    const landedTotal = (subtotal || 0) + (deliveryCost || 0);

    const quote: Quote = {
      id,
      rfqId,
      supplierId,
      supplierName: supplier.name,
      items: items || [],
      subtotal: subtotal || 0,
      deliveryCost: deliveryCost || 0,
      landedTotal,
      leadTimeDays: leadTimeDays || 0,
      paymentTerms: paymentTerms || "",
      validity: validity || "",
      capturedAt: new Date().toISOString(),
      responseTimeHours,
    };

    store.quotes.set(id, quote);

    // Update supplier status in RFQ
    if (supplierStatus && supplierStatus.status !== "responded") {
      supplierStatus.status = "responded";
      supplierStatus.respondedAt = new Date().toISOString();
    }

    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
