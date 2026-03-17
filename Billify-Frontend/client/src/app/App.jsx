import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api.js";
import { API_BASE, REFRESH_KEY, currency, emptyLineItem } from "./constants.js";

function getLineAmounts(item) {
  const quantity = Number(item.quantity || 0);
  const listPrice = Number(item.listPrice ?? item.rate ?? 0);
  const discount = Number(item.discount || 0);
  const cgstRate = Number(item.cgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0));
  const sgstRate = Number(item.sgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0));
  const taxable = Math.max(0, quantity * listPrice - discount);
  const cgstAmount = taxable * (cgstRate / 100);
  const sgstAmount = taxable * (sgstRate / 100);
  const lineTotal = taxable + cgstAmount + sgstAmount;
  return { quantity, listPrice, discount, cgstRate, sgstRate, taxable, cgstAmount, sgstAmount, lineTotal };
}

function buildTotals(items) {
  const totals = items.reduce(
    (acc, item) => {
      const amounts = getLineAmounts(item);
      acc.subtotal += amounts.taxable;
      acc.taxTotal += amounts.cgstAmount + amounts.sgstAmount;
      return acc;
    },
    { subtotal: 0, taxTotal: 0 }
  );
  return { ...totals, grandTotal: totals.subtotal + totals.taxTotal };
}

