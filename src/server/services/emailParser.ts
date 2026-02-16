export interface ExtractedLineItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ExtractedQuote {
  items: ExtractedLineItem[];
  subtotal: number;
  deliveryCost: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8212;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/&pound;/g, "£")
    .replace(/&euro;/g, "€")
    .replace(/\r/g, "");
}

export function extractQuoteFromEmail(rawBody: string): ExtractedQuote {
  const items: ExtractedLineItem[] = [];

  // Strip HTML tags if the body appears to be HTML
  const emailBody = rawBody.includes("<") && rawBody.includes(">")
    ? stripHtml(rawBody)
    : rawBody;

  const lines = emailBody.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Strategy: Look for lines with price patterns (£X.XX or €X.XX)
  // Since we control the simulation output, match the known formats

  // Pattern 1: Table row "| N | Description | Qty | £X.XX | £X.XX |"
  // Pattern 2: Inline "Description — NNN pcs — €X.XX/pc (£X.XX) — €X.XX"
  // Pattern 3: Simple "Description | Qty | £X.XX | £X.XX"
  // Pattern 4: Dash list "- Description: NNN units at £X.XX each = £X.XX"

  for (const line of lines) {
    // Table row pattern (RS Components, Anixter, Fabory)
    const tableMatch = line.match(
      /\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(\d[\d,]*)\s*\|\s*[£€]?([\d.]+)\s*\|\s*[£€]?([\d,.]+)\s*\|?/
    );
    if (tableMatch) {
      const name = tableMatch[1].trim();
      const qty = parseInt(tableMatch[2].replace(/,/g, ""));
      const unitPrice = parseFloat(tableMatch[3]);
      const total = parseFloat(tableMatch[4].replace(/,/g, ""));
      if (!isNaN(qty) && !isNaN(unitPrice)) {
        items.push({ name, qty, unitPrice, total: isNaN(total) ? qty * unitPrice : total });
      }
      continue;
    }

    // Fabory simple table: "Description | Qty | £X.XX | £X.XX"
    const simpleTableMatch = line.match(
      /^(.+?)\s*\|\s*(\d[\d,]*)\s*\|\s*[£€]([\d.]+)\s*\|\s*[£€]([\d,.]+)/
    );
    if (simpleTableMatch && !line.startsWith("Description") && !line.startsWith("Item")) {
      const name = simpleTableMatch[1].trim();
      const qty = parseInt(simpleTableMatch[2].replace(/,/g, ""));
      const unitPrice = parseFloat(simpleTableMatch[3]);
      const total = parseFloat(simpleTableMatch[4].replace(/,/g, ""));
      if (!isNaN(qty) && !isNaN(unitPrice) && name.length > 2) {
        items.push({ name, qty, unitPrice, total: isNaN(total) ? qty * unitPrice : total });
      }
      continue;
    }

    // Würth inline: "Item N: Description — NNN pcs — €X.XX/pc (£X.XX) — €X.XX"
    const wurthMatch = line.match(
      /Item\s*\d+:\s*(.+?)\s*[—–-]\s*(\d[\d,]*)\s*pcs?\s*[—–-]\s*[€£]([\d.]+)\/pc\s*\([£€]([\d.]+)\)\s*[—–-]\s*[€£]([\d,.]+)/
    );
    if (wurthMatch) {
      const name = wurthMatch[1].trim();
      const qty = parseInt(wurthMatch[2].replace(/,/g, ""));
      const unitPriceGBP = parseFloat(wurthMatch[4]);
      const total = qty * unitPriceGBP;
      if (!isNaN(qty) && !isNaN(unitPriceGBP)) {
        items.push({ name, qty, unitPrice: unitPriceGBP, total: Math.round(total * 100) / 100 });
      }
      continue;
    }

    // Brammer dash list: "- Description: NNN units at £X.XX each = £X.XX"
    const brammerMatch = line.match(
      /^-\s*(.+?):\s*(\d[\d,]*)\s*units?\s*at\s*[£€]([\d.]+)\s*each\s*=\s*[£€]([\d,.]+)/
    );
    if (brammerMatch) {
      const name = brammerMatch[1].trim();
      const qty = parseInt(brammerMatch[2].replace(/,/g, ""));
      const unitPrice = parseFloat(brammerMatch[3]);
      const total = parseFloat(brammerMatch[4].replace(/,/g, ""));
      if (!isNaN(qty) && !isNaN(unitPrice)) {
        items.push({ name, qty, unitPrice, total: isNaN(total) ? qty * unitPrice : total });
      }
      continue;
    }
  }

  // Extract subtotal
  let subtotal = items.reduce((s, it) => s + it.total, 0);
  const subtotalMatch = emailBody.match(/(?:Subtotal|Total)[:\s]*[£€]([\d,.]+)/i);
  if (subtotalMatch) {
    const parsed = parseFloat(subtotalMatch[1].replace(/,/g, ""));
    if (!isNaN(parsed)) subtotal = parsed;
  }

  // Extract delivery cost
  let deliveryCost = 0;
  const deliveryFreeMatch = emailBody.match(/(?:Delivery|Shipping)[:\s]*Free/i);
  if (!deliveryFreeMatch) {
    const deliveryCostMatch = emailBody.match(
      /(?:Delivery|Shipping)[^£€]*[£€]([\d,.]+)/i
    );
    if (deliveryCostMatch) {
      const parsed = parseFloat(deliveryCostMatch[1].replace(/,/g, ""));
      if (!isNaN(parsed)) deliveryCost = parsed;
    }
  }

  // Extract lead time
  let leadTimeDays = 0;
  const leadTimeMatch = emailBody.match(
    /(?:Lead\s*time|Delivery)[:\s]*(\d+)\s*(?:working\s*)?days?/i
  );
  if (leadTimeMatch) {
    leadTimeDays = parseInt(leadTimeMatch[1]);
  }

  // Extract payment terms
  let paymentTerms = "";
  const paymentMatch = emailBody.match(
    /(?:Payment\s*(?:terms)?|terms)[:\s]*(Net\s*\d+)/i
  );
  if (paymentMatch) {
    paymentTerms = paymentMatch[1];
  }

  // Extract validity
  let validity = "";
  const validityMatch = emailBody.match(
    /(?:Valid|Validity)[^:]*[:\s]*(\d+\s*days?)/i
  );
  if (validityMatch) {
    validity = validityMatch[1];
  }

  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryCost,
    leadTimeDays,
    paymentTerms,
    validity,
  };
}
