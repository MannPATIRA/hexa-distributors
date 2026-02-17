import { v4 as uuid } from "uuid";
import { RFQ, store, SimulationTask, Quote } from "../store";
import { getSupplier, Supplier } from "../data/suppliers";
import { getHistoryForProductAndSupplier } from "../data/priceHistory";
import { sendEmailAsSupplier } from "./graph";

const REPLY_DELAY = parseInt(process.env.SUPPLIER_REPLY_DELAY_SECONDS || "30") * 1000;

// Bossard (sup-006) never replies to simulate non-response
const NON_RESPONDING_SUPPLIERS = ["sup-006"];

interface QuoteItem {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface SimQuote {
  items: QuoteItem[];
  subtotal: number;
  deliveryCost: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
}

function generatePricing(rfq: RFQ, supplier: Supplier): SimQuote {
  const items: QuoteItem[] = rfq.items.map((item) => {
    const history = getHistoryForProductAndSupplier(item.sku, supplier.id);
    let basePrice = history?.prices[0]?.unitPrice || 1.0;

    // Add some variation (±15%) to make quotes different
    const variation = 0.85 + Math.random() * 0.30;
    let unitPrice = Math.round(basePrice * variation * 100) / 100;

    // Supplier-specific pricing tendencies
    switch (supplier.id) {
      case "sup-001": // RS Components — slightly above market, reliable
        unitPrice = Math.round(basePrice * (1.0 + Math.random() * 0.05) * 100) / 100;
        break;
      case "sup-002": // Würth — cheapest but slow
        unitPrice = Math.round(basePrice * (0.88 + Math.random() * 0.06) * 100) / 100;
        break;
      case "sup-003": // Fabory — premium but fastest
        unitPrice = Math.round(basePrice * (1.05 + Math.random() * 0.08) * 100) / 100;
        break;
      case "sup-004": // Brammer — mid-range
        unitPrice = Math.round(basePrice * (0.95 + Math.random() * 0.10) * 100) / 100;
        break;
      case "sup-005": // Anixter — mid to high
        unitPrice = Math.round(basePrice * (1.0 + Math.random() * 0.10) * 100) / 100;
        break;
    }

    return {
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      unitPrice,
      total: Math.round(unitPrice * item.qty * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);

  let deliveryCost = 0;
  let leadTimeDays = supplier.avgLeadTimeDays;
  let validity = "14 days";

  switch (supplier.id) {
    case "sup-001":
      deliveryCost = 0; // free delivery
      leadTimeDays = 5;
      validity = "14 days";
      break;
    case "sup-002":
      deliveryCost = 45;
      leadTimeDays = 8;
      validity = "21 days";
      break;
    case "sup-003":
      deliveryCost = 25;
      leadTimeDays = 4;
      validity = "14 days";
      break;
    case "sup-004":
      deliveryCost = 0;
      leadTimeDays = 3;
      validity = "14 days";
      break;
    case "sup-005":
      deliveryCost = 15;
      leadTimeDays = 6;
      validity = "21 days";
      break;
  }

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryCost,
    leadTimeDays,
    paymentTerms: supplier.paymentTerms,
    validity,
  };
}

function htmlTable(headers: string[], rows: string[][]): string {
  const thStyle = 'style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;text-align:left;font-size:13px;"';
  const tdStyle = 'style="padding:6px 10px;border:1px solid #ddd;font-size:13px;"';
  const ths = headers.map((h) => `<th ${thStyle}>${h}</th>`).join("");
  const trs = rows.map((row) => `<tr>${row.map((c) => `<td ${tdStyle}>${c}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;margin:12px 0;">\n<thead><tr>${ths}</tr></thead>\n<tbody>${trs}</tbody>\n</table>`;
}

function generateRSComponentsReply(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  const buyerName = (process.env.BUYER_NAME || "James").split(" ")[0];
  const rows = quote.items.map((it, i) => [
    String(i + 1), it.name, String(it.qty), `£${it.unitPrice.toFixed(2)}`, `£${it.total.toFixed(2)}`
  ]);
  const table = htmlTable(["Item", "Description", "Qty", "Unit Price (GBP)", "Total"], rows);

  return `<div style="font-family:Segoe UI,sans-serif;font-size:14px;">
<p>Hi ${buyerName},</p>
<p>Thanks for the enquiry. Please find our pricing below for the items requested:</p>
${table}
<p>Subtotal: £${quote.subtotal.toFixed(2)}<br/>
Delivery: Free (mainland UK)<br/>
Lead time: ${quote.leadTimeDays} working days from PO receipt<br/>
Payment terms: ${quote.paymentTerms}</p>
<p>Quote valid for ${quote.validity}. Happy to discuss if you need anything adjusted.</p>
<p>Best regards,<br/><strong>${supplier.contactName}</strong><br/>Account Manager — Industrial Distribution<br/>RS Components</p>
</div>`;
}

function generateWurthReply(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  const lastName = (process.env.BUYER_NAME || "Cooper").split(" ").pop() || "Cooper";
  const quoteRef = `WUR-Q-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const itemLines = quote.items
    .map(
      (it, i) =>
        `Item ${i + 1}: ${it.name} — ${it.qty} pcs — €${(it.unitPrice * 1.16).toFixed(2)}/pc (£${it.unitPrice.toFixed(2)}) — €${(it.total * 1.16).toFixed(2)}`
    )
    .join("<br/>");

  const euroTotal = (quote.subtotal * 1.16).toFixed(2);

  return `<div style="font-family:Segoe UI,sans-serif;font-size:14px;">
<p>Dear Mr ${lastName},</p>
<p>Thank you for your Request for Quotation ref. ${rfq.referenceNumber}.</p>
<p>We are pleased to submit the following quotation:</p>
<p><strong>QUOTATION REF: ${quoteRef}</strong></p>
<p>${itemLines}</p>
<p>Total: €${euroTotal} (approx. £${quote.subtotal.toFixed(2)})<br/>
Delivery: ${quote.leadTimeDays} working days ex-works Germany. Shipping to UK: €${quote.deliveryCost.toFixed(2)}<br/>
Payment: ${quote.paymentTerms}<br/>
Minimum order: As quoted<br/>
Validity: ${quote.validity}</p>
<p><em>Please note all prices are subject to our General Terms and Conditions.</em></p>
<p>Mit freundlichen Grüßen / Kind regards,<br/><strong>${supplier.contactName}</strong><br/>Export Sales — Fastener Division<br/>Würth Group</p>
</div>`;
}

function generateFaboryReply(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  const buyerName = (process.env.BUYER_NAME || "James").split(" ")[0];
  const rows = quote.items.map((it) => [
    it.name, String(it.qty), `£${it.unitPrice.toFixed(2)}`, `£${it.total.toFixed(2)}`
  ]);
  const table = htmlTable(["Description", "Qty", "Unit Price", "Total"], rows);

  return `<div style="font-family:Segoe UI,sans-serif;font-size:14px;">
<p>Hello ${buyerName},</p>
<p>Thank you for your enquiry ${rfq.referenceNumber}. Here is our quotation:</p>
${table}
<p>Subtotal: £${quote.subtotal.toFixed(2)}<br/>
Shipping: £${quote.deliveryCost.toFixed(2)} (Netherlands warehouse, DDP UK)<br/>
Lead time: ${quote.leadTimeDays} working days<br/>
Payment: ${quote.paymentTerms}<br/>
Valid for: ${quote.validity}</p>
<p>Let me know if you have any questions.</p>
<p>Kind regards,<br/><strong>${supplier.contactName}</strong><br/>Fabory — Your Fastener Partner</p>
</div>`;
}

function generateBrammerReply(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  const firstName = (process.env.BUYER_NAME || "James").split(" ")[0];

  const itemLines = quote.items
    .map((it) => `- ${it.name}: ${it.qty} units at £${it.unitPrice.toFixed(2)} each = £${it.total.toFixed(2)}`)
    .join("<br/>");

  return `<div style="font-family:Segoe UI,sans-serif;font-size:14px;">
<p>Hi ${firstName},</p>
<p>Good to hear from you! Here's what we can do on ${rfq.referenceNumber}:</p>
<p>${itemLines}</p>
<p>That comes to £${quote.subtotal.toFixed(2)} all in — free delivery as usual for you.</p>
<p>We can get this to you within ${quote.leadTimeDays} working days, probably sooner as we've got good stock at the moment.</p>
<p>Standard ${quote.paymentTerms} terms apply. Quote's good for ${quote.validity}.</p>
<p>Give me a shout if you need anything else.</p>
<p>Cheers,<br/><strong>${supplier.contactName}</strong><br/>Brammer Buck &amp; Hickman</p>
</div>`;
}

function generateAnixterReply(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  const lastName = (process.env.BUYER_NAME || "Cooper").split(" ").pop() || "Cooper";
  const quoteRef = `WESCO-${Math.floor(100000 + Math.random() * 900000)}`;
  const rows = quote.items.map((it, i) => [
    String(i + 1), it.name, it.sku, String(it.qty), `£${it.unitPrice.toFixed(2)}`, `£${it.total.toFixed(2)}`
  ]);
  const table = htmlTable(["#", "Description", "Part No.", "Qty", "Unit Price", "Line Total"], rows);

  return `<div style="font-family:Segoe UI,sans-serif;font-size:14px;">
<p>Dear Mr ${lastName},</p>
<p>Re: ${rfq.referenceNumber}</p>
<p>Please find below our formal quotation reference <strong>${quoteRef}</strong>:</p>
${table}
<p>Subtotal: £${quote.subtotal.toFixed(2)}<br/>
Delivery charge: £${quote.deliveryCost.toFixed(2)}<br/>
Total: £${(quote.subtotal + quote.deliveryCost).toFixed(2)}</p>
<p>Delivery: ${quote.leadTimeDays} working days from order confirmation<br/>
Payment terms: ${quote.paymentTerms}<br/>
Quotation validity: ${quote.validity}</p>
<p style="font-size:11px;color:#666;">TERMS AND CONDITIONS:<br/>
- All prices are exclusive of VAT<br/>
- Prices are valid for the quantities quoted<br/>
- Delivery dates are estimates and may vary based on stock availability<br/>
- Returns subject to a 15% restocking charge</p>
<p>Kind regards,<br/><strong>${supplier.contactName}</strong><br/>Senior Account Manager<br/>Anixter (WESCO International)</p>
</div>`;
}

function generateReplyBody(rfq: RFQ, supplier: Supplier, quote: SimQuote): string {
  switch (supplier.id) {
    case "sup-001": return generateRSComponentsReply(rfq, supplier, quote);
    case "sup-002": return generateWurthReply(rfq, supplier, quote);
    case "sup-003": return generateFaboryReply(rfq, supplier, quote);
    case "sup-004": return generateBrammerReply(rfq, supplier, quote);
    case "sup-005": return generateAnixterReply(rfq, supplier, quote);
    default: return generateRSComponentsReply(rfq, supplier, quote);
  }
}

export function scheduleSupplierReplies(rfq: RFQ): void {
  const replyingSuppliers = rfq.suppliers.filter(
    (s) => !NON_RESPONDING_SUPPLIERS.includes(s.supplierId)
  );

  replyingSuppliers.forEach((supplierStatus, index) => {
    const delay = REPLY_DELAY * (index + 1);
    const scheduledFor = new Date(Date.now() + delay).toISOString();

    const task: SimulationTask = {
      rfqId: rfq.id,
      supplierId: supplierStatus.supplierId,
      status: "scheduled",
      scheduledFor,
    };
    store.simulationTasks.push(task);

    setTimeout(async () => {
      try {
        const supplier = getSupplier(supplierStatus.supplierId);
        if (!supplier) {
          task.status = "failed";
          return;
        }

        const quote = generatePricing(rfq, supplier);
        const bodyHtml = generateReplyBody(rfq, supplier, quote);

        const buyerEmail = process.env.BUYER_EMAIL || "";
        const buyerName = process.env.BUYER_NAME || "James Cooper";

        await sendEmailAsSupplier({
          subject: `[${supplier.name}] RE: ${rfq.referenceNumber} — Request for Quotation`,
          body: bodyHtml,
          toRecipients: [{ name: buyerName, email: buyerEmail }],
          fromName: supplier.name,
        });

        // Update RFQ supplier status
        const currentRfq = store.rfqs.get(rfq.id);
        const now = new Date().toISOString();
        if (currentRfq) {
          const ss = currentRfq.suppliers.find(
            (s) => s.supplierId === supplierStatus.supplierId
          );
          if (ss) {
            ss.status = "responded";
            ss.respondedAt = now;
          }
        }

        // Auto-capture the quote into the store (we have the structured data)
        const sentAt = new Date(supplierStatus.sentAt).getTime();
        const responseTimeHours = Math.round((Date.now() - sentAt) / 3600000 * 10) / 10;

        const capturedQuote: Quote = {
          id: uuid(),
          rfqId: rfq.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: quote.items.map((it) => ({
            sku: rfq.items.find((ri) => ri.name === it.name)?.sku || it.sku,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unitPrice,
            total: it.total,
          })),
          subtotal: quote.subtotal,
          deliveryCost: quote.deliveryCost,
          landedTotal: quote.subtotal + quote.deliveryCost,
          leadTimeDays: quote.leadTimeDays,
          paymentTerms: quote.paymentTerms,
          validity: quote.validity,
          capturedAt: now,
          responseTimeHours,
        };
        store.quotes.set(capturedQuote.id, capturedQuote);

        task.status = "sent";
        task.sentAt = now;
        console.log(
          `[Simulation] Sent reply from ${supplier.name} for ${rfq.referenceNumber} (quote auto-captured)`
        );
      } catch (err: any) {
        task.status = "failed";
        console.error(
          `[Simulation] Failed to send reply for ${supplierStatus.supplierId}:`,
          err.message
        );
      }
    }, delay);

    console.log(
      `[Simulation] Scheduled reply from ${supplierStatus.supplierId} in ${delay / 1000}s`
    );
  });
}

export function triggerManualSimulation(rfqId: string): void {
  const rfq = store.rfqs.get(rfqId);
  if (!rfq) throw new Error("RFQ not found");
  scheduleSupplierReplies(rfq);
}
