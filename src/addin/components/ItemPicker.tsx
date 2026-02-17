import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useToast } from "../utils/toast";

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
  categories: string[];
}

interface SuggestedProduct extends Product {
  lastPrice: number | null;
  lastSupplier: string | null;
  reason: string;
}

interface SupplierProduct extends Product {
  lastPrice: number;
  lastOrderDate: string;
  lastQty: number;
}

interface Props {
  currentSkus: string[];
  allProducts: Product[];
  allSuppliers: Supplier[];
  onAdd: (sku: string) => void;
  onClose: () => void;
}

type Tab = "suggested" | "by-supplier" | "all";

export default function ItemPicker({ currentSkus, allProducts, allSuppliers, onAdd, onClose }: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("suggested");
  const [addedSkus, setAddedSkus] = useState<Set<string>>(new Set(currentSkus));

  // Suggested tab state
  const [related, setRelated] = useState<SuggestedProduct[]>([]);
  const [supplierMatch, setSupplierMatch] = useState<SuggestedProduct[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // By Supplier tab state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(allSuppliers[0]?.id || "");
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);

  // All tab state
  const [searchQuery, setSearchQuery] = useState("");

  // Load suggestions
  useEffect(() => {
    if (currentSkus.length === 0) {
      setSuggestionsLoading(false);
      return;
    }
    api.get<{ related: SuggestedProduct[]; supplierMatch: SuggestedProduct[] }>(
      `/products/suggestions?skus=${currentSkus.join(",")}`
    )
      .then((data) => {
        setRelated(data.related);
        setSupplierMatch(data.supplierMatch);
        setSuggestionsLoading(false);
      })
      .catch(() => setSuggestionsLoading(false));
  }, [currentSkus]);

  // Load supplier products
  useEffect(() => {
    if (!selectedSupplierId) return;
    setSupplierLoading(true);
    api.get<{ supplier: any; products: SupplierProduct[] }>(
      `/products/by-supplier/${selectedSupplierId}`
    )
      .then((data) => {
        setSupplierProducts(data.products);
        setSupplierLoading(false);
      })
      .catch(() => setSupplierLoading(false));
  }, [selectedSupplierId]);

  const handleAdd = (sku: string, name: string) => {
    if (addedSkus.has(sku)) return;
    onAdd(sku);
    setAddedSkus((prev) => new Set(prev).add(sku));
    showToast(`Added ${name}`, "success");
  };

  const isAdded = (sku: string) => addedSkus.has(sku);

  // Filter for All tab
  const filteredAll = allProducts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="picker-overlay">
      {/* Header */}
      <div className="picker-header">
        <h2>Add Items</h2>
        <button className="picker-close" onClick={onClose}>×</button>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === "suggested" ? "active" : ""}`}
          onClick={() => setActiveTab("suggested")}
        >
          Suggested
        </button>
        <button
          className={`tab ${activeTab === "by-supplier" ? "active" : ""}`}
          onClick={() => setActiveTab("by-supplier")}
        >
          By Supplier
        </button>
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Items
        </button>
      </div>

      {/* Suggested Tab */}
      {activeTab === "suggested" && (
        <div className="picker-content">
          {suggestionsLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : currentSkus.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">Add an item first to see suggestions</div>
            </div>
          ) : (
            <>
              {related.length > 0 && (
                <>
                  <div className="picker-section">Same Category</div>
                  {related.map((p) => (
                    <div
                      key={p.sku}
                      className={`picker-item ${isAdded(p.sku) ? "added" : ""}`}
                      onClick={() => !isAdded(p.sku) && handleAdd(p.sku, p.name)}
                    >
                      <div className="picker-item-info">
                        <div className="picker-item-name">{p.name}</div>
                        <div className="picker-item-meta">
                          {p.sku} · {p.category}
                          {p.lastSupplier ? ` · ${p.lastSupplier}` : ""}
                        </div>
                      </div>
                      {p.lastPrice && (
                        <div className="picker-item-price">£{p.lastPrice.toFixed(2)}</div>
                      )}
                      <button className="picker-add-btn" disabled={isAdded(p.sku)}>
                        {isAdded(p.sku) ? "✓" : "+"}
                      </button>
                    </div>
                  ))}
                </>
              )}

              {supplierMatch.length > 0 && (
                <>
                  <div className="picker-section">From Same Suppliers</div>
                  {supplierMatch.map((p) => (
                    <div
                      key={p.sku}
                      className={`picker-item ${isAdded(p.sku) ? "added" : ""}`}
                      onClick={() => !isAdded(p.sku) && handleAdd(p.sku, p.name)}
                    >
                      <div className="picker-item-info">
                        <div className="picker-item-name">{p.name}</div>
                        <div className="picker-item-meta">
                          {p.sku} · {p.reason}
                        </div>
                      </div>
                      {p.lastPrice && (
                        <div className="picker-item-price">£{p.lastPrice.toFixed(2)}</div>
                      )}
                      <button className="picker-add-btn" disabled={isAdded(p.sku)}>
                        {isAdded(p.sku) ? "✓" : "+"}
                      </button>
                    </div>
                  ))}
                </>
              )}

              {related.length === 0 && supplierMatch.length === 0 && (
                <div className="empty-state">
                  <div className="empty-text">No additional suggestions</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* By Supplier Tab */}
      {activeTab === "by-supplier" && (
        <>
          <div className="pill-bar">
            {allSuppliers.map((sup) => (
              <button
                key={sup.id}
                className={`pill ${selectedSupplierId === sup.id ? "active" : ""}`}
                onClick={() => setSelectedSupplierId(sup.id)}
              >
                {sup.name}
              </button>
            ))}
          </div>
          <div className="picker-content">
            {supplierLoading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : supplierProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-text">No products from this supplier</div>
              </div>
            ) : (
              supplierProducts.map((p) => (
                <div
                  key={p.sku}
                  className={`picker-item ${isAdded(p.sku) ? "added" : ""}`}
                  onClick={() => !isAdded(p.sku) && handleAdd(p.sku, p.name)}
                >
                  <div className="picker-item-info">
                    <div className="picker-item-name">{p.name}</div>
                    <div className="picker-item-meta">
                      {p.sku} · Last ordered{" "}
                      {new Date(p.lastOrderDate).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="picker-item-price">£{p.lastPrice.toFixed(2)}</div>
                  <button className="picker-add-btn" disabled={isAdded(p.sku)}>
                    {isAdded(p.sku) ? "✓" : "+"}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* All Items Tab */}
      {activeTab === "all" && (
        <>
          <div className="picker-search">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="picker-content">
            {filteredAll.length === 0 ? (
              <div className="empty-state">
                <div className="empty-text">No matching products</div>
              </div>
            ) : (
              filteredAll.map((p) => (
                <div
                  key={p.sku}
                  className={`picker-item ${isAdded(p.sku) ? "added" : ""}`}
                  onClick={() => !isAdded(p.sku) && handleAdd(p.sku, p.name)}
                >
                  <div className="picker-item-info">
                    <div className="picker-item-name">{p.name}</div>
                    <div className="picker-item-meta">
                      {p.sku} · {p.category}
                    </div>
                  </div>
                  <button className="picker-add-btn" disabled={isAdded(p.sku)}>
                    {isAdded(p.sku) ? "✓" : "+"}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
