
import { useEffect, useState } from "react";
import OwnerDashboard from "./OwnerDashboard.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);

export default function App() {
    const [page, setPage] = useState("shop");
  const isOwnerPage = window.location.pathname === "/owner";
  const [apiStatus, setApiStatus] = useState("Checking connection...");
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [amounts, setAmounts] = useState({});
  const [basket, setBasket] = useState([]);
  const [basketMessage, setBasketMessage] = useState("");

    
  useEffect(() => {
fetch(`${API_URL}/api/health`)
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then((data) =>
        setApiStatus(data.status === "ok" ? "Connected" : "Unavailable")
      )
      .catch(() => setApiStatus("Offline"));

fetch(`${API_URL}/api/products`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load products");
        return response.json();
      })
      .then((data) => setProducts(data.products))
      .catch(() =>
        setLoadError("We couldn't load products. Please refresh the page.")
      );
  }, []);
  if (isOwnerPage) {
  return <OwnerDashboard />;
}

  const addToBasket = (product) => {
    const amount = Number(amounts[product.id]);

    if (!Number.isFinite(amount) || amount < 10) {
      setBasketMessage("Please enter a budget of at least KSh 10.");
      return;
    }

    if (!product.available) {
      setBasketMessage(`${product.name} is currently out of stock.`);
      return;
    }

    setBasket((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, budget: item.budget + amount }
            : item
        );
      }

      return [...current, { ...product, budget: amount }];
    });

    setBasketMessage(`${product.name} added to your basket.`);
    setAmounts((current) => ({ ...current, [product.id]: "" }));
  };

  const removeFromBasket = (productId) => {
    setBasket((current) =>
      current.filter((item) => item.id !== productId)
    );
    setBasketMessage("Item removed from your basket.");
  };

  const basketTotal = basket.reduce((sum, item) => sum + item.budget, 0);

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon">🌿</span>
          <span>
            <strong>MUSAVI'S GROCERY</strong>
            <small>Fresh from the Farm, Straight to Your Home</small>
          </span>
        </a>
        <a className="basket-link" href="#basket">
          🛒 Basket ({basket.length})
        </a>
        <span className="connection">
          <span
            className={
              apiStatus === "Connected" ? "status-dot online" : "status-dot"
            }
          />
          API: {apiStatus}
        </span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">YOUR NEIGHBOURHOOD GROCERY · KISII</p>
          <h1>
            Fresh groceries.
            <br />
            <span>Fair prices.</span>
          </h1>
          <p className="hero-description">
            Shop everyday essentials and fresh produce. Choose how much
            you want to spend, and we'll help bring your order to your door.
          </p>
          <a className="primary-button" href="#shop">
            Shop groceries ↓
          </a>
          <div className="hero-note">
            Simple ordering · Cash on delivery to start
          </div>
        </section>

        <section className="shop-intro" id="shop">
          <p className="eyebrow">FRESH PICKS</p>
          <h2>Your everyday essentials</h2>
          <p>Fresh produce and everyday groceries around Kisii University.</p>

          {loadError && <p role="alert">{loadError}</p>}
          {!loadError && products.length === 0 && <p>Loading groceries...</p>}

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-picture" aria-hidden="true">
                  {{
                    tomatoes: "🍅",
                    onions: "🧅",
                    garlic: "🧄",
                    "royco-cubes": "🛍️",
                  }[product.id] || "🛒"}
                </div>

                <div className="product-details">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <p className="product-price">
                    {product.pricePerKg !== null
                      ? `${formatKES(product.pricePerKg)} / ${product.unit}`
                      : "Price to be confirmed"}
                  </p>

                  {!product.available ? (
                    <p className="out-of-stock">Currently out of stock</p>
                  ) : (
                    <div className="amount-control">
                      <label htmlFor={`amount-${product.id}`}>
                        Your budget (KSh)
                      </label>
                      <input
                        id={`amount-${product.id}`}
                        type="number"
                        min="10"
                        step="10"
                        placeholder="e.g. 50"
                        value={amounts[product.id] ?? ""}
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [product.id]: event.target.value,
                          }))
                        }
                      />
                      <small>Choose the amount you want to spend.</small>
                      <button
                        className="add-button"
                        type="button"
                        onClick={() => addToBasket(product)}
                      >
                        Add to Basket
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="basket-section" id="basket">
          <p className="eyebrow">YOUR ORDER</p>
          <h2>Shopping basket</h2>

          {basket.length === 0 ? (
            <p>Your basket is empty. Choose a budget and add a grocery.</p>
          ) : (
            <>
              <div className="basket-items">
                {basket.map((item) => (
                  <div className="basket-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>Budget: {formatKES(item.budget)}</p>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeFromBasket(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="basket-total">
                <strong>Subtotal</strong>
                <strong>{formatKES(basketTotal)}</strong>
              </div>
              <p className="basket-note">
                This is your selected spending budget, not a confirmed
                quantity or final weighed amount.
              </p>
              <button
                type="button"
                className="primary-button checkout-button"
                onClick={() =>
                  setBasketMessage(
                    "Your basket is ready. Customer details and order submission are the next step to build."
                  )
                }
              >
                Continue to Checkout
              </button>
            </>
          )}

          {basketMessage && (
            <p className="basket-message" role="status">
              {basketMessage}
            </p>
          )}
        </section>
      
        <section className="checkout-section" id="checkout">
          <p className="eyebrow">DELIVERY DETAILS</p>
          <h2>Where should we deliver?</h2>
          <p>Enter your details so we can contact you about your order.</p>

          <form
            className="checkout-form"
            
onSubmit={async (event) => {
  event.preventDefault();

  if (basket.length === 0) {
    setBasketMessage("Please add groceries to your basket first.");
    return;
  }

  setBasketMessage("Submitting your order...");

  const formData = new FormData(event.currentTarget);

  const orderData = {
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    deliveryLocation: formData.get("deliveryLocation"),
    deliveryInstructions: formData.get("deliveryInstructions") || "",
    items: basket.map((item) => ({
      productId: item.id,
      budget: item.budget,
    })),
  };

  try {
const response = await fetch(`${API_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not submit your order.");
    }

    setBasketMessage(
      `Order received! Reference: ${result.order.reference}. Total budget: ${formatKES(result.order.total)}. We will contact you before delivery. Payment: cash on delivery.`
    );

    setBasket([]);
    setAmounts({});
    const checkoutForm = document.getElementById("checkout-form");
checkoutForm?.reset();
  } catch (error) {
    setBasketMessage(
      error.message || "Could not submit your order. Please try again."
    );
  }
}}
          >
            <label htmlFor="customer-name">Your full name</label>
            <input
              id="customer-name"
              name="customerName"
              type="text"
              placeholder="Enter your full name"
              required
            />

            <label htmlFor="customer-phone">Phone number</label>
            <input
              id="customer-phone"
              name="customerPhone"
              type="tel"
              placeholder="e.g. 07XXXXXXXX"
              pattern="(07|01)[0-9]{8}|254[17][0-9]{8}"
              title="Enter a valid Kenyan mobile number"
              required
            />

            <label htmlFor="delivery-location">Delivery location</label>
            <textarea
              id="delivery-location"
              name="deliveryLocation"
              placeholder="Hostel, building, room, or nearby landmark around Kisii University"
              rows="3"
              required
            />

            <label htmlFor="delivery-instructions">
              Additional delivery instructions (optional)
            </label>
            <textarea
              id="delivery-instructions"
              name="deliveryInstructions"
              placeholder="Any directions to help us find you"
              rows="2"
            />

            <div className="checkout-total">
              <span>Order budget</span>
              <strong>{formatKES(basketTotal)}</strong>
            </div>

            <button
              className="primary-button checkout-button"
              type="submit"
              disabled={basket.length === 0}
            >
              Confirm Details
            </button>
          </form>
          id="checkout-form"
        </section>

      </main>

      <footer>
        <strong>MUSAVI'S GROCERY</strong>
        <p>Fresh from the Farm, Straight to Your Home.</p>
        <small>Serving customers around Kisii University, Kisii, Kenya.</small>
      </footer>
    </div>
  );
}