function buildPayloadItems(items) {
  return items.map((item) => {
    const amounts = getLineAmounts(item);
    return {
      description: item.description,
      hsnSac: item.hsnSac || "",
      quantity: amounts.quantity,
      unit: item.unit || "Nos",
      listPrice: amounts.listPrice,
      rate: amounts.listPrice,
      discount: amounts.discount,
      cgstRate: amounts.cgstRate,
      sgstRate: amounts.sgstRate,
      taxRate: amounts.cgstRate + amounts.sgstRate
    };
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("billify_token") || "");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState("login");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [reportPaidId, setReportPaidId] = useState("");

  const [customerEditId, setCustomerEditId] = useState("");
  const [invoiceItems, setInvoiceItems] = useState([emptyLineItem()]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    city: "",
    state: "",
    postalCode: "",
    bankAccountHolder: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: ""
  });

  const totals = useMemo(() => buildTotals(invoiceItems), [invoiceItems]);

  const handleTokenRefresh = async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      const data = await apiFetch("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (data?.accessToken) {
        localStorage.setItem("billify_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_KEY, data.refreshToken);
        }
        setToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      localStorage.removeItem("billify_token");
      localStorage.removeItem(REFRESH_KEY);
      setToken("");
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me", {}, token, handleTokenRefresh)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("billify_token");
        localStorage.removeItem(REFRESH_KEY);
        setToken("");
        setUser(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshData();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || "",
      businessName: user.businessName || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      gstin: user.gstin || "",
      city: user.city || "",
      state: user.state || "",
      postalCode: user.postalCode || "",
      bankAccountHolder: user.bankAccountHolder || "",
      bankName: user.bankName || "",
      bankAccountNumber: user.bankAccountNumber || "",
      bankIfsc: user.bankIfsc || "",
      bankBranch: user.bankBranch || ""
    });
  }, [user]);

  async function refreshData() {
    const [customersData, productsData, invoicesData] = await Promise.all([
      apiFetch("/customers", {}, token, handleTokenRefresh),
      apiFetch("/products", {}, token, handleTokenRefresh),
      apiFetch("/invoices", {}, token, handleTokenRefresh)
    ]);
    setCustomers(customersData.customers || []);
    setProducts(productsData || []);
    setInvoices(invoicesData || []);
    await refreshSummary();
  }

  async function refreshSummary(month) {
    const query = month ? `?month=${month}` : "";
    const data = await apiFetch(`/reports/summary${query}`, {}, token, handleTokenRefresh);
    setSummary(data);
  }

  const handleAuth = async (event, mode) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      const payload = Object.fromEntries(formData.entries());
      const data = await apiFetch(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setToken(data.accessToken);
      localStorage.setItem("billify_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      setUser(data.user);
      setView("dashboard");
      setNotice("");
      await refreshData();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" }, token, handleTokenRefresh);
    } catch {
      // ignore
    }
    localStorage.removeItem("billify_token");
    localStorage.removeItem(REFRESH_KEY);
    setToken("");
    setUser(null);
  };

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      if (customerEditId) {
        await apiFetch(`/customers/${customerEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, token, handleTokenRefresh);
        setCustomerEditId("");
      } else {
        await apiFetch("/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, token, handleTokenRefresh);
      }
      event.target.reset();
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCustomerEdit = (customer) => {
    const form = document.getElementById("customerForm");
    if (!form) return;
    form.name.value = customer.name;
    form.customerCode.value = customer.customerCode;
    form.email.value = customer.email || "";
    form.phone.value = customer.phone || "";
    form.address.value = customer.address || "";
    form.gstin.value = customer.gstin || "";
    setCustomerEditId(customer._id);
  };

  const handleCustomerDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    await apiFetch(`/customers/${id}`, { method: "DELETE" }, token, handleTokenRefresh);
    await refreshData();
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await apiFetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, token, handleTokenRefresh);
      event.target.reset();
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProductDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await apiFetch(`/products/${id}`, { method: "DELETE" }, token, handleTokenRefresh);
    await refreshData();
  };

  const handleInvoiceSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payloadItems = buildPayloadItems(invoiceItems).filter(
      (item) => item.description && item.quantity > 0
    );
    const payload = {
      customerId: formData.get("customerId"),
      issueDate: formData.get("issueDate"),
      dueDate: formData.get("dueDate"),
      notes: formData.get("notes"),
      items: payloadItems
    };
    if (!payload.items.length) {
      alert("Add at least one line item.");
      return;
    }
    await apiFetch("/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, token, handleTokenRefresh);
    event.target.reset();
    setInvoiceItems([emptyLineItem()]);
    setSelectedProductId("");
    await refreshData();
  };

  const handlePreview = () => {
    const form = document.getElementById("invoiceForm");
    if (!form) return;
    const formData = new FormData(form);
    const previewItems = buildPayloadItems(invoiceItems).filter(
      (item) => item.description && item.quantity > 0
    );
    const data = {
      customerId: formData.get("customerId"),
      issueDate: formData.get("issueDate"),
      dueDate: formData.get("dueDate"),
      notes: formData.get("notes"),
      items: previewItems,
      invoiceNumber: "PREVIEW"
    };
    if (!data.customerId || data.items.length === 0) {
      alert("Select a customer and add line items.");
      return;
    }
    setInvoicePreview(data);
  };

  const handleInvoiceReset = () => {
    const form = document.getElementById("invoiceForm");
    if (form) {
      form.reset();
    }
    setInvoiceItems([emptyLineItem()]);
    setSelectedProductId("");
    setInvoicePreview(null);
  };

  const pendingInvoices = invoices.filter((inv) => inv.status !== "paid");

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await apiFetch("/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      }, token, handleTokenRefresh);
      setUser(data.user);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const { response, data } = await (async () => {
        try {
          const res = await fetch(`${API_BASE}/reports/customers.csv`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { response: res, data: null };
        } catch {
          throw new Error("API is unreachable. Start the backend on http://127.0.0.1:5000.");
        }
      })();

      if (response.status === 401) {
        const refreshed = await handleTokenRefresh();
        if (!refreshed) {
          throw new Error("Invalid or expired token");
        }
        const retry = await fetch(`${API_BASE}/reports/customers.csv`, {
          headers: { Authorization: `Bearer ${refreshed}` }
        });
        if (!retry.ok) throw new Error("Unable to download CSV");
        const blob = await retry.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "billify_customers.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to download CSV");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "billify_customers.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkPaid = async (id) => {
    await apiFetch(`/invoices/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" })
    }, token, handleTokenRefresh);
    await refreshData();
  };

  const handleInvoiceSelect = async (id) => {
    const invoice = await apiFetch(`/invoices/${id}`, {}, token, handleTokenRefresh);
    setInvoicePreview({
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customer._id,
      issueDate: invoice.issueDate?.split("T")[0],
      dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : "",
      notes: invoice.notes,
      items: invoice.items
    });
    setView("invoices");
  };

  if (!token) {
    return (
      <div className="app-shell auth-shell">
        <header className="glass-navbar">
          <div className="brand">
            <div className="brand-mark">B</div>
            <div>
              <p className="brand-name">Billify</p>
              <p className="brand-tagline">Billing that feels effortless</p>
            </div>
          </div>
          <div className="nav-center">
            <span className="nav-pill">Dashboard</span>
            <span className="nav-pill">Customers</span>
            <span className="nav-pill">Invoices</span>
          </div>
          <div className="nav-actions">
            <button className="btn-ghost" type="button" onClick={() => setAuthMode("login")}>
              Sign in
            </button>
            <button className="btn-primary" type="button" onClick={() => setAuthMode("register")}>
              Get started
            </button>
          </div>
        </header>
        <main className="auth-grid">
          <section className="glass-panel hero-panel">
            <div className="hero-badge">Invoice OS for modern teams</div>
            <h1>Build invoices your customers actually want to read.</h1>
            <p>
              Billify helps small teams move from customer intake to polished invoices without the spreadsheet drag.
            </p>
            <div className="hero-list">
              <div className="hero-item">Track customers, products, and invoices in one place</div>
              <div className="hero-item">Live preview of every invoice before you send</div>
              <div className="hero-item">Monthly revenue summary in seconds</div>
            </div>
          </section>
          <section className="glass-panel auth-panel">
            <div className="auth-tabs">
              <button
                className={`tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={`tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Create account
              </button>
            </div>
            <div className="auth-forms">
              {authMode === "login" && (
                <form className="form" onSubmit={(e) => handleAuth(e, "login")} id="loginForm">
                  <label>
                    Email
                    <input name="email" type="email" required placeholder="you@company.com" />
                  </label>
                  <label>
                    Password
                    <input name="password" type="password" required placeholder="Enter your password" />
                  </label>
                  <button className="btn-primary" type="submit">Enter Billify</button>
                </form>
              )}
              {authMode === "register" && (
                <form className="form" onSubmit={(e) => handleAuth(e, "register")} id="registerForm">
                  <label>
                    Name
                    <input name="name" type="text" required placeholder="Alex Morgan" />
                  </label>
                  <label>
                    Business name
                    <input name="businessName" type="text" required placeholder="Northwind Studio" />
                  </label>
                  <label>
                    Email
                    <input name="email" type="email" required placeholder="hello@northwind.com" />
                  </label>
                  <label>
                    Password
                    <input name="password" type="password" required minLength={6} placeholder="Create a password" />
                  </label>
                  <button className="btn-primary" type="submit">Create Billify account</button>
                </form>
              )}
              {notice && <p className="notice">{notice}</p>}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const previewCustomer = customers.find((c) => c._id === invoicePreview?.customerId);
  const previewTotals = invoicePreview ? buildTotals(invoicePreview.items) : null;

  return (
    <div className="app-shell">
      <header className="glass-navbar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <p className="brand-name">Billify</p>
            <p className="brand-tagline">Billing that feels effortless</p>
          </div>
        </div>
        <nav className="nav-center">
          {[
            ["dashboard", "Dashboard"],
            ["customers", "Customers"],
            ["products", "Products"],
            ["invoices", "Invoices"],
            ["reports", "Reports"]
          ].map(([key, label]) => (
            <button
              key={key}
              className={`nav-pill ${view === key ? "active" : ""}`}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <div className="profile-chip">
            <span className="profile-dot" />
            {user?.businessName}
          </div>
          <button className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar glass-panel">
          <div className="profile-card">
            <p className="profile-name">{user?.name}</p>
            <p className="profile-business">{user?.businessName}</p>
            <div className="profile-details">
              <p>{user?.email || "Email not set"}</p>
              <p>{user?.phone || "Phone not set"}</p>
              <p>{user?.address || "Address not set"}</p>
              <p>{user?.city || "City not set"}</p>
              <p>{user?.state || "State not set"}</p>
              <p>{user?.postalCode || "Postal code not set"}</p>
              <p>{user?.gstin || "GSTIN not set"}</p>
              <p>{user?.bankAccountHolder || "A/c holder not set"}</p>
              <p>{user?.bankName || "Bank name not set"}</p>
              <p>{user?.bankAccountNumber || "A/c no. not set"}</p>
              <p>{user?.bankIfsc || "IFSC not set"}</p>
              <p>{user?.bankBranch || "Branch not set"}</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            {[
              ["dashboard", "Dashboard"],
              ["customers", "Customers"],
              ["products", "Products"],
              ["invoices", "Invoices"],
              ["reports", "Reports"]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`sidebar-item ${view === key ? "active" : ""}`}
                onClick={() => setView(key)}
              >
                <span className="sidebar-icon" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main">
          {view === "dashboard" && (
            <section className="card">
              <div className="panel-header">
                <div>
                  <h2>Dashboard</h2>
                  <p className="muted">Your billing snapshot for the month.</p>
                </div>
                <button className="btn-primary" onClick={() => setView("invoices")}>Create invoice</button>
              </div>
              <div className="card profile-editor">
                <div className="card-header">
                  <h3>Shop Owner Details</h3>
                  <p className="muted">Edit and keep your business profile up to date.</p>
                </div>
                <form className="form-shell" onSubmit={handleProfileSubmit}>
                  <div className="form-grid">
                    <label>
                      Owner name
                      <input name="name" value={profileForm.name} onChange={handleProfileChange} />
                    </label>
                    <label>
                      Shop name
                      <input name="businessName" value={profileForm.businessName} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      Email
                      <input name="email" type="email" value={profileForm.email} onChange={handleProfileChange} />
                    </label>
                    <label>
                      Phone number
                      <input name="phone" value={profileForm.phone} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <label>
                    Address
                    <textarea name="address" rows={3} value={profileForm.address} onChange={handleProfileChange} />
                  </label>
                  <div className="form-grid">
                    <label>
                      GSTIN
                      <input name="gstin" value={profileForm.gstin} onChange={handleProfileChange} />
                    </label>
                    <label>
                      City
                      <input name="city" value={profileForm.city} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      State
                      <input name="state" value={profileForm.state} onChange={handleProfileChange} />
                    </label>
                    <label>
                      Postal code
                      <input name="postalCode" value={profileForm.postalCode} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      A/c Holder
                      <input
                        name="bankAccountHolder"
                        value={profileForm.bankAccountHolder}
                        onChange={handleProfileChange}
                      />
                    </label>
                    <label>
                      Bank Name
                      <input name="bankName" value={profileForm.bankName} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      A/c No.
                      <input
                        name="bankAccountNumber"
                        value={profileForm.bankAccountNumber}
                        onChange={handleProfileChange}
                      />
                    </label>
                    <label>
                      IFSC Code
                      <input name="bankIfsc" value={profileForm.bankIfsc} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      Branch
                      <input name="bankBranch" value={profileForm.bankBranch} onChange={handleProfileChange} />
                    </label>
                  </div>
                  <div className="form-actions end">
                    <button className="btn-primary" type="submit">Save details</button>
                  </div>
                </form>
              </div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon orange" />
                  <p>Revenue</p>
                  <h3>{currency(summary?.revenue || 0)}</h3>
                </div>
                <div className="stat-card">
                  <div className="stat-icon coral" />
                  <p>Invoices</p>
                  <h3>{summary?.invoiceCount || 0}</h3>
                </div>
                <div className="stat-card">
                  <div className="stat-icon mint" />
                  <p>Paid</p>
                  <h3>{summary?.paidCount || 0}</h3>
                </div>
                <div className="stat-card">
                  <div className="stat-icon gold" />
                  <p>Pending</p>
                  <h3>{summary?.pendingCount || 0}</h3>
                </div>
              </div>
              <div className="split-grid">
                <div>
                  <h3>Recent invoices</h3>
                  <div className="list">
                    {invoices.slice(0, 4).map((inv) => (
                      <div key={inv._id} className="list-item">
                        <span>{inv.invoiceNumber}</span>
                        <span>{currency(inv.grandTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Customers to follow up</h3>
                  <div className="list">
                    {customers.slice(0, 4).map((cust) => (
                      <div key={cust._id} className="list-item">
                        <span>{cust.name}</span>
                        <span>{cust.customerCode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === "customers" && (
            <section className="card">
              <div className="card-header">
                <h2>Customer Management</h2>
                <p className="muted">Create and manage your customer records.</p>
              </div>
              <form
                id="customerForm"
                className="form-shell"
                onSubmit={handleCustomerSubmit}
                onReset={() => setCustomerEditId("")}
              >
                <div className="form-grid">
                  <label>
                    Customer name
                    <input name="name" required placeholder="Aman Chahar" />
                  </label>
                  <label>
                    Customer ID
                    <input name="customerCode" required placeholder="CUS-102" />
                  </label>
                </div>
                <label>
                  Address
                  <textarea name="address" rows={3} placeholder="Enter address here..." />
                </label>
                <div className="form-grid">
                  <label>
                    Phone number
                    <input name="phone" placeholder="+91 98765 43210" />
                  </label>
                  <label>
                    GSTIN (if available)
                    <input name="gstin" placeholder="27ABCDE1234F1Z9" />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Email
                    <input name="email" type="email" placeholder="accounts@company.com" />
                  </label>
                </div>
                <div className="form-actions end">
                  <button className="btn-primary" type="submit">
                    {customerEditId ? "Update customer" : "Save customer"}
                  </button>
                  <button className="btn-ghost" type="reset">Clear</button>
                </div>
              </form>
              <div className="table-card">
                <div className="table-header">
                  <h3>Customer List</h3>
                </div>
                <div className="modern-table compact">
                  <div className="table-row header">
                    <div>ID</div>
                    <div>Name</div>
                    <div>Phone</div>
                    <div>GSTIN</div>
                    <div>Actions</div>
                  </div>
                  {customers.map((customer, index) => (
                    <div className="table-row" key={customer._id}>
                      <div>{index + 1}</div>
                      <div>{customer.name}</div>
                      <div>{customer.phone || "-"}</div>
                      <div>{customer.gstin || "-"}</div>
                      <div className="row-actions">
                        <button className="link" onClick={() => handleCustomerEdit(customer)}>Edit</button>
                        <button className="link danger" onClick={() => handleCustomerDelete(customer._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="export-row">
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={handleDownloadCsv}
                  >
                    Export Customers with Products
                  </button>
                </div>
              </div>
          </section>
          )}

          {view === "products" && (
            <section className="card">
              <h2>Products</h2>
              <form className="grid-form" onSubmit={handleProductSubmit}>
                <label>
                  Product name
                  <input name="name" required placeholder="Design retainer" />
                </label>
                <label>
                  HSN/SAC Code
                  <input name="hsnSac" placeholder="9983" />
                </label>
                <label>
                  Price
                  <input name="price" type="number" step="0.01" required placeholder="12000" />
                </label>
                <label>
                  CGST %
                  <input name="cgstRate" type="number" step="0.1" placeholder="9" />
                </label>
                <label>
                  SGST %
                  <input name="sgstRate" type="number" step="0.1" placeholder="9" />
                </label>
                <label>
                  Tax rate
                  <input name="taxRate" type="number" step="0.1" placeholder="18" />
                </label>
                <div className="form-actions">
                  <button className="btn-primary" type="submit">Add product</button>
                  <button className="btn-ghost" type="reset">Clear</button>
                </div>
              </form>
              <div className="modern-table products-table">
                <div className="table-row header">
                  <div>Product</div>
                  <div>HSN/SAC</div>
                  <div>Price</div>
                  <div>CGST</div>
                  <div>SGST</div>
                  <div>GST</div>
                  <div>Actions</div>
                </div>
                {products.map((product) => (
                  <div className="table-row" key={product._id}>
                    <div>{product.name}</div>
                  <div>{product.hsnSac || "-"}</div>
                  <div>{currency(product.price)}</div>
                  <div>{product.cgstRate ?? 0}%</div>
                  <div>{product.sgstRate ?? 0}%</div>
                  <div>{product.taxRate || 0}%</div>
                  <div>
                    <button className="link" onClick={() => handleProductDelete(product._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {view === "invoices" && (
            <section className="invoice-shell invoice-page">
              <div className="invoice-page-header">
                <h2>Create New Invoice</h2>
                <p className="muted">Select a customer, add items, and preview instantly.</p>
              </div>
              <div className="invoice-stack">
              <form id="invoiceForm" className="card form-card invoice-form" onSubmit={handleInvoiceSubmit}>
                <div className="section-title">
                  <span className="section-icon" />
                  <h3>Create New Invoice</h3>
                </div>

                <div className="form-grid">
                  <label>
                    Select Customer
                    <select name="customerId" required>
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.customerCode})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Invoice Date *
                    <input name="issueDate" type="date" required />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Select Products
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({currency(product.price)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="btn-primary btn-add"
                      onClick={() => {
                        const product = products.find((p) => p._id === selectedProductId);
                        if (!product) return;
                        const cgst = Number(product.cgstRate ?? (product.taxRate || 0) / 2);
                        const sgst = Number(product.sgstRate ?? (product.taxRate || 0) / 2);
                        setInvoiceItems([...invoiceItems, {
                          description: product.name,
                          hsnSac: product.hsnSac || "",
                          quantity: 1,
                          unit: "Nos",
                          listPrice: product.price,
                          rate: product.price,
                          discount: 0,
                          cgstRate: cgst,
                          sgstRate: sgst,
                          taxRate: Number(product.taxRate || (cgst + sgst))
                        }]);
                        setSelectedProductId("");
                      }}
                    >
                      Add Product
                    </button>
                  </div>
                </div>

                <div className="line-items boxed">
                  <p className="section-label">Invoice Items *</p>
                  <div className="line-item-head">
                    <span>Description</span>
                    <span>HSN/SAC</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>List Price</span>
                    <span>Discount</span>
                    <span>GST %</span>
                    <span>CGST %</span>
                    <span>SGST %</span>
                    <span>Amount</span>
                    <span />
                  </div>
                  {invoiceItems.map((item, index) => {
                    const amounts = getLineAmounts(item);
                    return (
                      <div className="line-item" key={`line-${index}`}>
                        <input
                          placeholder="Product Description *"
                          value={item.description}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[index].description = e.target.value;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          placeholder="HSN/SAC"
                          value={item.hsnSac || ""}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[index].hsnSac = e.target.value;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[index].quantity = Number(e.target.value || 0);
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          placeholder="Unit"
                          value={item.unit || "Nos"}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[index].unit = e.target.value;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="List Price (₹)"
                          value={item.listPrice ?? item.rate ?? 0}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            const value = Number(e.target.value || 0);
                            next[index].listPrice = value;
                            next[index].rate = value;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Discount (₹)"
                          value={item.discount || 0}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[index].discount = Number(e.target.value || 0);
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="GST %"
                          value={item.taxRate ?? 0}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            const value = Number(e.target.value || 0);
                            const half = value / 2;
                            next[index].taxRate = value;
                            next[index].cgstRate = half;
                            next[index].sgstRate = half;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="CGST %"
                          value={item.cgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0)}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            const value = Number(e.target.value || 0);
                            const sgst = Number(
                              next[index].sgstRate ?? (next[index].taxRate ? Number(next[index].taxRate) / 2 : 0)
                            );
                            next[index].cgstRate = value;
                            next[index].taxRate = value + sgst;
                            setInvoiceItems(next);
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="SGST %"
                          value={item.sgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0)}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            const value = Number(e.target.value || 0);
                            const cgst = Number(
                              next[index].cgstRate ?? (next[index].taxRate ? Number(next[index].taxRate) / 2 : 0)
                            );
                            next[index].sgstRate = value;
                            next[index].taxRate = value + cgst;
                            setInvoiceItems(next);
                          }}
                        />
                        <input readOnly value={currency(amounts.lineTotal)} />
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== index))}
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn-ghost add-row"
                    onClick={() => setInvoiceItems([...invoiceItems, emptyLineItem()])}
                  >
                    + Add Custom Item
                  </button>
                </div>

                <div className="divider" />

                <div className="form-actions">
                  <button className="btn-primary btn-preview" type="button" onClick={handlePreview}>Preview</button>
                  <button className="btn-ghost" type="button" onClick={handleInvoiceReset}>Reset</button>
                </div>
                <button className="visually-hidden" type="submit">Save</button>
              </form>

              <div className="card preview-card invoice-preview">
                <div className="preview-header">
                  <div className="section-title">
                    <span className="section-icon dot" />
                    <h3>Invoice Preview</h3>
                  </div>
                </div>
                {invoicePreview ? (
                  <div className="invoice-sheet tax-invoice detailed-invoice">
                    <div className="invoice-header">
                      <div>
                        <h4>{user?.businessName || "Billify"}</h4>
                        <p>{user?.name}</p>
                        <p>{user?.address || "Business address"}</p>
                        <p>
                          {[user?.city, user?.state, user?.postalCode].filter(Boolean).join(", ") || "City, State, Pincode"}
                        </p>
                        <p>Phone: {user?.phone || "-"}</p>
                      </div>
                      <div className="invoice-meta">
                        <p>Date: {formatDate(invoicePreview.issueDate)}</p>
                        <p>GSTIN: {user?.gstin || "N/A"}</p>
                      </div>
                    </div>
                    <div className="invoice-title-row">
                      <div className="invoice-title">TAX INVOICE</div>
                      <div className="invoice-copy">Original Copy</div>
                    </div>

                    <div className="invoice-info-grid">
                      <div className="info-card">
                        <p><strong>Invoice Date:</strong> {formatDate(invoicePreview.issueDate)}</p>
                        <p><strong>Billed To:</strong> {previewCustomer?.name || "Customer"}</p>
                        <p><strong>GSTIN:</strong> {previewCustomer?.gstin || "N/A"}</p>
                      </div>
                      <div className="info-card">
                        <p><strong>Place of Supply:</strong> {previewCustomer?.state || user?.state || "-"}</p>
                        <p><strong>Address:</strong> {previewCustomer?.address || "-"}</p>
                        <p><strong>Phone:</strong> {previewCustomer?.phone || "-"}</p>
                      </div>
                    </div>

                    <table className="invoice-table compact-table bordered-table">
                      <thead>
                        <tr>
                          <th>S.N.</th>
                          <th>Description of Goods</th>
                          <th>HSN/SAC Code</th>
                          <th>Qty.</th>
                          <th>Unit</th>
                          <th>List Price</th>
                          <th>Discount</th>
                          <th>GST %</th>
                          <th>CGST Rate</th>
                          <th>CGST Amount</th>
                          <th>SGST Rate</th>
                          <th>SGST Amount</th>
                          <th>Amount( )</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicePreview.items.map((item, index) => {
                          const amounts = getLineAmounts(item);
                          return (
                            <tr key={`${item.description}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{item.description}</td>
                              <td>{item.hsnSac || "-"}</td>
                              <td>{amounts.quantity}</td>
                              <td>{item.unit || "Nos"}</td>
                              <td>{currency(amounts.listPrice)}</td>
                              <td>{amounts.discount ? currency(amounts.discount) : "-"}</td>
                              <td>{amounts.cgstRate + amounts.sgstRate}%</td>
                              <td>{amounts.cgstRate}%</td>
                              <td>{currency(amounts.cgstAmount)}</td>
                              <td>{amounts.sgstRate}%</td>
                              <td>{currency(amounts.sgstAmount)}</td>
                              <td>{currency(amounts.lineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="invoice-total-grid">
                      <div className="total-label">Grand Total</div>
                      <div className="total-value">{currency(previewTotals?.grandTotal)}</div>
                    </div>
                    <div className="invoice-notes">
                      <p>Amount in words: {previewTotals ? "See total above" : ""}</p>
                      <p>{invoicePreview.notes}</p>
                    </div>
                    <div className="invoice-bank">
                      <p className="bank-title">Company's Bank Details</p>
                      <p><strong>A/c Holder:</strong> {user?.bankAccountHolder || "-"}</p>
                      <p><strong>Bank Name:</strong> {user?.bankName || "-"}</p>
                      <p><strong>A/c No.:</strong> {user?.bankAccountNumber || "-"}</p>
                      <p><strong>IFSC Code:</strong> {user?.bankIfsc || "-"}</p>
                      <p><strong>Branch:</strong> {user?.bankBranch || "-"}</p>
                    </div>
                    <div className="invoice-terms">
                      <p className="terms-title">Terms &amp; Conditions</p>
                      <p>E. &amp; O. E.</p>
                      <ol>
                        <li>Goods once sold will not be taken back.</li>
                        <li>Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.</li>
                        <li>Subject to Madhya Pradesh jurisdiction only.</li>
                      </ol>
                    </div>
                    <div className="invoice-sign">
                      <p>For {user?.businessName || "Billify"}</p>
                      <p>Authorized Signatory</p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-preview">
                    <div className="empty-icon" />
                    <p className="muted">Your invoice preview will appear here after generation.</p>
                  </div>
                )}
                <div className="preview-actions">
                  <button className="btn-primary btn-preview" type="button" onClick={() => window.print()}>
                    Print Invoice
                  </button>
                </div>
              </div>
              </div>

              <div className="modern-table" style={{ display: "none" }} />
            </section>
          )}

          {view === "reports" && (
            <section className="card">
              <div className="panel-header">
                <div>
                  <h2>Reports</h2>
                  <p className="muted">Monthly summary and exports.</p>
                </div>
                <div className="panel-actions reports-actions">
                  <input
                    type="month"
                    placeholder="Select month"
                    aria-label="Select month"
                    onChange={(e) => refreshSummary(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => refreshSummary()}>Refresh</button>
                </div>
              </div>
              <div className="summary-grid">
                <div className="summary-card"><strong>Month</strong><p>{summary?.month}</p></div>
                <div className="summary-card"><strong>Invoices</strong><p>{summary?.invoiceCount}</p></div>
                <div className="summary-card"><strong>Paid</strong><p>{summary?.paidCount}</p></div>
                <div className="summary-card"><strong>Pending</strong><p>{summary?.pendingCount}</p></div>
                <div className="summary-card"><strong>Revenue</strong><p>{currency(summary?.revenue || 0)}</p></div>
              </div>
              <div className="export-card">
                <p>Mark an invoice as paid.</p>
                <div className="reports-actions">
                  <select value={reportPaidId} onChange={(e) => setReportPaidId(e.target.value)}>
                    <option value="">Select pending invoice</option>
                    {pendingInvoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} - {currency(inv.grandTotal)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary"
                    type="button"
                    disabled={!reportPaidId}
                    onClick={async () => {
                      if (!reportPaidId) return;
                      await handleMarkPaid(reportPaidId);
                      setReportPaidId("");
                    }}
                  >
                    Mark as paid
                  </button>
                </div>
              </div>
              <div className="export-card">
                <p>Download customers CSV with total billed revenue.</p>
                <button className="btn-ghost" onClick={handleDownloadCsv}>Download CSV</button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}





