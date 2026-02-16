import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";

interface ReorderItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  reorderQty: number;
  urgency: "critical" | "warning" | "normal";
  lastSupplierName: string | null;
  lastUnitPrice: number | null;
}

interface Props {
  navigate: (screen: Screen) => void;
}

export default function Dashboard({ navigate }: Props) {
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfqCount, setRfqCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<ReorderItem[]>("/reorders"),
      api.get<any[]>("/rfq").catch(() => []),
      api.get<any[]>("/orders").catch(() => []),
    ]).then(([reorders, rfqs, orders]) => {
      setItems(reorders);
      setRfqCount(rfqs.filter((r: any) => r.status === "active").length);
      setOrderCount(orders.filter((o: any) =>
        o.status !== "delivered" &&
        new Date(o.expectedDelivery) < new Date()
      ).length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const criticalCount = items.filter((i) => i.urgency === "critical").length;

  return (
    <div className="fade-in">
      {/* Logo Header */}
      <div className="hexa-logo">
        <div className="logo-mark">H</div>
        <div className="logo-text">Hexa</div>
        <div className="logo-sub">Procurement</div>
        <button
          onClick={() => navigate({ name: "settings" })}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--grey-500)",
            padding: "4px 2px",
            lineHeight: 1,
          }}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className={`summary-card ${criticalCount > 0 ? "has-critical" : ""}`}>
          <div className="card-number">{loading ? "—" : items.length}</div>
          <div className="card-label">Items to Reorder</div>
        </div>
        <div className={`summary-card ${rfqCount > 0 ? "has-warning" : ""}`}
             onClick={() => navigate({ name: "rfq-tracker" })}>
          <div className="card-number">{loading ? "—" : rfqCount}</div>
          <div className="card-label">Active RFQs</div>
        </div>
        <div className={`summary-card ${orderCount > 0 ? "has-critical" : ""}`}
             onClick={() => navigate({ name: "order-tracker" })}>
          <div className="card-number">{loading ? "—" : orderCount}</div>
          <div className="card-label">Orders Overdue</div>
        </div>
      </div>

      {/* Reorder List */}
      <div className="reorder-list">
        <div className="section-title">Reorder Suggestions</div>
        {loading ? (
          <>
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-text">All stock levels are healthy</div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.sku}
              className="reorder-item"
              onClick={() => navigate({ name: "item-detail", sku: item.sku })}
            >
              <div
                className={`status-dot ${
                  item.urgency === "critical"
                    ? "critical"
                    : item.urgency === "warning"
                    ? "warning"
                    : "ok"
                }`}
              />
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-meta">
                  {item.sku} · {item.lastSupplierName || "No supplier"}{" "}
                  {item.lastUnitPrice !== null
                    ? `· £${item.lastUnitPrice.toFixed(2)}`
                    : ""}
                </div>
              </div>
              <div className="item-stock">
                <div className="stock-numbers">
                  {item.currentStock} / {item.reorderPoint}
                </div>
                <div className="stock-label">stock / ROP</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate({ name: "rfq-tracker" })}
        >
          Active RFQs
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate({ name: "order-tracker" })}
        >
          Open Orders
        </button>
      </div>
    </div>
  );
}
