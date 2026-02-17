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
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<ReorderItem[]>("/reorders"),
      api.get<any[]>("/rfq").catch(() => []),
      api.get<any[]>("/orders").catch(() => []),
    ]).then(([reorders, rfqs, orders]) => {
      setItems(reorders);
      setRfqCount(rfqs.filter((r: any) => r.status === "active").length);
      setPendingOrders(orders.filter((o: any) => o.status !== "delivered").length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const criticalCount = items.filter((i) => i.urgency === "critical").length;
  const criticalItems = items.filter((i) => i.urgency === "critical");
  const warningItems = items.filter((i) => i.urgency === "warning");
  const normalItems = items.filter((i) => i.urgency === "normal");

  const renderItems = (list: ReorderItem[]) =>
    list.map((item) => (
      <div
        key={item.sku}
        className="reorder-item"
        onClick={() => navigate({ name: "item-detail", sku: item.sku })}
      >
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
    ));

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="hexa-header">
        <h1>Dashboard</h1>
        <button
          onClick={() => navigate({ name: "settings" })}
          className="back-btn"
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
        <div className="summary-card"
             onClick={() => navigate({ name: "order-tracker" })}>
          <div className="card-number">{loading ? "—" : pendingOrders}</div>
          <div className="card-label">Awaiting Delivery</div>
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
          </>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-text">All items ordered or in stock</div>
          </div>
        ) : (
          <>
            {criticalItems.length > 0 && (
              <div className="urgency-section">
                <div className="urgency-section-header critical">Critical</div>
                {renderItems(criticalItems)}
              </div>
            )}
            {warningItems.length > 0 && (
              <div className="urgency-section">
                <div className="urgency-section-header warning">Low Stock</div>
                {renderItems(warningItems)}
              </div>
            )}
            {normalItems.length > 0 && (
              <div className="urgency-section">
                <div className="urgency-section-header normal">Reorder Soon</div>
                {renderItems(normalItems)}
              </div>
            )}
          </>
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
