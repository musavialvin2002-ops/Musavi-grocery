
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
  useEffect(() => {
    loadOrders();
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
