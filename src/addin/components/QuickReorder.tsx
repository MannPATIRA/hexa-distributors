import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";

interface Props {
  sku: string;
  supplierId?: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

interface ProductInfo {
  sku: string;
  name: string;
  unit: string;
  reorderQty: number;
  supplierHistory: {
    supplierId: string;
    supplierName: string;
    contactName: string;
    paymentTerms: string;
    lastPrice: number;
    avgLeadTimeDays: number;
  }[];
}

interface SupplierInfo {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  paymentTerms: string;
  avgLeadTimeDays: number;
}

export default function QuickReorder({ sku, supplierId, navigate, goBack }: Props) {
  const { showToast } = useToast();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId || "");
  const [qty, setQty] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<ProductInfo>(`/products/${sku}`),
      api.get<SupplierInfo[]>("/suppliers"),
    ]).then(([prod, sups]) => {
      setProduct(prod);
      setSuppliers(sups);
      setQty(prod.reorderQty);
      if (supplierId) {
        const sh = prod.supplierHistory.find((s) => s.supplierId === supplierId);
        if (sh) setUnitPrice(sh.lastPrice);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sku, supplierId]);

  useEffect(() => {
    if (product && selectedSupplierId) {
      const sh = product.supplierHistory.find(
        (s) => s.supplierId === selectedSupplierId
      );
      if (sh) setUnitPrice(sh.lastPrice);
    }
  }, [selectedSupplierId, product]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const total = qty * unitPrice;
  const deliveryDate = new Date();
  deliveryDate.setDate(
    deliveryDate.getDate() + (selectedSupplier?.avgLeadTimeDays || 7)
  );

  const handleSend = async () => {
    if (!product || !selectedSupplier) return;
    setSending(true);
    try {
      await api.post("/orders", {
        supplierId: selectedSupplierId,
        items: [
          {
            sku: product.sku,
            name: product.name,
            qty,
            unitPrice,
            total,
          },
        ],
        total,
        paymentTerms: selectedSupplier.paymentTerms,
        expectedDelivery: deliveryDate.toISOString().split("T")[0],
        sendEmail: true,
      });
      setSent(true);
    } catch (err) {
      showToast("Failed to send order. Check auth status.", "error");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Quick Reorder</h1>
        </div>
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Order Sent</h1>
        </div>
        <div className="section" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div className="section-heading">Purchase Order Sent</div>
          <p style={{ color: "var(--grey-600)", marginBottom: 16 }}>
            PO has been emailed to {selectedSupplier?.contactName} at{" "}
            {selectedSupplier?.name}.
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

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Quick Reorder</h1>
      </div>

      <div className="section">
        {/* Supplier Selection */}
        <div className="form-group">
          <label className="form-label">Supplier</label>
          <select
            className="form-select"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.contactName}
              </option>
            ))}
          </select>
        </div>

        {/* Item */}
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Item</span>
            <span className="detail-value">{product?.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">SKU</span>
            <span className="detail-value">{product?.sku}</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input
            type="number"
            className="form-input"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            min={1}
          />
        </div>

        {/* Unit Price */}
        <div className="form-group">
          <label className="form-label">Unit Price (£)</label>
          <input
            type="number"
            className="form-input"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            step="0.01"
            min={0}
          />
        </div>

        {/* Summary */}
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Total</span>
            <span className="detail-value" style={{ fontSize: 14 }}>
              £{total.toFixed(2)}
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
            <span className="detail-value">
              {selectedSupplier?.paymentTerms || "—"}
            </span>
          </div>
        </div>

        {/* Send Button */}
        <button
          className="btn btn-accent btn-block"
          onClick={handleSend}
          disabled={sending || !selectedSupplierId || qty <= 0}
        >
          {sending ? "Sending..." : "Send Purchase Order"}
        </button>
      </div>
    </div>
  );
}
