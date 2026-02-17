import React, { useEffect, useState, useRef } from "react";
import type { Screen } from "../App";
import api from "../utils/api";
import { useToast } from "../utils/toast";

interface RFQSupplierStatus {
  supplierId: string;
  status: "pending" | "responded" | "no-response";
  sentAt: string;
  respondedAt?: string;
  reminderSentAt?: string;
}

interface RFQData {
  id: string;
  referenceNumber: string;
  items: { sku: string; name: string; qty: number; unit: string }[];
  suppliers: RFQSupplierStatus[];
  status: string;
  createdAt: string;
  quoteDeadline: string;
}

interface SupplierInfo {
  id: string;
  name: string;
  contactName: string;
}

interface Props {
  rfqId?: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function RFQTracker({ rfqId, navigate, goBack }: Props) {
  const { showToast } = useToast();
  const [rfqs, setRfqs] = useState<RFQData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<RFQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [capturedQuoteCounts, setCapturedQuoteCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const rfqIdRef = useRef(rfqId);
  rfqIdRef.current = rfqId;

  const loadData = async () => {
    try {
      const [rfqList, supList] = await Promise.all([
        api.get<RFQData[]>("/rfq"),
        api.get<SupplierInfo[]>("/suppliers"),
      ]);
      setRfqs(rfqList);
      setSuppliers(supList);
      setError(null);

      if (rfqIdRef.current) {
        const found = rfqList.find((r: RFQData) => r.id === rfqIdRef.current);
        if (found) setSelectedRfq(found);
      }

      // Fetch captured quote counts for active RFQs
      const counts: Record<string, number> = {};
      for (const rfq of rfqList.filter((r: RFQData) => r.status === "active")) {
        try {
          const quotes = await api.get<any[]>(`/rfq/${rfq.id}/compare`);
          counts[rfq.id] = quotes.length;
        } catch {
          counts[rfq.id] = 0;
        }
      }
      setCapturedQuoteCounts(counts);
    } catch {
      setError("Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getSupplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.name || id;

  const sendReminder = async (rfq: RFQData, supplierId: string) => {
    setSendingReminder(supplierId);
    try {
      await api.post(`/rfq/${rfq.id}/remind/${supplierId}`);
      await loadData();
    } catch {
      showToast("Failed to send reminder", "error");
    }
    setSendingReminder(null);
  };

  const respondedCount = (rfq: RFQData) =>
    rfq.suppliers.filter((s) => s.status === "responded").length;

  const isDeadlinePassed = (rfq: RFQData) =>
    new Date(rfq.quoteDeadline) < new Date();

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>RFQ Tracker</h1>
        </div>
        <div className="loading-container"><div className="spinner" /></div>
      </div>
    );
  }

  if (error && rfqs.length === 0) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>RFQ Tracker</h1>
        </div>
        <div className="empty-state">
          <div className="empty-text" style={{ color: "var(--danger)" }}>{error}</div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Detail view for a specific RFQ
  if (selectedRfq) {
    const rfq = selectedRfq;
    const responded = respondedCount(rfq);

    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={() => setSelectedRfq(null)}>←</button>
          <h1>{rfq.referenceNumber}</h1>
          <span className="header-badge">{rfq.status}</span>
        </div>

        <div className="section">
          {/* Items summary */}
          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {new Date(rfq.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Quote Deadline</span>
              <span className="detail-value" style={{
                color: isDeadlinePassed(rfq) ? "var(--danger)" : "inherit"
              }}>
                {new Date(rfq.quoteDeadline).toLocaleDateString("en-GB")}
                {isDeadlinePassed(rfq) ? " (past)" : ""}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Items</span>
              <span className="detail-value">
                {rfq.items.map((it) => it.name).join(", ")}
              </span>
            </div>
          </div>

          {/* Supplier Status */}
          <div className="section-heading">
            Responses ({responded}/{rfq.suppliers.length})
          </div>

          {rfq.suppliers.map((ss) => {
            const deadlinePassed = isDeadlinePassed(rfq);
            const effectiveStatus =
              ss.status === "pending" && deadlinePassed
                ? "no-response"
                : ss.status;

            return (
              <div
                key={ss.supplierId}
                className="detail-card"
                style={{ marginBottom: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {getSupplierName(ss.supplierId)}
                    </div>
                    <div className={`status-icon ${effectiveStatus}`}>
                      {effectiveStatus === "responded" && "Responded"}
                      {effectiveStatus === "pending" && "⏳ Pending"}
                      {effectiveStatus === "no-response" && "❌ No Response"}
                      {ss.respondedAt && (
                        <span style={{ marginLeft: 4, fontSize: 10, color: "var(--text-muted)" }}>
                          {new Date(ss.respondedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {effectiveStatus === "responded" && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() =>
                          navigate({
                            name: "quote-detail",
                            rfqId: rfq.id,
                            supplierId: ss.supplierId,
                          } as any)
                        }
                      >
                        View
                      </button>
                    )}
                    {effectiveStatus === "pending" && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => sendReminder(rfq, ss.supplierId)}
                        disabled={sendingReminder === ss.supplierId}
                      >
                        {sendingReminder === ss.supplierId
                          ? "..."
                          : "Remind"}
                      </button>
                    )}
                    {effectiveStatus === "no-response" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => sendReminder(rfq, ss.supplierId)}
                        disabled={sendingReminder === ss.supplierId}
                        style={{ fontSize: 11 }}
                      >
                        {sendingReminder === ss.supplierId
                          ? "..."
                          : "Final Reminder"}
                      </button>
                    )}
                  </div>
                </div>
                {ss.reminderSentAt && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    Reminder sent {new Date(ss.reminderSentAt).toLocaleDateString("en-GB")}
                  </div>
                )}
              </div>
            );
          })}

          {/* Compare Button — only when quotes are actually captured */}
          {(capturedQuoteCounts[rfq.id] || 0) >= 2 && (
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 12 }}
              onClick={() =>
                navigate({ name: "quote-comparison", rfqId: rfq.id })
              }
            >
              Compare {capturedQuoteCounts[rfq.id]} Quotes
            </button>
          )}
          {responded >= 1 && (capturedQuoteCounts[rfq.id] || 0) < 2 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 12 }}>
              Open supplier reply emails to capture quotes
              {(capturedQuoteCounts[rfq.id] || 0) > 0 && ` (${capturedQuoteCounts[rfq.id]} of ${responded} captured)`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view — all RFQs
  const activeRfqs = rfqs.filter((r) => r.status === "active");

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>RFQ Tracker</h1>
      </div>

      <div className="section">
        {activeRfqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No active RFQs</div>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => navigate({ name: "rfq-builder" })}
            >
              Create New RFQ
            </button>
          </div>
        ) : (
          activeRfqs.map((rfq) => {
            const responded = respondedCount(rfq);
            return (
              <div
                key={rfq.id}
                className="detail-card"
                style={{ marginBottom: 8, cursor: "pointer" }}
                onClick={() => setSelectedRfq(rfq)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{rfq.referenceNumber}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {rfq.items.length} item{rfq.items.length !== 1 ? "s" : ""} ·
                      {" "}{rfq.suppliers.length} suppliers
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={`badge ${responded === rfq.suppliers.length ? "badge-success" : responded > 0 ? "badge-warning" : "badge-grey"}`}>
                      {responded}/{rfq.suppliers.length} replied
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {new Date(rfq.createdAt).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
