import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, X, PlusCircle, ShieldAlert, Barcode, History, Package, Download, ArrowUpDown, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Products = () => {
  const { fetchWithAuth, showToast, user } = useAuth();
  const isOperator = user?.role === "Staff";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockStatus, setStockStatus] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  const [warehouses, setWarehouses] = useState([]);
  
  // Initial stock states for Add Product
  const [initialStock, setInitialStock] = useState("0");
  const [initialWarehouse, setInitialWarehouse] = useState("");

  // Adjust stock states for quick adjustment
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [adjustReason, setAdjustReason] = useState("Manual Correction");

  // Price History Modal
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [activePriceHistory, setActivePriceHistory] = useState([]);

  // Form states
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [rootCategory, setRootCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumStock, setMinimumStock] = useState("10");
  const [maximumStock, setMaximumStock] = useState("100");
  const [discountPercentage, setDiscountPercentage] = useState("0");

  // Barcode scanner simulation
  const [scanCode, setScanCode] = useState("");

  // Variants helper lists
  const [variants, setVariants] = useState([]);
  const [varName, setVarName] = useState("");
  const [varValue, setVarValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [hoveredImage, setHoveredImage] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        category: categoryFilter,
        stockStatus,
      });
      const response = await fetchWithAuth(`/api/products?${params.toString()}`);
      const resData = await response.json();
      if (resData.status === "success") {
        setProducts(resData.data);
      }
    } catch (error) {
      console.error("Load products error:", error);
      showToast("Could not load products catalog", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetchWithAuth("/api/categories");
      const resData = await response.json();
      if (resData.status === "success") {
        setCategories(resData.data);
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await fetchWithAuth("/api/warehouses");
      const resData = await response.json();
      if (resData.status === "success") {
        setWarehouses(resData.data);
      }
    } catch (error) {
      console.error("Load warehouses error:", error);
    }
  };

  const getSortedCategories = () => {
    return [...categories].sort((a, b) => {
      const pathA = a.parentCategory ? `${a.parentCategory} > ${a.name}` : a.name;
      const pathB = b.parentCategory ? `${b.parentCategory} > ${b.name}` : b.name;
      return pathA.localeCompare(pathB);
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImage(uploadEvent.target.result);
      showToast("Image uploaded successfully", "success");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setCategory(subCategory || rootCategory);
  }, [rootCategory, subCategory]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadWarehouses();
  }, [search, categoryFilter, stockStatus]);

  const handleExport = () => {
    const headers = ['name', 'sku', 'barcode', 'category', 'brand', 'costPrice', 'sellingPrice', 'quantity', 'minimumStock', 'description'];
    exportToCSV(products, headers, `products_catalog_${Date.now()}.csv`, showToast);
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    if (!scanCode) return;

    const match = products.find(p => p.sku.toLowerCase() === scanCode.toLowerCase() || p.barcode === scanCode);
    if (match) {
      showToast(`Barcode Matched: ${match.name} (Stock: ${match.quantity} units)`, "success");
      setSearch(match.sku);
      setScanCode("");
    } else {
      showToast("No product matches this barcode/SKU in catalog", "error");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name || !category || costPrice === "" || sellingPrice === "") {
      showToast("Please enter required fields", "warning");
      return;
    }

    if (Number(initialStock) > 0 && !initialWarehouse) {
      showToast("Please select a warehouse for initial stock", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          sku,
          barcode,
          category,
          brand,
          description,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          minimumStock: Number(minimumStock),
          maximumStock: Number(maximumStock),
          discountPercentage: Number(discountPercentage),
          variants,
          image,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        const newProduct = resData.data;

        // If initial stock was entered, perform stock adjustment immediately
        if (Number(initialStock) > 0 && initialWarehouse && newProduct?._id) {
          const adjResponse = await fetchWithAuth(`/api/products/${newProduct._id}/adjust-stock`, {
            method: "POST",
            body: JSON.stringify({
              type: "IN",
              quantity: Number(initialStock),
              warehouseName: initialWarehouse,
              reason: "Initial stock seeding on registration",
            }),
          });
          const adjData = await adjResponse.json();
          if (adjData.status !== "success") {
            showToast(`Product registered, but initial stock failed: ${adjData.message}`, "warning");
          } else {
            showToast("Product registered and initial stock allocated successfully", "success");
          }
        } else {
          showToast("Product registered successfully", "success");
        }

        setIsAddModalOpen(false);
        resetForm();
        loadProducts();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Add product error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!activeProduct || !selectedWarehouse || !adjustQty || !adjustReason) {
      showToast("Please enter all adjustment details", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth(`/api/products/${activeProduct._id}/adjust-stock`, {
        method: "POST",
        body: JSON.stringify({
          type: adjustType,
          quantity: Number(adjustQty),
          warehouseName: selectedWarehouse,
          reason: adjustReason,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Stock adjusted successfully", "success");
        setIsAdjustModalOpen(false);
        resetForm();
        loadProducts();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Quick adjustment error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name || !category || costPrice === "" || sellingPrice === "") {
      showToast("Please enter required fields", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth(`/api/products/${activeProduct._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          category,
          brand,
          description,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          minimumStock: Number(minimumStock),
          maximumStock: Number(maximumStock),
          discountPercentage: Number(discountPercentage),
          variants,
          image,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Product updated successfully", "success");
        setIsEditModalOpen(false);
        resetForm();
        loadProducts();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Edit product error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (p) => {
    setActiveProduct(p);
    setName(p.name);
    setImage(p.image || "");
    setSku(p.sku);
    setBarcode(p.barcode || "");
    setCategory(p.category);
    const matchedCat = categories.find(c => c.name === p.category);
    if (matchedCat) {
      if (matchedCat.parentCategory) {
        setRootCategory(matchedCat.parentCategory);
        setSubCategory(matchedCat.name);
      } else {
        setRootCategory(matchedCat.name);
        setSubCategory("");
      }
    } else {
      setRootCategory(p.category || "");
      setSubCategory("");
    }
    setBrand(p.brand || "Generic");
    setDescription(p.description || "");
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setMinimumStock(p.minimumStock);
    setMaximumStock(p.maximumStock);
    setDiscountPercentage(p.discountPercentage !== undefined ? p.discountPercentage : "0");
    setVariants(p.variants || []);
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setImage("");
    setSku("");
    setBarcode("");
    setCategory("");
    setRootCategory("");
    setSubCategory("");
    setBrand("");
    setDescription("");
    setCostPrice("");
    setSellingPrice("");
    setMinimumStock("10");
    setMaximumStock("100");
    setDiscountPercentage("0");
    setVariants([]);
    setActiveProduct(null);
    setInitialStock("0");
    setInitialWarehouse("");
    setAdjustType("IN");
    setAdjustQty("");
    setSelectedWarehouse("");
    setAdjustReason("Manual Correction");
  };

  const handleAddVariant = () => {
    if (!varName || !varValue) return;
    setVariants([...variants, { name: varName, value: varValue }]);
    setVarName("");
    setVarValue("");
  };

  const handleRemoveVariant = (index) => {
    const updated = [...variants];
    updated.splice(index, 1);
    setVariants(updated);
  };

  const handleDeleteClick = async (p) => {
    if (window.confirm(`Are you sure you want to delete product "${p.name}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/products/${p._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Product deleted from catalog", "success");
          loadProducts();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete product error:", error);
      }
    }
  };

  const getStockStatusBadge = (qty, min, max) => {
    if (qty === 0) return <span className="badge danger">Out of Stock</span>;
    if (qty <= min) return <span className="badge warning">Low Stock</span>;
    if (qty >= max) return <span className="badge success">Capacity Full</span>;
    return <span className="badge success" style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--success)" }}>Healthy</span>;
  };

  return (
    <div>
      {/* Top dashboard controls */}
      <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-bar-wrapper" style={{ maxWidth: "250px" }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search product SKU/name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
             {getSortedCategories().map((c) => (
              <option key={c._id} value={c.name}>
                {c.parentCategory ? `${c.parentCategory} > ${c.name}` : c.name}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="out">Out Of Stock</option>
            <option value="low">Low Stock</option>
            <option value="healthy">Healthy Stock</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Simulated Barcode Scanner */}
          <form onSubmit={handleBarcodeScan} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
            <input 
              type="text" 
              placeholder="Scan Barcode / SKU..." 
              className="form-input" 
              style={{ height: "42px", paddingLeft: "1rem", fontSize: "0.85rem", width: "180px", margin: 0 }}
              value={scanCode} 
              onChange={(e) => setScanCode(e.target.value)} 
            />
            <button type="submit" className="btn-secondary" style={{ height: "42px", display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
              <Barcode size={16} /> Scan
            </button>
          </form>

          <button onClick={handleExport} className="btn-secondary" style={{ height: "42px", display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
            <Download size={16} /> Export to Excel
          </button>

          {!isOperator && (
            <button className="btn-primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }} style={{ width: "auto" }}>
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Catalog Grid Table */}
      <div className="content-box">
        <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
          Product Catalog & Warehouse Locations
        </h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU / Barcode</th>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th>Stock Status</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  {!isOperator && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong style={{ fontFamily: "monospace" }}>{p.sku}</strong>
                      <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Barcode size={10} /> {p.barcode || "No Barcode"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                          {p.image ? (
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              onClick={() => setExpandedImage({ src: p.image, name: p.name })} 
                              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer", transition: "transform 0.2s ease" }} 
                              title="Click to expand image"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.15)";
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredImage({
                                  src: p.image,
                                  name: p.name,
                                  top: rect.top,
                                  left: rect.left,
                                  right: rect.right
                                });
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                setHoveredImage(null);
                              }}
                            />
                          ) : (
                            <Package size={20} style={{ color: "var(--accent-primary)" }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Brand: {p.brand}</span>
                        </div>
                      </div>
                      {p.variants && p.variants.length > 0 && (
                        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                          {p.variants.map((v, idx) => (
                            <span key={idx} className="badge" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", backgroundColor: "rgba(255,255,255,0.05)" }}>
                              {v.name}: {v.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{p.category}</td>
                    <td>
                      {getStockStatusBadge(p.quantity, p.minimumStock, p.maximumStock)}
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontWeight: 700 }}>
                        {p.quantity} units in stock
                      </span>
                    </td>
                    <td>₹{p.costPrice.toFixed(2)}</td>
                    <td>
                      ₹{p.sellingPrice.toFixed(2)}
                      {p.discountPercentage > 0 && (
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--accent-secondary)" }}>
                          ({p.discountPercentage}% off: ₹{(p.sellingPrice * (1 - p.discountPercentage / 100)).toFixed(2)})
                        </span>
                      )}
                    </td>
                    {!isOperator && (
                      <td style={{ textAlign: "right" }}>
                        <div className="actions-cell" style={{ justifyContent: "flex-end", gap: "0.35rem" }}>
                          <button className="btn-icon edit" onClick={() => { setActiveProduct(p); setAdjustType("IN"); setIsAdjustModalOpen(true); }} title="Adjust stock level">
                            <ArrowUpDown size={14} style={{ color: "var(--accent-secondary)" }} />
                          </button>
                          <button className="btn-icon edit" title="View price logs" onClick={() => { setActivePriceHistory(p.priceHistory || []); setIsPriceHistoryOpen(true); }}>
                            <History size={14} />
                          </button>
                          <button className="btn-icon edit" onClick={() => openEditModal(p)} title="Edit product">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon delete" onClick={() => handleDeleteClick(p)} title="Delete product">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
            No products found matching filters.
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Product</h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: "450px", overflowY: "auto" }}>
                
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Pure Coconut Oil 1L" value={name} onChange={(e)=>setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Brand</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Parachute" value={brand} onChange={(e)=>setBrand(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Image</label>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: "1rem" }} 
                      placeholder="e.g. https://images.unsplash.com/... or upload a local image" 
                      value={image} 
                      onChange={(e)=>setImage(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", flexShrink: 0 }}
                      onClick={() => document.getElementById("add-image-upload-input").click()}
                    >
                      <Upload size={16} /> Upload
                    </button>
                    <input 
                      id="add-image-upload-input" 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleImageUpload} 
                    />
                  </div>
                  {image && (
                    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                        <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", width: "auto" }}
                        onClick={() => setImage("")}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">SKU (Auto-generated if blank)</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. COCO-OIL-1L" value={sku} onChange={(e)=>setSku(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Barcode / UPC ID</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="Auto-generated if empty" value={barcode} onChange={(e)=>setBarcode(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Root Category *</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={rootCategory} onChange={(e) => { setRootCategory(e.target.value); setSubCategory(""); }} required>
                      <option value="">Select Root Category</option>
                      {categories.filter(c => !c.parentCategory).map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Sub-category</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                      <option value="">None (Is Root Category)</option>
                      {categories.filter(c => c.parentCategory === rootCategory).map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Cost Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="220" value={costPrice} onChange={(e)=>setCostPrice(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Selling Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="280" value={sellingPrice} onChange={(e)=>setSellingPrice(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Percentage (%)</label>
                  <input type="number" min="0" max="100" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="0" value={discountPercentage} onChange={(e)=>setDiscountPercentage(e.target.value)} />
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Initial Stock Level</label>
                    <input type="number" min="0" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="0" value={initialStock} onChange={(e)=>setInitialStock(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Starting Warehouse</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={initialWarehouse} onChange={(e)=>setInitialWarehouse(e.target.value)}>
                      <option value="">Select Warehouse (Required for initial stock)</option>
                      {warehouses.map((w) => (
                        <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Minimum Stock (Low Alert)</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={minimumStock} onChange={(e)=>setMinimumStock(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Maximum Stock Capacity</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={maximumStock} onChange={(e)=>setMaximumStock(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Description</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "60px", resize: "none" }} placeholder="Brief catalog description..." value={description} onChange={(e)=>setDescription(e.target.value)} />
                </div>

                {/* Variants setup */}
                <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <label className="form-label">Add Variations (e.g. Size: Large, Weight: 5kg)</label>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <input type="text" placeholder="Name (e.g. Weight)" className="form-input" style={{ paddingLeft: "0.75rem", flex: 1 }} value={varName} onChange={(e)=>setVarName(e.target.value)} />
                    <input type="text" placeholder="Value (e.g. 5kg)" className="form-input" style={{ paddingLeft: "0.75rem", flex: 1.5 }} value={varValue} onChange={(e)=>setVarValue(e.target.value)} />
                    <button type="button" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", height: "42px" }} onClick={handleAddVariant}>
                      <PlusCircle size={16} /> Add
                    </button>
                  </div>
                  
                  {variants.length > 0 && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      {variants.map((v, index) => (
                        <span key={index} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {v.name}: {v.value}
                          <X size={12} style={{ cursor: "pointer" }} onClick={() => handleRemoveVariant(index)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Register Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Product catalog</h3>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ maxHeight: "450px", overflowY: "auto" }}>
                
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={name} onChange={(e)=>setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Brand</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={brand} onChange={(e)=>setBrand(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Image</label>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: "1rem" }} 
                      placeholder="e.g. https://images.unsplash.com/... or upload a local image" 
                      value={image} 
                      onChange={(e)=>setImage(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", flexShrink: 0 }}
                      onClick={() => document.getElementById("edit-image-upload-input").click()}
                    >
                      <Upload size={16} /> Upload
                    </button>
                    <input 
                      id="edit-image-upload-input" 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleImageUpload} 
                    />
                  </div>
                  {image && (
                    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                        <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", width: "auto" }}
                        onClick={() => setImage("")}
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">SKU (ID)</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={sku} disabled />
                  </div>
                  <div>
                    <label className="form-label">Barcode / UPC ID</label>
                    <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={barcode} onChange={(e)=>setBarcode(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Root Category *</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={rootCategory} onChange={(e) => { setRootCategory(e.target.value); setSubCategory(""); }} required>
                      <option value="">Select Root Category</option>
                      {categories.filter(c => !c.parentCategory).map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Sub-category</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                      <option value="">None (Is Root Category)</option>
                      {categories.filter(c => c.parentCategory === rootCategory).map((c) => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Cost Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} value={costPrice} onChange={(e)=>setCostPrice(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Selling Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" style={{ paddingLeft: "1rem" }} value={sellingPrice} onChange={(e)=>setSellingPrice(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Percentage (%)</label>
                  <input type="number" min="0" max="100" className="form-input" style={{ paddingLeft: "1rem" }} value={discountPercentage} onChange={(e)=>setDiscountPercentage(e.target.value)} />
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Minimum Stock</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={minimumStock} onChange={(e)=>setMinimumStock(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Maximum Stock</label>
                    <input type="number" className="form-input" style={{ paddingLeft: "1rem" }} value={maximumStock} onChange={(e)=>setMaximumStock(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Description</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "60px", resize: "none" }} value={description} onChange={(e)=>setDescription(e.target.value)} />
                </div>

                {/* Variants setup */}
                <div className="form-group" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <label className="form-label">Product Variations</label>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <input type="text" placeholder="Name (e.g. Size)" className="form-input" style={{ paddingLeft: "0.75rem", flex: 1 }} value={varName} onChange={(e)=>setVarName(e.target.value)} />
                    <input type="text" placeholder="Value (e.g. L)" className="form-input" style={{ paddingLeft: "0.75rem", flex: 1.5 }} value={varValue} onChange={(e)=>setVarValue(e.target.value)} />
                    <button type="button" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", height: "42px" }} onClick={handleAddVariant}>
                      <PlusCircle size={16} /> Add
                    </button>
                  </div>
                  
                  {variants.length > 0 && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      {variants.map((v, index) => (
                        <span key={index} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          {v.name}: {v.value}
                          <X size={12} style={{ cursor: "pointer" }} onClick={() => handleRemoveVariant(index)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Product Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price history Modal */}
      {isPriceHistoryOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "550px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Product Pricing History Log</h3>
              <button className="btn-icon" onClick={() => setIsPriceHistoryOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "350px", overflowY: "auto" }}>
              {activePriceHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Cost Price Change</th>
                        <th>Selling Price Change</th>
                        <th>Changed By</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePriceHistory.map((log, idx) => (
                        <tr key={idx}>
                          <td>₹{log.oldCostPrice.toFixed(2)} → ₹{log.newCostPrice.toFixed(2)}</td>
                          <td>₹{log.oldSellingPrice.toFixed(2)} → ₹{log.newSellingPrice.toFixed(2)}</td>
                          <td>{log.changedBy}</td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {new Date(log.changedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)" }}>
                  No price updates logged for this product.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsPriceHistoryOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Adjust Stock Modal */}
      {isAdjustModalOpen && activeProduct && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock Level</h3>
              <button className="btn-icon" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} value={activeProduct.name} disabled />
                </div>
                
                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="form-label">Adjustment Type</label>
                    <select className="form-input" style={{ paddingLeft: "1rem" }} value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                      <option value="IN">Stock IN (+)</option>
                      <option value="OUT">Stock OUT (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quantity</label>
                    <input type="number" min="1" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. 50" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Warehouse *</label>
                  <select className="form-input" style={{ paddingLeft: "1rem" }} value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} required>
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w.warehouseName}>{w.warehouseName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Reference *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Manual correction, damaged stock" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="modal-overlay" onClick={() => setExpandedImage(null)}>
          <div className="modal-container" style={{ maxWidth: "600px", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: "none", padding: "1rem 1.5rem 0.5rem" }}>
              <h3 className="modal-title" style={{ fontSize: "1.1rem" }}>{expandedImage.name}</h3>
              <button className="btn-icon" onClick={() => setExpandedImage(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem", background: "rgba(0,0,0,0.2)" }}>
              <img 
                src={expandedImage.src} 
                alt={expandedImage.name} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "70vh", 
                  objectFit: "contain", 
                  borderRadius: "12px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                  border: "1px solid var(--border-color)"
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Hover Image Preview Card */}
      {hoveredImage && (
        <div 
          style={{
            position: "fixed",
            top: `${Math.max(10, Math.min(hoveredImage.top - 90, window.innerHeight - 260))}px`,
            left: `${hoveredImage.right + 220 + 15 > window.innerWidth ? hoveredImage.left - 240 : hoveredImage.right + 15}px`,
            zIndex: 1100,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            padding: "0.5rem",
            pointerEvents: "none",
            animation: "modalScale 0.15s ease-out"
          }}
        >
          <img 
            src={hoveredImage.src} 
            alt={hoveredImage.name} 
            style={{ 
              width: "200px", 
              height: "200px", 
              objectFit: "cover", 
              borderRadius: "8px",
              display: "block" 
            }} 
          />
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", textAlign: "center", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hoveredImage.name}
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
