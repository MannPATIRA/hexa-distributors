import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";

interface QuoteItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface QuoteData {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  items: QuoteItem[];
  subtotal: number;
  deliveryCost: number;
  landedTotal: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
  responseTimeHours: number;
}

interface SupplierInfo {
  id: string;
  name: string;
  onTimeDeliveryRate: number;
  responseTimeHours: number;
}

interface Props {
  rfqId: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function QuoteComparison({ rfqId, navigate, goBack }: Props) {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<QuoteData[]>(`/rfq/${rfqId}/compare`),
      api.get<SupplierInfo[]>("/suppliers"),
    ]).then(([quoteList, supList]) => {
      setQuotes(quoteList);
      setSuppliers(supList);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [rfqId]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quote Comparison</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quote Comparison</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-text">No quotes captured yet</div>
        </div>
      </div>
    );
  }

  // Gather all unique items across quotes
  const allSkus = new Set<string>();
  quotes.forEach((q) => q.items.forEach((it) => allSkus.add(it.sku || it.name)));

  // Find best/worst for highlighting
  const totals = quotes.map((q) => q.landedTotal);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);

  const leadTimes = quotes.map((q) => q.leadTimeDays).filter((d) => d > 0);
  const minLead = leadTimes.length > 0 ? Math.min(...leadTimes) : 0;
  const maxLead = leadTimes.length > 0 ? Math.max(...leadTimes) : 0;

  const getSupplierReliability = (supplierId: string) => {
    const sup = suppliers.find((s) => s.id === supplierId);
    return sup ? Math.round(sup.onTimeDeliveryRate * 100) : 0;
  };

  const reliabilities = quotes.map((q) => getSupplierReliability(q.supplierId));
  const maxReliability = Math.max(...reliabilities);

  // Summary
  const bestPriceQuote = quotes.find((q) => q.landedTotal === minTotal);
  const fastestQuote = quotes.find((q) => q.leadTimeDays === minLead && minLead > 0);
  const mostReliableQuote = quotes.find(
    (q) => getSupplierReliability(q.supplierId) === maxReliability
  );

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Quote Comparison</h1>
        <span className="header-badge">{quotes.length} quotes</span>
      </div>

      {/* Summary Badges */}
      <div className="section" style={{ paddingBottom: 0 }}>
        {bestPriceQuote && (
          <div className="badge badge-success" style={{ marginRight: 4, marginBottom: 4 }}>
            Best Price: {bestPriceQuote.supplierName} (£{bestPriceQuote.landedTotal.toFixed(0)})
          </div>
        )}
        {fastestQuote && (
          <div className="badge badge-info" style={{ marginRight: 4, marginBottom: 4 }}>
            Fastest: {fastestQuote.supplierName} ({fastestQuote.leadTimeDays}d)
          </div>
        )}
        {mostReliableQuote && (
          <div className="badge badge-warning" style={{ marginBottom: 4 }}>
            Most Reliable: {mostReliableQuote.supplierName} ({getSupplierReliability(mostReliableQuote.supplierId)}%)
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="comparison-container scroll-hint" style={{ marginTop: 8 }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="row-label"></th>
              {quotes.map((q) => (
                <th key={q.id}>{q.supplierName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Response Time */}
            <tr>
              <td className="row-label">Response Time</td>
              {quotes.map((q) => (
                <td key={q.id}>{q.responseTimeHours.toFixed(1)}h</td>
              ))}
            </tr>

            {/* Per-item unit prices */}
            {Array.from(allSkus).map((sku) => {
              const prices = quotes.map((q) => {
                const item = q.items.find((it) => (it.sku || it.name) === sku);
                return item?.unitPrice || null;
              });
              const validPrices = prices.filter((p) => p !== null) as number[];
              const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
              const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;

              const itemName =
                quotes
                  .flatMap((q) => q.items)
                  .find((it) => (it.sku || it.name) === sku)?.name || sku;

              return (
                <tr key={sku}>
                  <td className="row-label" style={{ fontSize: 10 }}>
                    {itemName.length > 25 ? itemName.substring(0, 25) + "..." : itemName}
                  </td>
                  {quotes.map((q, i) => {
                    const item = q.items.find((it) => (it.sku || it.name) === sku);
                    const price = item?.unitPrice;
                    const className =
                      price === minPrice && validPrices.length > 1
                        ? "best"
                        : price === maxPrice && validPrices.length > 1
                        ? "worst"
                        : "";
                    return (
                      <td key={q.id} className={className}>
                        {price != null ? `£${price.toFixed(2)}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Subtotal */}
            <tr>
              <td className="row-label" style={{ fontWeight: 600 }}>Subtotal</td>
              {quotes.map((q) => (
                <td key={q.id}>£{q.subtotal.toFixed(2)}</td>
              ))}
            </tr>

            {/* Delivery */}
            <tr>
              <td className="row-label">Delivery</td>
              {quotes.map((q) => (
                <td key={q.id}>
                  {q.deliveryCost === 0 ? "Free" : `£${q.deliveryCost.toFixed(2)}`}
                </td>
              ))}
            </tr>

            {/* Landed Total */}
            <tr>
              <td className="row-label" style={{ fontWeight: 600 }}>Landed Total</td>
              {quotes.map((q) => (
                <td
                  key={q.id}
                  className={
                    q.landedTotal === minTotal && quotes.length > 1
                      ? "best"
                      : q.landedTotal === maxTotal && quotes.length > 1
                      ? "worst"
                      : ""
                  }
                  style={{ fontWeight: 600 }}
                >
                  £{q.landedTotal.toFixed(2)}
                </td>
              ))}
            </tr>

            {/* Lead Time */}
            <tr>
              <td className="row-label">Lead Time</td>
              {quotes.map((q) => (
                <td
                  key={q.id}
                  className={
                    q.leadTimeDays === minLead && leadTimes.length > 1
                      ? "best"
                      : q.leadTimeDays === maxLead && leadTimes.length > 1
                      ? "worst"
                      : ""
                  }
                >
                  {q.leadTimeDays}d
                </td>
              ))}
            </tr>

            {/* Payment Terms */}
            <tr>
              <td className="row-label">Payment</td>
              {quotes.map((q) => (
                <td key={q.id}>{q.paymentTerms || "—"}</td>
              ))}
            </tr>

            {/* Validity */}
            <tr>
              <td className="row-label">Valid For</td>
              {quotes.map((q) => (
                <td key={q.id}>{q.validity || "—"}</td>
              ))}
            </tr>

            {/* On-Time Rate */}
            <tr>
              <td className="row-label">On-Time Rate</td>
              {quotes.map((q) => {
                const rate = getSupplierReliability(q.supplierId);
                return (
                  <td
                    key={q.id}
                    className={rate === maxReliability && quotes.length > 1 ? "best" : ""}
                  >
                    {rate}%
                  </td>
                );
              })}
            </tr>

            {/* Award buttons */}
            <tr>
              <td className="row-label"></td>
              {quotes.map((q) => (
                <td key={q.id} style={{ padding: 8 }}>
                  <button
                    className="btn btn-accent btn-sm btn-block"
                    onClick={() =>
                      navigate({
                        name: "award-order",
                        rfqId,
                        supplierId: q.supplierId,
                      })
                    }
                  >
                    Award
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
