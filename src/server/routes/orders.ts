import { Router } from "express";
import { v4 as uuid } from "uuid";
import { store, Order } from "../store";
import { getSupplier } from "../data/suppliers";
import { sendEmailAsBuyer } from "../services/graph";

const router = Router();

router.get("/", (_req, res) => {
  res.json(store.getOrdersAll());
});

router.post("/", async (req, res) => {
  try {
    const {
      supplierId, items, total, paymentTerms, expectedDelivery,
      sendEmail: doSend, rfqId, notifyUnsuccessful,
    } = req.body;

    const supplier = getSupplier(supplierId);
    if (!supplier) return res.status(400).json({ error: "Invalid supplier" });

    const id = uuid();
    const poNumber = store.nextPoNumber();

    const order: Order = {
      id,
      poNumber,
      rfqId,
      supplierId,
      supplierName: supplier.name,
      items,
      total,
      status: "sent",
      createdAt: new Date().toISOString(),
      expectedDelivery,
      paymentTerms: paymentTerms || supplier.paymentTerms,
    };

    store.orders.set(id, order);

    const buyerName = process.env.BUYER_NAME || "James Cooper";
    const buyerCompany = process.env.BUYER_COMPANY || "Meridian Industrial Supplies";

    // Send PO email to winning supplier
    if (doSend) {
      const itemRows = items
        .map(
          (it: any, i: number) =>
            `<tr>
              <td style="padding:6px 8px;border:1px solid #ddd;">${i + 1}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">${it.name}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">${it.qty}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">£${it.unitPrice.toFixed(2)}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">£${it.total.toFixed(2)}</td>
            </tr>`
        )
        .join("");

      const emailBody = `
        <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
          <h2 style="color: #1B4D7A;">Purchase Order ${poNumber}</h2>
          <p>Dear ${supplier.contactName},</p>
          <p>Please find our purchase order below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">#</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Description</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Qty</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Unit Price</th>
                <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p><strong>Total: £${total.toFixed(2)}</strong></p>
          <p>Required delivery date: ${new Date(expectedDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>Payment terms: ${order.paymentTerms}</p>
          <p>Please confirm receipt and expected delivery schedule.</p>
          <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
        </div>
      `;

      try {
        await sendEmailAsBuyer({
          subject: `${poNumber} — Purchase Order from ${buyerCompany}`,
          body: emailBody,
          toRecipients: [
            { name: supplier.contactName, email: supplier.contactEmail },
          ],
        });
      } catch (emailErr: any) {
        console.warn("Failed to send PO email:", emailErr.message);
      }
    }

    // Mark RFQ as completed
    if (rfqId) {
      const rfq = store.rfqs.get(rfqId);
      if (rfq) {
        rfq.status = "completed";

        // Notify unsuccessful suppliers in parallel
        if (notifyUnsuccessful) {
          const otherSupplierIds = rfq.suppliers
            .filter((s) => s.supplierId !== supplierId)
            .map((s) => s.supplierId);

          const rejectionPromises = otherSupplierIds.map(async (otherId) => {
            const otherSupplier = getSupplier(otherId);
            if (!otherSupplier) return;
            try {
              await sendEmailAsBuyer({
                subject: `RE: ${rfq.referenceNumber} — Thank you`,
                body: `
                  <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
                    <p>Dear ${otherSupplier.contactName},</p>
                    <p>Thank you for your quotation in response to our ${rfq.referenceNumber}.</p>
                    <p>After careful consideration, we have decided to place this order with another supplier on this occasion.</p>
                    <p>We appreciate your time and look forward to working with you on future opportunities.</p>
                    <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
                  </div>
                `,
                toRecipients: [
                  { name: otherSupplier.contactName, email: otherSupplier.contactEmail },
                ],
              });
            } catch (err: any) {
              console.warn(`Failed to notify ${otherSupplier.name}:`, err.message);
            }
          });

          await Promise.allSettled(rejectionPromises);
        }
      }
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/followup", async (req, res) => {
  try {
    const order = store.orders.get(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const supplier = getSupplier(order.supplierId);
    if (!supplier) return res.status(400).json({ error: "Supplier not found" });

    const buyerName = process.env.BUYER_NAME || "James Cooper";
    const buyerCompany = process.env.BUYER_COMPANY || "Meridian Industrial Supplies";

    const emailBody = `
      <div style="font-family: Segoe UI, sans-serif; max-width: 600px;">
        <p>Dear ${supplier.contactName},</p>
        <p>I'm writing to follow up on our purchase order <strong>${order.poNumber}</strong> 
        placed on ${new Date(order.createdAt).toLocaleDateString("en-GB")}.</p>
        <p>The expected delivery date was ${new Date(order.expectedDelivery).toLocaleDateString("en-GB")} 
        and we haven't yet received the goods.</p>
        <p>Could you please provide an update on the delivery status?</p>
        <p>Kind regards,<br/>${buyerName}<br/>${buyerCompany}</p>
      </div>
    `;

    try {
      await sendEmailAsBuyer({
        subject: `Follow-up: ${order.poNumber}`,
        body: emailBody,
        toRecipients: [
          { name: supplier.contactName, email: supplier.contactEmail },
        ],
      });
    } catch (emailErr: any) {
      console.warn("Failed to send follow-up email:", emailErr.message);
    }

    res.json({ message: "Follow-up sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
