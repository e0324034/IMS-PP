import React, { useState, useEffect } from "react";
import { FolderPlus, FolderTree, X, Trash2, Edit2, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportUtil";

const Categories = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isOperator = user?.role === "Staff";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [description, setDescription] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/categories");
      const resData = await response.json();
      if (resData.status === "success") {
        setCategories(resData.data);
      }
    } catch (error) {
      console.error("Load categories error:", error);
      showToast("Could not load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleExport = () => {
    const headers = ['name', 'parentCategory', 'description'];
    exportToCSV(categories, headers, `categories_${Date.now()}.csv`, showToast);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      showToast("Category name is required", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const url = activeCat ? `/api/categories/${activeCat._id}` : "/api/categories";
      const method = activeCat ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ name, parentCategory, description }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast(activeCat ? "Category details updated" : "Category created successfully", "success");
        setIsModalOpen(false);
        resetForm();
        loadCategories();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Save category error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (c) => {
    if (window.confirm(`Are you sure you want to delete category "${c.name}"?`)) {
      try {
        const response = await fetchWithAuth(`/api/categories/${c._id}`, { method: "DELETE" });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Category deleted successfully", "success");
          loadCategories();
        } else {
          showToast(resData.message, "error");
        }
      } catch (error) {
        console.error("Delete category error:", error);
      }
    }
  };

  const openEditModal = (c) => {
    setActiveCat(c);
    setName(c.name);
    setParentCategory(c.parentCategory || "");
    setDescription(c.description || "");
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setName("");
    setParentCategory("");
    setDescription("");
    setActiveCat(null);
  };

  // Group subcategories under root categories
  const roots = categories.filter(c => !c.parentCategory);
  
  const getSubcategories = (parentName) => {
    return categories.filter(c => c.parentCategory === parentName);
  };

  return (
    <div>
      <div className="actions-bar" style={{ justifyContent: "flex-end", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button onClick={handleExport} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem", border: "1px solid var(--border-color)" }}>
          <Download size={16} /> Export to Excel
        </button>
        {!isOperator && (
          <button className="btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ width: "auto" }}>
            <FolderPlus size={18} /> Create Category
          </button>
        )}
      </div>

      <div className="dashboard-split" style={{ gridTemplateColumns: "1.4fr 1.6fr" }}>
        {/* Category Tree Hierarchy Visual View */}
        <div className="content-box">
          <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
            <FolderTree size={18} style={{ color: "var(--accent-primary)" }} />
            Category Hierarchy Tree
          </h3>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner"></div>
            </div>
          ) : roots.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {roots.map((root) => (
                <div key={root._id} style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>📁 {root.name}</span>
                    {!isOperator && (
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn-icon edit" style={{ width: "24px", height: "24px" }} onClick={() => openEditModal(root)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn-icon delete" style={{ width: "24px", height: "24px" }} onClick={() => handleDeleteClick(root)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {root.description && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem", paddingLeft: "1.25rem" }}>
                      {root.description}
                    </div>
                  )}

                  {/* Render Subcategories */}
                  {getSubcategories(root.name).map((sub) => (
                    <div key={sub._id} style={{ marginLeft: "1.5rem", marginTop: "0.75rem", borderLeft: "2px solid var(--border-color)", paddingLeft: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>↳ 📄 {sub.name}</span>
                        {!isOperator && (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button className="btn-icon edit" style={{ width: "22px", height: "22px" }} onClick={() => openEditModal(sub)}>
                              <Edit2 size={10} />
                            </button>
                            <button className="btn-icon delete" style={{ width: "22px", height: "22px" }} onClick={() => handleDeleteClick(sub)}>
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                      {sub.description && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem", paddingLeft: "1.25rem" }}>
                          {sub.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
              No categories configured. Create a category to start mapping products.
            </div>
          )}
        </div>

        {/* Directory Flat List View */}
        <div className="content-box">
          <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
            Flat Directory Listing
          </h3>

          <div className="table-responsive">
            {categories.length > 0 ? (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Parent Path</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{c.parentCategory || "(Root)"}</td>
                      <td style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{c.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
                No categories found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{activeCat ? "Edit Category Details" : "Create New Category"}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input type="text" className="form-input" style={{ paddingLeft: "1rem" }} placeholder="e.g. Laptops" value={name} onChange={(e)=>setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Category (Optional)</label>
                  <select className="filter-select" style={{ width: "100%" }} value={parentCategory} onChange={(e)=>setParentCategory(e.target.value)}>
                    <option value="">None (Is Root Category)</option>
                    {/* Only show categories that aren't sub-categories themselves to prevent recursion, and aren't the current category itself */}
                    {categories.filter(c => !c.parentCategory && (!activeCat || c.name !== activeCat.name)).map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" style={{ paddingLeft: "1rem", height: "80px", resize: "none" }} placeholder="Specifications..." value={description} onChange={(e)=>setDescription(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={submitting}>
                  {submitting ? <span className="spinner"></span> : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
