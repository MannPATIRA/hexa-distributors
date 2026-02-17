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

      {/* Supplier Cards */}
      <div className="comparison-cards" style={{ marginTop: 8 }}>
        {quotes.map((q) => {
          const rate = getSupplierReliability(q.supplierId);
          const isBestPrice = q.landedTotal === minTotal && quotes.length > 1;
          const isWorstPrice = q.landedTotal === maxTotal && quotes.length > 1;
          const isFastest = q.leadTimeDays === minLead && leadTimes.length > 1;
          const isSlowest = q.leadTimeDays === maxLead && leadTimes.length > 1;
          const isMostReliable = rate === maxReliability && quotes.length > 1;

          const winsCount = [isBestPrice, isFastest, isMostReliable].filter(Boolean).length;
          const isOverallBest = winsCount >= 2;

          return (
            <div className="comparison-card" key={q.id}>
              <div className="comparison-card-header">
                <span className="supplier-name">{q.supplierName}</span>
                {isOverallBest && <span className="card-badge">Best Overall</span>}
              </div>

              <div className="comparison-card-body">
                <div className="comparison-row">
                  <span className="row-label">Response Time</span>
                  <span className="row-value">{q.responseTimeHours.toFixed(1)}h</span>
                </div>

                {Array.from(allSkus).map((sku) => {
                  const item = q.items.find((it) => (it.sku || it.name) === sku);
                  const price = item?.unitPrice;
                  const allPrices = quotes
                    .map((oq) => oq.items.find((it) => (it.sku || it.name) === sku)?.unitPrice ?? null)
                    .filter((p) => p !== null) as number[];
                  const minP = allPrices.length > 0 ? Math.min(...allPrices) : 0;
                  const maxP = allPrices.length > 0 ? Math.max(...allPrices) : 0;
                  const cls =
                    price === minP && allPrices.length > 1
                      ? "best"
                      : price === maxP && allPrices.length > 1
                      ? "worst"
                      : "";

                  const itemName =
                    quotes.flatMap((oq) => oq.items).find((it) => (it.sku || it.name) === sku)?.name || sku;

                  return (
                    <div className="comparison-row" key={sku}>
                      <span className="row-label">{itemName}</span>
                      <span className={`row-value ${cls}`}>
                        {price != null ? `£${price.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  );
                })}

                <div className="comparison-row">
                  <span className="row-label">Subtotal</span>
                  <span className="row-value">£{q.subtotal.toFixed(2)}</span>
                </div>

                <div className="comparison-row">
                  <span className="row-label">Delivery</span>
                  <span className="row-value">
                    {q.deliveryCost === 0 ? "Free" : `£${q.deliveryCost.toFixed(2)}`}
                  </span>
                </div>

                <div className="comparison-row separator highlight">
                  <span className="row-label">Landed Total</span>
                  <span className={`row-value ${isBestPrice ? "best" : isWorstPrice ? "worst" : ""}`}>
                    £{q.landedTotal.toFixed(2)}
                  </span>
                </div>

                <div className="comparison-row">
                  <span className="row-label">Lead Time</span>
                  <span className={`row-value ${isFastest ? "best" : isSlowest ? "worst" : ""}`}>
                    {q.leadTimeDays}d
                  </span>
                </div>

                <div className="comparison-row">
                  <span className="row-label">Payment</span>
                  <span className="row-value">{q.paymentTerms || "—"}</span>
                </div>

                <div className="comparison-row">
                  <span className="row-label">Valid For</span>
                  <span className="row-value">{q.validity || "—"}</span>
                </div>

                <div className="comparison-row">
                  <span className="row-label">On-Time Rate</span>
                  <span className={`row-value ${isMostReliable ? "best" : ""}`}>
                    {rate}%
                  </span>
                </div>
              </div>

              <div className="comparison-card-footer">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
