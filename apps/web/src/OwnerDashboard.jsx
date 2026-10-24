
import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";
const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);

export default function OwnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("Loading orders...");
  const [refreshing, setRefreshing] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
const [products, setProducts] = useState([]);
const [newProduct, setNewProduct] = useState({
  name: "",
  category: "Fresh Produce",
  pricePerKg: "",
  unit: "kg",
  imageUrl: "",
  description: "",
  available: true,
});
const [shopSettings, setShopSettings] = useState({
  closed: false,
  closureMessage: "We'll be back soon as we restock.",
  supportPhone: "0110396227",
});
const [savingSettings, setSavingSettings] = useState(false);
const [settingsMessage, setSettingsMessage] = useState("");
    async function loadOrders() {
    setRefreshing(true);

    try {
const response = await fetch(`${API_URL}/api/orders`, {
        headers: {
          "x-owner-password": ownerPassword,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Could not load orders (${response.status}).`
        );
      }

      setOrders(data.orders || []);
      setMessage(
        data.orders?.length
          ? ""
          : "No orders have been received yet."
      );
    } catch (error) {
      setMessage(
        error.message || "Unknown error while loading orders."
      );
    } finally {
      setRefreshing(false);
    }
  }

    async function updateStatus(reference, status) {
    try {
      const response = await fetch(
  `${API_URL}/api/orders/${reference}/status`,
  {
          method: "PATCH",
          headers: {
  "Content-Type": "application/json",
  "x-owner-password": ownerPassword,
},
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update order status.");
      }

      await loadOrders();
      setMessage(`Order ${reference} updated to ${status}.`);
    } catch (error) {
      setMessage(error.message || "Could not update order status.");
    }
  }
  async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/api/products`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load products.");
    }

    setProducts(data.products || []);
  } catch (error) {
    setSettingsMessage(error.message || "Could not load products.");
  }
}

async function loadShopSettings() {
  try {
    const response = await fetch(`${API_URL}/api/shop-settings`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load shop settings.");
    }

    if (data.settings) {
      setShopSettings((current) => ({
        ...current,
        ...data.settings,
      }));
    }
  } catch (error) {
    setSettingsMessage(error.message || "Could not load shop settings.");
  }
}

async function saveProducts() {
  setSavingSettings(true);
  setSettingsMessage("");

  try {
    const response = await fetch(`${API_URL}/api/products`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-password": ownerPassword,
      },
      body: JSON.stringify({ products }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not save products.");
    }

    setProducts(data.products || products);
    setSettingsMessage("Products saved successfully.");
  } catch (error) {
    setSettingsMessage(error.message || "Could not save products.");
  } finally {
    setSavingSettings(false);
  }
}
function addNewProduct() {
  const name = newProduct.name.trim();
  const unit = newProduct.unit.trim();

  if (!name || !unit) {
    setSettingsMessage("Enter the product name and unit.");
    return;
  }

  const price =
    newProduct.pricePerKg === ""
      ? null
      : Number(newProduct.pricePerKg);

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    setSettingsMessage("Enter a valid price.");
    return;
  }

  const baseId =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "new-product";

  let id = baseId;
  let suffix = 2;

  while (products.some((product) => product.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix++;
  }

  const imageUrl = newProduct.imageUrl.trim();

  setProducts((current) => [
    ...current,
    {
      id,
      name,
      category: newProduct.category.trim() || "Other",
      pricePerKg: price,
      unit,
      image: imageUrl,
      imageUrl,
      description: newProduct.description.trim(),
      available: newProduct.available,
    },
  ]);

  setNewProduct({
    name: "",
    category: "Fresh Produce",
    pricePerKg: "",
    unit: "kg",
    imageUrl: "",
    description: "",
    available: true,
  });

  setSettingsMessage(
    `Added ${name}. Click Save Product Changes to store it.`
  );
}

async function saveShopSettings() {
  setSavingSettings(true);
  setSettingsMessage("");

  try {
    const response = await fetch(`${API_URL}/api/shop-settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-password": ownerPassword,
      },
      body: JSON.stringify(shopSettings),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not save shop settings.");
    }

    if (data.settings) {
      setShopSettings(data.settings);
    }

    setSettingsMessage("Shop settings saved successfully.");
  } catch (error) {
    setSettingsMessage(error.message || "Could not save shop settings.");
  } finally {
    setSavingSettings(false);
  }
}
  useEffect(() => {
  loadOrders();
  loadProducts();
  loadShopSettings();
}, []);

  return (
    <main className="owner-dashboard">
      <header className="owner-header">
        <div>
          <p className="eyebrow">SELLER AREA</p>
          <h1>Harvest Desk</h1>
          <p>MUSAVI'S GROCERY — Order Management</p>
        </div>

        <input
  type="password"
  placeholder="Enter owner password"
  value={ownerPassword}
  onChange={(event) => setOwnerPassword(event.target.value)}
  autoComplete="current-password"
/>
        <button
          type="button"
          className="add-button"
          onClick={loadOrders}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh Orders"}
        </button>
      </header>

      <section className="owner-stats">
        <article className="owner-stat">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </article>

        <article className="owner-stat">
          <span>Order budgets</span>
          <strong>
            {formatKES(
              orders.reduce((sum, order) => sum + order.total, 0)
            )}
          </strong>
        </article>

        <article className="owner-stat">
          <span>Awaiting action</span>
          <strong>
            {orders.filter((order) => order.status === "Received").length}
          </strong>
        </article>
      </section>

      <section className="owner-orders">
        <h2>Shop settings</h2>

        {settingsMessage && (
          <p role="status">{settingsMessage}</p>
        )}

        <label>
          <input
            type="checkbox"
            checked={shopSettings.closed}
            onChange={(event) =>
              setShopSettings((current) => ({
                ...current,
                closed: event.target.checked,
              }))
            }
          />
          Temporarily close all ordering
        </label>

        <label>
          Customer-facing restocking message
          <textarea
            value={shopSettings.closureMessage}
            onChange={(event) =>
              setShopSettings((current) => ({
                ...current,
                closureMessage: event.target.value,
              }))
            }
            rows={3}
          />
        </label>

        <label>
          Customer support phone number
          <input
            type="tel"
            value={shopSettings.supportPhone}
            onChange={(event) =>
              setShopSettings((current) => ({
                ...current,
                supportPhone: event.target.value,
              }))
            }
          />
        </label>

        <button
          type="button"
          className="add-button"
          onClick={saveShopSettings}
          disabled={savingSettings}
        >
          {savingSettings ? "Saving..." : "Save Shop Settings"}
        </button>
      </section>

      <section className="owner-orders">
        <h2>Manage groceries</h2>
        <p>Edit your products below, then save your changes.</p>

<div className="new-product-form">
  <h3>Add a New Grocery</h3>

  <label>Product name</label>
  <input
    type="text"
    value={newProduct.name}
    onChange={(event) =>
      setNewProduct({ ...newProduct, name: event.target.value })
    }
    placeholder="e.g. Potatoes"
  />

  <label>Category</label>
  <input
    type="text"
    value={newProduct.category}
    onChange={(event) =>
      setNewProduct({ ...newProduct, category: event.target.value })
    }
    placeholder="e.g. Fresh Produce"
  />

  <label>Price (KSh; leave blank if not set)</label>
  <input
    type="number"
    min="0"
    value={newProduct.pricePerKg}
    onChange={(event) =>
      setNewProduct({ ...newProduct, pricePerKg: event.target.value })
    }
    placeholder="e.g. 120"
  />

  <label>Unit</label>
  <input
    type="text"
    value={newProduct.unit}
    onChange={(event) =>
      setNewProduct({ ...newProduct, unit: event.target.value })
    }
    placeholder="e.g. kg, pack, piece"
  />

  <label>Product photo URL (optional)</label>
  <input
    type="url"
    value={newProduct.imageUrl}
    onChange={(event) =>
      setNewProduct({ ...newProduct, imageUrl: event.target.value })
    }
    placeholder="https://..."
  />

  <label>Description</label>
  <textarea
    value={newProduct.description}
    onChange={(event) =>
      setNewProduct({ ...newProduct, description: event.target.value })
    }
    placeholder="Short product description"
  />

  <label>
    <input
      type="checkbox"
      checked={newProduct.available}
      onChange={(event) =>
        setNewProduct({ ...newProduct, available: event.target.checked })
      }
    />
    Available for customers
  </label>

  <button type="button" onClick={addNewProduct}>
    Add Product
  </button>
</div>

        {products.map((product, index) => (
          <article className="owner-order-card" key={product.id}>
            <h3>{product.name}</h3>

            <label>
              Product name
              <input
                value={product.name}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, name: event.target.value }
                        : item
                    )
                  )
                }
              />
            </label>

            <label>
              Price per unit (KSh)
              <input
                type="number"
                min="0"
                step="1"
                value={product.pricePerKg ?? ""}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            pricePerKg:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          }
                        : item
                    )
                  )
                }
              />
            </label>

            <label>
              Unit (e.g. kg, pack, piece)
              <input
                value={product.unit}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, unit: event.target.value }
                        : item
                    )
                  )
                }
              />
            </label>

            <label>
              Product photo URL
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={product.imageUrl ?? product.image ?? ""}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            imageUrl: event.target.value,
                            image: event.target.value,
                          }
                        : item
                    )
                  )
                }
              />
            </label>

            <label>
              Description
              <textarea
                value={product.description}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, description: event.target.value }
                        : item
                    )
                  )
                }
                rows={2}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={product.available}
                onChange={(event) =>
                  setProducts((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, available: event.target.checked }
                        : item
                    )
                  )
                }
              />
              Available for ordering
            </label>
          </article>
        ))}

        <button
          type="button"
          className="add-button"
          onClick={saveProducts}
          disabled={savingSettings || products.length === 0}
        >
          {savingSettings ? "Saving..." : "Save Product Changes"}
        </button>
      </section>

      <section className="owner-orders">
        <h2>Customer orders</h2>

        {message && <p role="status">{message}</p>}

        {orders.map((order) => (
          <article className="owner-order-card" key={order.reference}>
            <div className="owner-order-top">
              <div>
                <span className="product-category">ORDER REFERENCE</span>
                <h3>{order.reference}</h3>
              </div>
<div>
  <span className="owner-status">{order.status}</span>

  <select
    value={order.status}
    onChange={(event) =>
      updateStatus(order.reference, event.target.value)
    }
  >
    <option value="Received">Received</option>
    <option value="Confirmed">Confirmed</option>
    <option value="Out for Delivery">Out for Delivery</option>
    <option value="Delivered">Delivered</option>
    <option value="Cancelled">Cancelled</option>
  </select>
</div>
            </div>

            <div className="owner-order-details">
              <p>
                <strong>Customer:</strong> {order.customerName}
              </p>
              <p>
                <strong>Budget:</strong> {formatKES(order.total)}
              </p>
              <p>
                <strong>Received:</strong>{" "}
                {new Date(order.createdAt).toLocaleString("en-KE")}
              </p>
            </div>

            <p className="owner-note">
              For privacy, this temporary order-list endpoint currently
              returns only summary details. We will add protected access
              and complete delivery details after securing the dashboard.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
