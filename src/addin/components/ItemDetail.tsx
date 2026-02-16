import React, { useEffect, useState } from "react";
import type { Screen } from "../App";
import api from "../utils/api";

interface SupplierHistory {
  supplierId: string;
  supplierName: string;
  contactName: string;
  paymentTerms: string;
  lastPrice: number;
  lastOrderDate: string;
  lastQty: number;
  avgLeadTimeDays: number;
  onTimeRate: number;
  orderCount: number;
  overallOnTimeRate: number;
}

interface ProductDetail {
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorderPoint: number;
  reorderQty: number;
  currentStock: number;
  safetyStock: number;
  supplierHistory: SupplierHistory[];
}

interface Props {
  sku: string;
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

export default function ItemDetail({ sku, navigate, goBack }: Props) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ProductDetail>(`/products/${sku}`)
      .then((data) => { setProduct(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sku]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Item Detail</h1>
        </div>
        <div className="loading-container">
          <div className="spinner" />
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fade-in">
        <div className="hexa-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h1>Item Detail</h1>
        </div>
        <div className="empty-state">
          <div className="empty-text">Product not found</div>
        </div>
      </div>
    );
  }

  const stockPercent = Math.min(
    (product.currentStock / product.reorderPoint) * 100,
    100
  );
  const isCritical = product.currentStock < product.safetyStock;
  const isWarning =
    !isCritical && product.currentStock <= product.reorderPoint;
  const stockClass = isCritical ? "critical" : isWarning ? "warning" : "ok";

  const lastSupplier = product.supplierHistory.sort(
    (a, b) =>
      new Date(b.lastOrderDate).getTime() -
      new Date(a.lastOrderDate).getTime()
  )[0];

  function onTimeIcon(rate: number): string {
    if (rate >= 90) return "●";
    if (rate >= 75) return "◐";
    return "○";
  }

  return (
    <div className="fade-in">
      <div className="hexa-header">
        <button className="back-btn" onClick={goBack}>←</button>
        <h1>{product.name}</h1>
      </div>

      <div className="section">
        {/* SKU and Category */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span className="badge badge-info">{product.sku}</span>
          <span className="badge badge-grey">{product.category}</span>
        </div>

        {/* Stock Info Card */}
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Current Stock</span>
            <span className="detail-value">
              {product.currentStock} {product.unit}s
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Reorder Point</span>
            <span className="detail-value">{product.reorderPoint}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Safety Stock</span>
            <span className="detail-value">{product.safetyStock}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Suggested Order Qty</span>
            <span className="detail-value">{product.reorderQty}</span>
          </div>

          {/* Stock Bar */}
          <div className="stock-bar-container">
            <div className="stock-bar">
              <div
                className={`stock-bar-fill ${stockClass}`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
            <div className="stock-bar-markers">
              <span>0</span>
              <span>Safety: {product.safetyStock}</span>
              <span>ROP: {product.reorderPoint}</span>
            </div>
          </div>

          {isCritical && (
            <div className="badge badge-critical" style={{ marginTop: 8 }}>
              Below safety stock — order urgently
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="badge badge-warning" style={{ marginTop: 8 }}>
              At reorder point — order soon
            </div>
          )}
        </div>

        {/* Supplier History */}
        <div className="section-heading">Supplier History</div>
        {product.supplierHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">No supplier history</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Last Price</th>
                  <th>Lead Time</th>
                  <th>On-Time</th>
                  <th>Last Order</th>
                </tr>
              </thead>
              <tbody>
                {product.supplierHistory.map((sh) => (
                  <tr key={sh.supplierId}>
                    <td style={{ fontWeight: 500 }}>{sh.supplierName}</td>
                    <td>£{sh.lastPrice.toFixed(2)}</td>
                    <td>{sh.avgLeadTimeDays}d</td>
                    <td>
                      {sh.overallOnTimeRate}%{" "}
                      <span
                        style={{
                          color:
                            sh.overallOnTimeRate >= 90
                              ? "var(--success)"
                              : sh.overallOnTimeRate >= 75
                              ? "var(--warning)"
                              : "var(--danger)",
                        }}
                      >
                        {onTimeIcon(sh.overallOnTimeRate)}
                      </span>
                    </td>
                    <td>
                      {new Date(sh.lastOrderDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {lastSupplier && (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() =>
                navigate({
                  name: "quick-reorder",
                  sku: product.sku,
                  supplierId: lastSupplier.supplierId,
                })
              }
            >
              Reorder from {lastSupplier.supplierName}
            </button>
          )}
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() =>
              navigate({ name: "rfq-builder", skus: [product.sku] })
            }
          >
            Get New Quotes
          </button>
        </div>
      </div>
    </div>
  );
}
