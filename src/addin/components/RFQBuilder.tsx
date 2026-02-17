import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";
import ItemPicker from "./ItemPicker";

interface Product {
  sku: string;
  name: string;
  unit: string;
  reorderQty: number;
  category: string;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  categories: string[];
  responseTimeHours: number;
  avgLeadTimeDays: number;
}

interface RFQItem {
  sku: string;
  name: string;
  qty: number;
  unit: string;
}

interface Props {
  initialSkus?: string[];
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function RFQBuilder({ initialSkus, navigate, goBack }: Props) {
  const { showToast } = useToast();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<RFQItem[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [quoteDeadline, setQuoteDeadline] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>("/products"),
      api.get<Supplier[]>("/suppliers"),
    ]).then(([prods, sups]) => {
      setAllProducts(prods);
      setAllSuppliers(sups);

      // Pre-populate items from initialSkus
      if (initialSkus && initialSkus.length > 0) {
        const initialItems = initialSkus
          .map((sku) => {
            const p = prods.find((pr) => pr.sku === sku);
            return p
              ? { sku: p.sku, name: p.name, qty: p.reorderQty, unit: p.unit }
              : null;
          })
          .filter(Boolean) as RFQItem[];
        setItems(initialItems);

        // Pre-select suppliers matching item categories
        const categories = new Set(
          initialItems.map((it) => prods.find((p) => p.sku === it.sku)?.category).filter(Boolean)
        );
        const matching = sups.filter((s) =>
          s.categories.some((c) => categories.has(c))
        );
        setSelectedSuppliers(new Set(matching.map((s) => s.id)));
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSupplier = (id: string) => {
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateItemQty = (sku: string, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.sku === sku ? { ...it, qty } : it))
    );
  };

  const removeItem = (sku: string) => {
    setItems((prev) => prev.filter((it) => it.sku !== sku));
  };

  const addItem = (sku: string) => {
    const p = allProducts.find((pr) => pr.sku === sku);
    if (!p || items.find((it) => it.sku === sku)) return;
    setItems((prev) => [
      ...prev,
      { sku: p.sku, name: p.name, qty: p.reorderQty, unit: p.unit },
    ]);
  };

  const handleSend = async () => {
    if (items.length === 0 || selectedSuppliers.size === 0) return;
    setSending(true);
    try {
      const result = await api.post<any>("/rfq", {
        items,
        supplierIds: Array.from(selectedSuppliers),
        quoteDeadline,
        deliveryDate,
        notes,
      });
      navigate({ name: "rfq-tracker", rfqId: result.id });
    } catch (err) {
      showToast("Failed to send RFQ. Check auth status.", "error");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>New RFQ</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>New RFQ</h1>
      </div>

      <div className="section">
        {/* Items Section */}
        <div className="section-heading">Items</div>
        {items.map((item) => (
          <div key={item.sku} className="detail-card" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.sku}</div>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: "none", color: "var(--danger)", padding: "2px 6px", border: "none" }}
                onClick={() => removeItem(item.sku)}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 6 }}>
              <label className="form-label">Qty ({item.unit}s)</label>
              <input
                type="number"
                className="form-input"
                value={item.qty}
                onChange={(e) => updateItemQty(item.sku, parseInt(e.target.value) || 0)}
                min={1}
                style={{ width: 100 }}
              />
            </div>
          </div>
        ))}

        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowPicker(true)}
          style={{ marginBottom: 16 }}
        >
          + Add Item
        </button>

        {showPicker && (
          <ItemPicker
            currentSkus={items.map((it) => it.sku)}
            allProducts={allProducts}
            allSuppliers={allSuppliers}
            onAdd={addItem}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Requirements Section */}
        <div className="section-heading" style={{ marginTop: 16 }}>Requirements</div>
        <div className="form-group">
          <label className="form-label">Required Delivery Date</label>
          <input
            type="date"
            className="form-input"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Quote Deadline</label>
          <input
            type="date"
            className="form-input"
            value={quoteDeadline}
            onChange={(e) => setQuoteDeadline(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requirements..."
          />
        </div>

        {/* Supplier Selection */}
        <div className="section-heading" style={{ marginTop: 16 }}>
          Select Suppliers ({selectedSuppliers.size} selected)
        </div>
        <div className="checkbox-list">
          {allSuppliers.map((sup) => (
            <div
              key={sup.id}
              className={`checkbox-item ${selectedSuppliers.has(sup.id) ? "checked" : ""}`}
              onClick={() => toggleSupplier(sup.id)}
            >
              <input
                type="checkbox"
                checked={selectedSuppliers.has(sup.id)}
                readOnly
              />
              <div className="checkbox-info">
                <div className="checkbox-name">{sup.name}</div>
                <div className="checkbox-meta">
                  {sup.categories.join(", ")} · Avg response: {sup.responseTimeHours}h · Lead: {sup.avgLeadTimeDays}d
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Send Button */}
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={handleSend}
          disabled={sending || items.length === 0 || selectedSuppliers.size === 0}
        >
          {sending
            ? "Sending..."
            : `Send RFQs to ${selectedSuppliers.size} Supplier${selectedSuppliers.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
