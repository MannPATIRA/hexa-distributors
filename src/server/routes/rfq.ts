import { Router } from "express";
import { v4 as uuid } from "uuid";
import { store, RFQ, RFQItem, RFQSupplierStatus } from "../store";
import { getSupplier } from "../data/suppliers";
import { sendEmailAsBuyer } from "../services/graph";

const router = Router();

router.get("/", (_req, res) => {
  const rfqs = Array.from(store.rfqs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(rfqs);
});

router.get("/:id", (req, res) => {
  const rfq = store.rfqs.get(req.params.id);
  if (!rfq) return res.status(404).json({ error: "RFQ not found" });
  res.json(rfq);
});

router.post("/", async (req, res) => {
  try {
    const { items, supplierIds, quoteDeadline, deliveryDate, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "At least one item is required" });
    }
    if (!supplierIds || supplierIds.length === 0) {
      return res.status(400).json({ error: "At least one supplier is required" });
    }

    const id = uuid();
    const referenceNumber = store.nextRfqNumber();
    const now = new Date().toISOString();

    const rfqItems: RFQItem[] = items.map((it: any) => ({
      sku: it.sku,
      name: it.name,
      qty: it.qty,
      unit: it.unit || "piece",
      specs: it.specs || "",
    }));

    const suppliers: RFQSupplierStatus[] = supplierIds.map((sid: string) => ({
      supplierId: sid,
      status: "pending" as const,
      sentAt: now,
    }));

    const rfq: RFQ = {
      id,
      referenceNumber,
      items: rfqItems,
      suppliers,
      status: "active",
      createdAt: now,
      quoteDeadline: quoteDeadline || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      deliveryDate: deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      notes: notes || "",
    };

    store.rfqs.set(id, rfq);

    // Send RFQ emails to each supplier
    const buyerName = process.env.BUYER_NAME || "James Cooper";
    const buyerCompany = process.env.BUYER_COMPANY || "Meridian Industrial Supplies";
    const buyerEmail = process.env.BUYER_EMAIL || "";

    const itemsTable = rfqItems
      .map(
        (it, i) =>
          `<tr><td style="padding:6px 8px;border:1px solid #ddd;">${i + 1}</td>` +
          `<td style="padding:6px 8px;border:1px solid #ddd;">${it.name}</td>` +
          `<td style="padding:6px 8px;border:1px solid #ddd;">${it.sku}</td>` +
          `<td style="padding:6px 8px;border:1px solid #ddd;">${it.qty} ${it.unit}s</td></tr>`
      )
      .join("");

    for (const sid of supplierIds) {
      const supplier = getSupplier(sid);
      if (!supplier) continue;

      const emailBody = `
        <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
          <h2 style="color: #1B4D7A;">Request for Quotation — ${referenceNumber}</h2>
          <p>Dear ${supplier.contactName},</p>
          <p>We would like to request a quotation for the following items:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">#</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Description</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">SKU</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Qty</th>
              </tr>
            </thead>
            <tbody>${itemsTable}</tbody>
          </table>
          <p><strong>Required delivery date:</strong> ${new Date(rfq.deliveryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p><strong>Quote deadline:</strong> ${new Date(rfq.quoteDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          ${rfq.notes ? `<p><strong>Notes:</strong> ${rfq.notes}</p>` : ""}
          <p>Please reply to this email with your best pricing, lead time, and payment terms.</p>
          <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
        </div>
      `;

      try {
        await sendEmailAsBuyer({
          subject: `${referenceNumber} — Request for Quotation`,
          body: emailBody,
          toRecipients: [
            { name: supplier.contactName, email: supplier.contactEmail },
          ],
        });
      } catch (emailErr: any) {
        console.warn(`Failed to send RFQ email to ${supplier.name}:`, emailErr.message);
      }
    }

    // Trigger simulation of supplier replies
    try {
      const { scheduleSupplierReplies } = require("../services/simulation");
      scheduleSupplierReplies(rfq);
    } catch (simErr: any) {
      console.warn("Failed to schedule supplier reply simulation:", simErr.message);
    }

    res.json(rfq);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/remind/:supplierId", async (req, res) => {
  try {
    const rfq = store.rfqs.get(req.params.id);
    if (!rfq) return res.status(404).json({ error: "RFQ not found" });

    const supplierStatus = rfq.suppliers.find(
      (s) => s.supplierId === req.params.supplierId
    );
    if (!supplierStatus)
      return res.status(404).json({ error: "Supplier not in this RFQ" });

    const supplier = getSupplier(req.params.supplierId);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const buyerName = process.env.BUYER_NAME || "James Cooper";
    const buyerCompany = process.env.BUYER_COMPANY || "Meridian Industrial Supplies";

    const emailBody = `
      <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
        <p>Dear ${supplier.contactName},</p>
        <p>This is a friendly reminder regarding our request for quotation <strong>${rfq.referenceNumber}</strong> 
        sent on ${new Date(rfq.createdAt).toLocaleDateString("en-GB")}.</p>
        <p>We would appreciate receiving your quotation at your earliest convenience. 
        The quote deadline is <strong>${new Date(rfq.quoteDeadline).toLocaleDateString("en-GB")}</strong>.</p>
        <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
      </div>
    `;

    try {
      await sendEmailAsBuyer({
        subject: `Reminder: ${rfq.referenceNumber} — Request for Quotation`,
        body: emailBody,
        toRecipients: [
          { name: supplier.contactName, email: supplier.contactEmail },
        ],
      });
    } catch (emailErr: any) {
      console.warn("Failed to send reminder:", emailErr.message);
    }

    supplierStatus.reminderSentAt = new Date().toISOString();
    res.json({ message: "Reminder sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/compare", (req, res) => {
  const quotes = store.getQuotesForRfq(req.params.id);
  res.json(quotes);
});

// Notify unsuccessful supplier
router.post("/:id/reject/:supplierId", async (req, res) => {
  try {
    const rfq = store.rfqs.get(req.params.id);
    if (!rfq) return res.status(404).json({ error: "RFQ not found" });

    const supplier = getSupplier(req.params.supplierId);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const buyerName = process.env.BUYER_NAME || "James Cooper";
    const buyerCompany = process.env.BUYER_COMPANY || "Meridian Industrial Supplies";

    const emailBody = `
      <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
        <p>Dear ${supplier.contactName},</p>
        <p>Thank you for your quotation in response to our ${rfq.referenceNumber}.</p>
        <p>After careful consideration, we have decided to place this order with another supplier on this occasion.</p>
        <p>We appreciate your time and look forward to working with you on future opportunities.</p>
        <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
      </div>
    `;

    try {
      await sendEmailAsBuyer({
        subject: `RE: ${rfq.referenceNumber} — Thank you`,
        body: emailBody,
        toRecipients: [
          { name: supplier.contactName, email: supplier.contactEmail },
        ],
      });
    } catch (emailErr: any) {
      console.warn("Failed to send rejection email:", emailErr.message);
    }

    // Mark RFQ as completed
    rfq.status = "completed";

    res.json({ message: "Rejection notice sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
