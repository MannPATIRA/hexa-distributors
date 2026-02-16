import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";

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
}

interface RFQData {
  id: string;
  referenceNumber: string;
  suppliers: { supplierId: string }[];
}

interface Props {
  rfqId: string;
  supplierId: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function AwardOrder({ rfqId, supplierId, navigate, goBack }: Props) {
  const { showToast } = useToast();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [notifyOthers, setNotifyOthers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [editItems, setEditItems] = useState<QuoteItem[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<QuoteData[]>(`/rfq/${rfqId}/compare`),
      api.get<RFQData>(`/rfq/${rfqId}`),
    ]).then(([quotes, rfqData]) => {
      const match = quotes.find((q) => q.supplierId === supplierId);
      setQuote(match || null);
      setRfq(rfqData);
      if (match) setEditItems(match.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [rfqId, supplierId]);

  const updateItem = (index: number, field: keyof QuoteItem, value: number) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "qty" || field === "unitPrice") {
        next[index].total = Math.round(next[index].qty * next[index].unitPrice * 100) / 100;
      }
      return next;
    });
  };

  const total = editItems.reduce((s, it) => s + it.total, 0);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (quote?.leadTimeDays || 7));

  const handleSend = async () => {
    if (!quote || !rfq) return;
    setSending(true);
    try {
      await api.post("/orders", {
        rfqId,
        supplierId,
        items: editItems,
        total: total + (quote.deliveryCost || 0),
        paymentTerms: quote.paymentTerms,
        expectedDelivery: deliveryDate.toISOString().split("T")[0],
        sendEmail: true,
        notifyUnsuccessful: notifyOthers,
      });
      setSent(true);
    } catch {
      showToast("Failed to send purchase order", "error");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Award Order</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Order Placed</h1>
        </div>
        <div className="section" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div className="section-heading">Purchase Order Sent</div>
          <p style={{ color: "var(--grey-600)", marginBottom: 16 }}>
            PO sent to {quote?.supplierName}.
            {notifyOthers && " Unsuccessful suppliers have been notified."}
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate({ name: "order-tracker" })}
          >
            View Order Tracker
          </button>
          <button
            className="btn btn-outline btn-block"
            style={{ marginTop: 8 }}
            onClick={() => navigate({ name: "dashboard" })}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Award Order</h1>
        </div>
        <div className="empty-state">
          <div className="empty-text">Quote not found for this supplier</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Award to {quote.supplierName}</h1>
      </div>

      <div className="section">
        {rfq && (
          <div className="badge badge-info" style={{ marginBottom: 12 }}>
            {rfq.referenceNumber}
          </div>
        )}

        <div className="section-heading">Purchase Order Items</div>
        {editItems.map((item, idx) => (
          <div key={idx} className="detail-card" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 6 }}>{item.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <div>
                <label className="form-label">Qty</label>
                <input
                  type="number"
                  className="form-input"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 0)}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label className="form-label">Unit £</label>
                <input
                  type="number"
                  className="form-input"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  step="0.01"
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label className="form-label">Total</label>
                <div style={{ padding: "8px 10px", fontWeight: 600, fontSize: 12 }}>
                  £{item.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="detail-card" style={{ marginTop: 12 }}>
          <div className="detail-row">
            <span className="detail-label">Subtotal</span>
            <span className="detail-value">£{total.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Delivery</span>
            <span className="detail-value">
              {quote.deliveryCost === 0 ? "Free" : `£${quote.deliveryCost.toFixed(2)}`}
            </span>
          </div>
          <div className="detail-row" style={{ borderTop: "1px solid var(--grey-200)", paddingTop: 8, marginTop: 4 }}>
            <span className="detail-label" style={{ fontWeight: 600, fontSize: 13 }}>Total</span>
            <span className="detail-value" style={{ fontSize: 15, color: "var(--primary)" }}>
              £{(total + quote.deliveryCost).toFixed(2)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Expected Delivery</span>
            <span className="detail-value">
              {deliveryDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Terms</span>
            <span className="detail-value">{quote.paymentTerms}</span>
          </div>
        </div>

        {/* Notify unsuccessful checkbox */}
        <div
          className="checkbox-item"
          style={{ marginTop: 12, cursor: "pointer" }}
          onClick={() => setNotifyOthers(!notifyOthers)}
        >
          <input type="checkbox" checked={notifyOthers} readOnly />
          <div className="checkbox-info">
            <div className="checkbox-name">Notify unsuccessful suppliers</div>
            <div className="checkbox-meta">
              Send courtesy emails to{" "}
              {(rfq?.suppliers.length || 1) - 1} other supplier(s)
            </div>
          </div>
        </div>

        {/* Send Button */}
        <button
          className="btn btn-accent btn-block"
          style={{ marginTop: 16 }}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send Purchase Order"}
        </button>
      </div>
    </div>
  );
}
