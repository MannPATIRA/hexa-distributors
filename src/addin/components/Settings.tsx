import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";

interface AuthStatus {
  buyer: boolean;
  supplier: boolean;
}

interface Props {
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function Settings({ navigate, goBack }: Props) {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = () => {
    setLoading(true);
    api.get<AuthStatus>("/auth/status")
      .then((data) => { setAuth(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const openAuthWindow = (type: "buyer" | "supplier") => {
    const url = type === "buyer"
      ? "/auth/login/buyer"
      : "/auth/login/supplier";

    const w = window.open(url, "_blank", "width=500,height=700");

    // Poll for window close, then refresh status
    const interval = setInterval(() => {
      if (w && w.closed) {
        clearInterval(interval);
        setTimeout(loadStatus, 1000);
      }
    }, 500);

    // Safety: stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>Settings</h1>
      </div>

      <div className="section">
        <div className="section-heading">Account Connections</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Connect both Microsoft accounts to enable email sending. The buyer account sends RFQs and POs. The supplier sim account sends simulated replies.
        </p>

        {/* Buyer Account */}
        <div className="detail-card" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Buyer Account</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Sends RFQ emails and purchase orders
              </div>
            </div>
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : auth?.buyer ? (
              <span className="badge badge-success">Connected</span>
            ) : (
              <span className="badge badge-critical">Not connected</span>
            )}
          </div>
          <button
            className={`btn btn-sm btn-block ${auth?.buyer ? "btn-outline" : "btn-primary"}`}
            style={{ marginTop: 10 }}
            onClick={() => openAuthWindow("buyer")}
          >
            {auth?.buyer ? "Change Account" : "Connect Buyer Account"}
          </button>
        </div>

        {/* Supplier Sim Account */}
        <div className="detail-card" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Supplier Sim Account</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Sends simulated supplier reply emails
              </div>
            </div>
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : auth?.supplier ? (
              <span className="badge badge-success">Connected</span>
            ) : (
              <span className="badge badge-critical">Not connected</span>
            )}
          </div>
          <button
            className={`btn btn-sm btn-block ${auth?.supplier ? "btn-outline" : "btn-primary"}`}
            style={{ marginTop: 10 }}
            onClick={() => openAuthWindow("supplier")}
          >
            {auth?.supplier ? "Change Account" : "Connect Supplier Sim"}
          </button>
        </div>

        {/* Status refresh */}
        <button
          className="btn btn-outline btn-sm btn-block"
          style={{ marginTop: 8 }}
          onClick={loadStatus}
          disabled={loading}
        >
          {loading ? "Checking..." : "Refresh Status"}
        </button>

        {/* Connection info */}
        {auth && !auth.buyer && !auth.supplier && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: "var(--warning-bg)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}>
            <strong>Setup required:</strong> Connect both accounts before sending RFQs.
            A popup window will open for Microsoft sign-in. After signing in, return here
            and the status will update automatically.
          </div>
        )}

        {auth?.buyer && auth?.supplier && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: "var(--success-bg)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--success)",
          }}>
            Both accounts connected. You're ready to send RFQs and receive simulated replies.
          </div>
        )}
      </div>

      <div className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="section-heading">About</div>
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Version</span>
            <span className="detail-value">1.0.0</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Server</span>
            <span className="detail-value">https://localhost:3000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
