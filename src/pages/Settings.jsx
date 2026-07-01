import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, X, Building, Landmark, MapPin, ClipboardList, Database, Download, Upload, FileUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Settings = () => {
  const { user, fetchWithAuth, showToast } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [activeTab, setActiveTab] = useState("company");
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/settings");
      const resData = await response.json();
      if (resData.status === "success") {
        setCompanyName(resData.data.companyName || "");
        setGstNumber(resData.data.gstNumber || "");
        setAddress(resData.data.address || "");
        setInvoicePrefix(resData.data.invoicePrefix || "");
      }
    } catch (error) {
      console.error("Load settings error:", error);
      showToast("Could not load company settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName) {
      showToast("Company name is required", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName,
          gstNumber,
          address,
          invoicePrefix,
        }),
      });

      const resData = await response.json();
      if (resData.status === "success") {
        showToast("Company settings updated successfully", "success");
        loadSettings();
      } else {
        showToast(resData.message, "error");
      }
    } catch (error) {
      console.error("Save settings error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      showToast("Preparing backup data...", "info");
      const response = await fetchWithAuth("/api/backup/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ims_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Backup exported successfully", "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Export failed", "error");
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "WARNING: Restoring the database will overwrite ALL existing collections (Users, Products, Warehouses, Orders, Transactions, etc.). Are you absolutely sure?"
    );
    if (!confirmRestore) {
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        showToast("Restoring database collections...", "info");
        const response = await fetchWithAuth("/api/backup/restore", {
          method: "POST",
          body: JSON.stringify({ backupData }),
        });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast("Database restored successfully!", "success");
        } else {
          showToast(resData.message || "Restore failed", "error");
        }
      } catch (error) {
        console.error("Restore error:", error);
        showToast("Invalid JSON file format", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const handleProductImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let products = [];
        const text = event.target.result;
        if (file.name.endsWith(".json")) {
          products = JSON.parse(text);
          if (!Array.isArray(products)) {
            products = [products];
          }
        } else if (file.name.endsWith(".csv")) {
          // Simple CSV parsing
          const lines = text.split("\n");
          if (lines.length < 2) {
            showToast("Empty CSV file or invalid formatting", "warning");
            return;
          }
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^["']|["']$/g, ""));

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            // Handle simple commas without nesting quotes
            const values = lines[i]
              .split(",")
              .map((v) => v.trim().replace(/^["']|["']$/g, ""));
            const obj = {};
            headers.forEach((header, index) => {
              if (header && index < values.length) {
                obj[header] = values[index];
              }
            });
            products.push(obj);
          }
        } else {
          showToast("Unsupported file format. Please upload JSON or CSV.", "warning");
          return;
        }

        if (!products.length) {
          showToast("No products found in file", "warning");
          return;
        }

        showToast(`Importing ${products.length} products...`, "info");
        const response = await fetchWithAuth("/api/backup/import-products", {
          method: "POST",
          body: JSON.stringify({ products }),
        });
        const resData = await response.json();
        if (resData.status === "success") {
          showToast(resData.message, "success");
        } else {
          showToast(resData.message || "Import failed", "error");
        }
      } catch (error) {
        console.error("Import error:", error);
        showToast("Failed to parse file. Check formatting.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const handleExcelExport = async (type) => {
    try {
      showToast("Fetching export data...", "info");
      const response = await fetchWithAuth("/api/backup/export");
      if (!response.ok) throw new Error("Export failed");
      const resData = await response.json();
      
      let csvContent = "";
      let filename = "";

      const convertToCSV = (objArray, headers) => {
        let str = '';
        // Add Header Row
        str += headers.map(h => `"${h.toUpperCase()}"`).join(',') + '\r\n';
        
        for (let i = 0; i < objArray.length; i++) {
          let line = '';
          for (let index = 0; index < headers.length; index++) {
            if (line !== '') line += ',';
            const head = headers[index];
            let val = objArray[i][head];
            
            if (val === undefined || val === null) {
              val = '';
            } else if (typeof val === 'object') {
              val = JSON.stringify(val);
            }
            
            let valString = String(val).replace(/"/g, '""');
            if (valString.includes(',') || valString.includes('\n') || valString.includes('"')) {
              valString = `"${valString}"`;
            }
            line += valString;
          }
          str += line + '\r\n';
        }
        return str;
      };

      if (type === "products") {
        const headers = ['name', 'sku', 'barcode', 'category', 'brand', 'costPrice', 'sellingPrice', 'quantity', 'minimumStock', 'description'];
        csvContent = convertToCSV(resData.products || [], headers);
        filename = `products_catalog_${Date.now()}.csv`;
      } else if (type === "sales") {
        const headers = ['soNumber', 'customerName', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'warehouse', 'remarks', 'createdAt'];
        csvContent = convertToCSV(resData.salesOrders || [], headers);
        filename = `sales_ledger_${Date.now()}.csv`;
      } else if (type === "purchases") {
        const headers = ['poNumber', 'supplierName', 'totalAmount', 'status', 'paymentMethod', 'paymentStatus', 'warehouse', 'remarks', 'createdAt'];
        csvContent = convertToCSV(resData.purchaseOrders || [], headers);
        filename = `purchase_ledger_${Date.now()}.csv`;
      } else if (type === "stockLocations") {
        const flatStock = [];
        const warehouses = resData.warehouses || [];
        warehouses.forEach(w => {
          (w.stockAllocation || []).forEach(alloc => {
            flatStock.push({
              warehouseName: w.warehouseName,
              location: w.location,
              productName: alloc.product?.name || '',
              sku: alloc.product?.sku || '',
              quantity: alloc.quantity
            });
          });
        });
        const headers = ['warehouseName', 'location', 'productName', 'sku', 'quantity'];
        csvContent = convertToCSV(flatStock, headers);
        filename = `warehouse_stock_mapping_${Date.now()}.csv`;
      } else if (type === "customers") {
        const headers = ['name', 'email', 'phone', 'address', 'gstNumber', 'creditLimit'];
        csvContent = convertToCSV(resData.customers || [], headers);
        filename = `customers_list_${Date.now()}.csv`;
      } else if (type === "suppliers") {
        const headers = ['supplierName', 'contactPerson', 'email', 'phone', 'address', 'gstNumber', 'rating'];
        csvContent = convertToCSV(resData.suppliers || [], headers);
        filename = `suppliers_list_${Date.now()}.csv`;
      } else if (type === "expenses") {
        const headers = ['expenseNumber', 'category', 'amount', 'paymentMethod', 'status', 'date', 'description'];
        csvContent = convertToCSV(resData.expenses || [], headers);
        filename = `expenses_ledger_${Date.now()}.csv`;
      } else if (type === "transactions") {
        const headers = ['productName', 'type', 'quantity', 'warehouse', 'toWarehouse', 'reason', 'user', 'reference', 'createdAt'];
        csvContent = convertToCSV(resData.transactions || [], headers);
        filename = `inventory_audit_ledger_${Date.now()}.csv`;
      }

      if (!csvContent) {
        showToast("No data available to export", "warning");
        return;
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${type} successfully to Excel/CSV!`, "success");
    } catch (error) {
      console.error("Excel export error:", error);
      showToast("Export failed", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs headers */}
      {isAdmin && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("company")}
            className="btn-secondary"
            style={{
              background: activeTab === "company" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
              border: activeTab === "company" ? "none" : "1px solid var(--border-color)",
              color: activeTab === "company" ? "white" : "var(--text-secondary)",
            }}
          >
            Company Profile Settings
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className="btn-secondary"
            style={{
              background: activeTab === "backup" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))" : "none",
              border: activeTab === "backup" ? "none" : "1px solid var(--border-color)",
              color: activeTab === "backup" ? "white" : "var(--text-secondary)",
            }}
          >
            Backup, Restore & Imports
          </button>
        </div>
      )}

      {activeTab === "company" ? (
        <div className="content-box" style={{ maxWidth: "600px" }}>
          <h3 className="content-box-title" style={{ marginBottom: "2rem" }}>
            <SettingsIcon size={18} style={{ color: "var(--accent-primary)" }} />
            Company Profile & settings
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <div className="input-wrapper">
                <Building className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Corporation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label">GSTIN / Tax ID</label>
                <div className="input-wrapper">
                  <Landmark className="input-icon" size={18} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 33AABCA1234F1Z0"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Invoice prefix</label>
                <div className="input-wrapper">
                  <ClipboardList className="input-icon" size={18} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. INV-"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label className="form-label">Company Address</label>
              <div className="input-wrapper" style={{ alignItems: "flex-start" }}>
                <MapPin className="input-icon" size={18} style={{ marginTop: "0.85rem" }} />
                <textarea
                  className="form-input"
                  style={{ height: "90px", paddingLeft: "2.75rem", resize: "none" }}
                  placeholder="Street address, city, postal code..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Save size={18} />
                  Save Settings Configuration
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 1: Backup & Restore */}
          <div className="content-box" style={{ maxWidth: "700px" }}>
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <Database size={18} style={{ color: "var(--accent-secondary)" }} />
              Full Database Backup & Restore
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              Export a complete backup containing all collections (products, users, orders, settings, and logs) or upload a JSON backup file to restore the database to a previous state.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button className="btn-primary" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: "0.5rem" }} onClick={handleExport}>
                <Download size={16} /> Export Backup File (.json)
              </button>

              <label
                htmlFor="restore-file-input"
                className="btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  margin: 0,
                  padding: "0.6rem 1.2rem",
                  fontSize: "0.9rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Upload size={16} /> Upload & Restore Database
              </label>
              <input
                id="restore-file-input"
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* Card 2: Bulk Product Import */}
          <div className="content-box" style={{ maxWidth: "700px" }}>
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <FileUp size={18} style={{ color: "var(--accent-primary)" }} />
              Product Catalog Bulk Import
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              Import new products or update existing inventory details in bulk by uploading a CSV spreadsheet or JSON catalog.
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.2)",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-secondary)", marginBottom: "0.5rem" }}>
                CSV Template Header Requirements:
              </div>
              <code
                style={{
                  fontSize: "0.8rem",
                  display: "block",
                  wordBreak: "break-all",
                  background: "rgba(255,255,255,0.05)",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                }}
              >
                name,sku,barcode,category,brand,costPrice,sellingPrice,quantity,minimumStock
              </code>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <label
                htmlFor="import-file-input"
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  margin: 0,
                  padding: "0.6rem 1.2rem",
                  fontSize: "0.9rem",
                  width: "auto",
                }}
              >
                <Upload size={16} /> Choose CSV / JSON File
              </label>
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.json"
                onChange={handleProductImport}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* Card 3: Excel Data Export Center */}
          <div className="content-box" style={{ maxWidth: "700px" }}>
            <h3 className="content-box-title" style={{ marginBottom: "1.5rem" }}>
              <Download size={18} style={{ color: "var(--accent-secondary)" }} />
              Excel Data Export Center
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              Export system database collections directly to CSV formats fully compatible with Microsoft Excel, Google Sheets, and other spreadsheet tools.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("products")}>
                <span>Product Catalog</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("sales")}>
                <span>Sales Ledger</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("purchases")}>
                <span>Purchase Ledger</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("stockLocations")}>
                <span>Warehouse Stock Mapping</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("customers")}>
                <span>Customers List</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("suppliers")}>
                <span>Suppliers List</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("expenses")}>
                <span>Expenses Ledger</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
              <button className="btn-secondary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }} onClick={() => handleExcelExport("transactions")}>
                <span>Inventory Audit Ledger</span>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>CSV / Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
