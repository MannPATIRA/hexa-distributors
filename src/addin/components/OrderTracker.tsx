import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";

interface OrderData {
  id: string;
  poNumber: string;
  supplierName: string;
  items: { name: string; qty: number; unitPrice: number; total: number }[];
  total: number;
  status: "sent" | "confirmed" | "shipped" | "delivered";
  createdAt: string;
  expectedDelivery: string;
  paymentTerms: string;
}

interface Props {
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function OrderTracker({ navigate, goBack }: Props) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingFollowup, setSendingFollowup] = useState<string | null>(null);

  useEffect(() => {
    api.get<OrderData[]>("/orders")
      .then((data) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isOverdue = (order: OrderData) =>
    order.status !== "delivered" && new Date(order.expectedDelivery) < new Date();

  const isApproaching = (order: OrderData) => {
    if (order.status === "delivered") return false;
    const delivery = new Date(order.expectedDelivery);
    const twoDaysAway = new Date();
    twoDaysAway.setDate(twoDaysAway.getDate() + 2);
    return delivery <= twoDaysAway && delivery >= new Date();
  };

  const sendFollowup = async (orderId: string) => {
    setSendingFollowup(orderId);
    try {
      await api.post(`/orders/${orderId}/followup`);
      showToast("Follow-up email sent", "success");
    } catch {
      showToast("Failed to send follow-up", "error");
    }
    setSendingFollowup(null);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "sent": return "Sent";
      case "confirmed": return "Confirmed";
      case "shipped": return "Shipped";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const statusBadgeClass = (order: OrderData) => {
    if (order.status === "delivered") return "badge-success";
    if (isOverdue(order)) return "badge-critical";
    if (isApproaching(order)) return "badge-warning";
    return "badge-info";
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Order Tracker</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Order Tracker</h1>
        <span className="header-badge">{orders.length} orders</span>
      </div>

      <div className="section">
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-text">No open orders</div>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="detail-card"
              style={{ marginBottom: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{order.poNumber}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {order.supplierName}
                  </div>
                </div>
                <span className={`badge ${statusBadgeClass(order)}`}>
                  {statusLabel(order.status)}
                  {isOverdue(order) && " — Overdue"}
                </span>
              </div>

              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                {order.items.map((it) => `${it.name} ×${it.qty}`).join(", ")}
              </div>

              <div className="detail-row">
                <span className="detail-label">Total</span>
                <span className="detail-value">£{order.total.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Expected</span>
                <span
                  className="detail-value"
                  style={{ color: isOverdue(order) ? "var(--danger)" : "inherit" }}
                >
                  {new Date(order.expectedDelivery).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Placed</span>
                <span className="detail-value">
                  {new Date(order.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {isOverdue(order) && (
                <button
                  className="btn btn-danger btn-sm btn-block"
                  style={{ marginTop: 8 }}
                  onClick={() => sendFollowup(order.id)}
                  disabled={sendingFollowup === order.id}
                >
                  {sendingFollowup === order.id ? "Sending..." : "Send Follow-up"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
