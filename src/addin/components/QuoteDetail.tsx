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
  capturedAt: string;
  responseTimeHours: number;
}

interface RFQData {
  id: string;
  referenceNumber: string;
}

interface Props {
  rfqId: string;
  supplierId?: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function QuoteDetail({ rfqId, supplierId, navigate, goBack }: Props) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [allQuotes, setAllQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isRefNumber = /^RFQ-/i.test(rfqId);

    const findRfq = isRefNumber
      ? api.get<RFQData[]>("/rfq").then((list) => {
          const num = rfqId.replace(/\D/g, "");
          return list.find((r) => r.referenceNumber.includes(num)) || null;
        })
      : api.get<RFQData>(`/rfq/${rfqId}`).catch(() =>
          api.get<RFQData[]>("/rfq").then((list) => {
            const num = rfqId.replace(/\D/g, "");
            return list.find((r) => r.referenceNumber.includes(num)) || null;
          })
        );

    findRfq.then(async (rfqData) => {
      if (!rfqData) { setLoading(false); return; }
      setRfq(rfqData);

      const quotes = await api.get<QuoteData[]>(`/rfq/${rfqData.id}/compare`);
      setAllQuotes(quotes);

      // Find the specific quote if supplierId is given, otherwise show the latest
      const match = supplierId
        ? quotes.find((q) => q.supplierId === supplierId)
        : quotes[quotes.length - 1];
      setQuote(match || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [rfqId, supplierId]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quote Details</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (!quote || !rfq) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quote Details</h1>
        </div>
        <div className="empty-state">
          <div className="empty-text">No quote found for this email</div>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => navigate({ name: "rfq-tracker" })}
          >
            Go to RFQ Tracker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Quote from {quote.supplierName}</h1>
      </div>

      <div className="section">
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span className="badge badge-info">{rfq.referenceNumber}</span>
          <span className="badge badge-success">Auto-captured</span>
        </div>

        {/* Items */}
        <div className="section-heading">Quoted Items</div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>£{item.unitPrice.toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>£{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="detail-card" style={{ marginTop: 12 }}>
          <div className="detail-row">
            <span className="detail-label">Subtotal</span>
            <span className="detail-value">£{quote.subtotal.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Delivery</span>
            <span className="detail-value">
              {quote.deliveryCost === 0 ? "Free" : `£${quote.deliveryCost.toFixed(2)}`}
            </span>
          </div>
          <div className="detail-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
            <span className="detail-label" style={{ fontWeight: 600 }}>Landed Total</span>
            <span className="detail-value" style={{ fontSize: 14, color: "var(--primary)" }}>
              £{quote.landedTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="detail-card" style={{ marginTop: 8 }}>
          <div className="detail-row">
            <span className="detail-label">Lead Time</span>
            <span className="detail-value">{quote.leadTimeDays} working days</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Terms</span>
            <span className="detail-value">{quote.paymentTerms}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Validity</span>
            <span className="detail-value">{quote.validity}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Response Time</span>
            <span className="detail-value">{quote.responseTimeHours}h</span>
          </div>
        </div>

        {/* Actions */}
        {allQuotes.length >= 2 && (
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            onClick={() => navigate({ name: "quote-comparison", rfqId: rfq.id })}
          >
            Compare {allQuotes.length} Quotes
          </button>
        )}

        <button
          className="btn btn-outline btn-block"
          style={{ marginTop: 8 }}
          onClick={() => navigate({ name: "rfq-tracker", rfqId: rfq.id })}
        >
          Back to RFQ Tracker
        </button>
      </div>
    </div>
  );
}
