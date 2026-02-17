import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";

interface ExtractedItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ExtractedQuote {
  items: ExtractedItem[];
  subtotal: number;
  deliveryCost: number;
  leadTimeDays: number;
  paymentTerms: string;
  validity: string;
}

interface SupplierInfo {
  id: string;
  name: string;
  contactName: string;
}

interface RFQData {
  id: string;
  referenceNumber: string;
  items: { sku: string; name: string; qty: number }[];
  suppliers: { supplierId: string; status: string }[];
}

interface Props {
  rfqId: string;
  emailBody?: string;
  senderEmail?: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function QuoteCapture({
  rfqId,
  emailBody,
  senderEmail,
  navigate,
  goBack,
}: Props) {
  const { showToast } = useToast();
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [extracted, setExtracted] = useState<ExtractedQuote | null>(null);
  const [editItems, setEditItems] = useState<ExtractedItem[]>([]);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validity, setValidity] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const isRefNumber = /^RFQ-/i.test(rfqId);

    const findRfq = isRefNumber
      ? api.get<RFQData[]>("/rfq").then((list) => {
          const num = rfqId.replace(/\D/g, "");
          return list.find((r) => r.referenceNumber.includes(num)) || list[0] || null;
        })
      : api.get<RFQData>(`/rfq/${rfqId}`).catch(() =>
          // Fallback: maybe rfqId is a partial number, search the list
          api.get<RFQData[]>("/rfq").then((list) => {
            const num = rfqId.replace(/\D/g, "");
            return list.find((r) => r.referenceNumber.includes(num)) || list[0] || null;
          })
        );

    Promise.all([
      findRfq,
      api.get<SupplierInfo[]>("/suppliers"),
    ]).then(async ([rfqData, supList]) => {
      setRfq(rfqData as RFQData);
      setSuppliers(supList);

      // Auto-select supplier if email body provided
      if (emailBody) {
        try {
          const result = await api.post<ExtractedQuote>("/quotes/extract", {
            emailBody,
            rfqId: (rfqData as RFQData).id,
          });
          setExtracted(result);
          setEditItems(result.items);
          setDeliveryCost(result.deliveryCost);
          setLeadTimeDays(result.leadTimeDays);
          setPaymentTerms(result.paymentTerms);
          setValidity(result.validity);
        } catch {
          // Extraction failed — user can enter manually
        }
      }

      // Try to detect supplier from pending list
      const rfqObj = rfqData as RFQData;
      const pending = rfqObj.suppliers.filter((s) => s.status === "pending" || s.status === "responded");
      if (pending.length === 1) {
        setSelectedSupplierId(pending[0].supplierId);
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [rfqId, emailBody]);

  const updateItem = (index: number, field: keyof ExtractedItem, value: number) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "qty" || field === "unitPrice") {
        next[index].total = Math.round(next[index].qty * next[index].unitPrice * 100) / 100;
      }
      return next;
    });
  };

  const subtotal = editItems.reduce((s, it) => s + it.total, 0);

  const handleCapture = async () => {
    if (!rfq || !selectedSupplierId) return;
    setSaving(true);
    try {
      await api.post("/quotes/capture", {
        rfqId: rfq.id,
        supplierId: selectedSupplierId,
        items: editItems.map((it, i) => ({
          sku: rfq.items[i]?.sku || "",
          name: it.name,
          qty: it.qty,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        subtotal,
        deliveryCost,
        leadTimeDays,
        paymentTerms,
        validity,
      });
      setSaved(true);
    } catch {
      showToast("Failed to capture quote", "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Capture Quote</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quote Captured</h1>
        </div>
        <div className="section" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div className="section-heading">Quote Saved</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            Quote from {suppliers.find((s) => s.id === selectedSupplierId)?.name} has been captured.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate({ name: "rfq-tracker", rfqId: rfq?.id })}
          >
            Back to RFQ Tracker
          </button>
          {rfq && (
            <button
              className="btn btn-outline btn-block"
              style={{ marginTop: 8 }}
              onClick={() => navigate({ name: "quote-comparison", rfqId: rfq.id })}
            >
              Compare Quotes
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Capture Quote</h1>
      </div>

      <div className="section">
        {rfq && (
          <div className="badge badge-info" style={{ marginBottom: 12 }}>
            Response to {rfq.referenceNumber}
          </div>
        )}

        {/* Supplier Selection */}
        <div className="form-group">
          <label className="form-label">From Supplier</label>
          <select
            className="form-select"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">Select supplier...</option>
            {rfq?.suppliers.map((ss) => {
              const sup = suppliers.find((s) => s.id === ss.supplierId);
              return (
                <option key={ss.supplierId} value={ss.supplierId}>
                  {sup?.name || ss.supplierId}
                  {ss.status === "responded" ? " (already captured)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Extracted Items */}
        <div className="section-heading">Quoted Items</div>
        {editItems.length === 0 && (
          <div className="empty-state" style={{ padding: 16 }}>
            <div className="empty-text">
              No items extracted automatically. Add items manually below.
            </div>
          </div>
        )}
        {editItems.map((item, idx) => (
          <div key={idx} className="detail-card" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 6 }}>{item.name}</div>
              <button
                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
                onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
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

        {/* Add item manually */}
        {rfq && rfq.items.filter((ri) => !editItems.find((ei) => ei.name === ri.name)).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <select
              className="form-select"
              value=""
              onChange={(e) => {
                const ri = rfq.items.find((i) => i.sku === e.target.value);
                if (ri) {
                  setEditItems((prev) => [...prev, {
                    name: ri.name,
                    qty: ri.qty,
                    unitPrice: 0,
                    total: 0,
                  }]);
                }
              }}
            >
              <option value="" disabled>+ Add item manually...</option>
              {rfq.items
                .filter((ri) => !editItems.find((ei) => ei.name === ri.name))
                .map((ri) => (
                  <option key={ri.sku} value={ri.sku}>{ri.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Summary Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Lead Time (days)</label>
            <input
              type="number"
              className="form-input"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Cost (£)</label>
            <input
              type="number"
              className="form-input"
              value={deliveryCost}
              onChange={(e) => setDeliveryCost(parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Terms</label>
            <input
              type="text"
              className="form-input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Net 30"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Validity</label>
            <input
              type="text"
              className="form-input"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              placeholder="e.g. 14 days"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="detail-card" style={{ marginTop: 8 }}>
          <div className="detail-row">
            <span className="detail-label">Subtotal</span>
            <span className="detail-value">£{subtotal.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Delivery</span>
            <span className="detail-value">
              {deliveryCost === 0 ? "Free" : `£${deliveryCost.toFixed(2)}`}
            </span>
          </div>
          <div className="detail-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
            <span className="detail-label" style={{ fontWeight: 600 }}>Landed Total</span>
            <span className="detail-value" style={{ fontSize: 14 }}>
              £{(subtotal + deliveryCost).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Capture Button */}
        <button
          className="btn btn-accent btn-block"
          style={{ marginTop: 16 }}
          onClick={handleCapture}
          disabled={saving || !selectedSupplierId || editItems.length === 0}
        >
          {saving ? "Saving..." : "Capture Quote"}
        </button>

        {/* Email Body Preview */}
        {emailBody && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
              View original email text
            </summary>
            <div className="email-preview" style={{ marginTop: 8 }}>
              {emailBody.substring(0, 2000)}
              {emailBody.length > 2000 && "..."}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
