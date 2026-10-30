
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";

export default function SellerPage() {
  const [sellerMessage, setSellerMessage] = useState("");
  const [sellerSubmitting, setSellerSubmitting] = useState(false);

  async function submitProduct(event) {
    event.preventDefault();

    if (sellerSubmitting) return;

    setSellerSubmitting(true);
    setSellerMessage("Submitting your product...");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const sellerData = {
      sellerName: formData.get("sellerName"),
      sellerPhone: formData.get("sellerPhone"),
      sellerLocation: formData.get("sellerLocation"),
      name: formData.get("productName"),
      category: formData.get("category"),
      pricePerUnit: Number(formData.get("pricePerUnit")),
      unit: formData.get("unit"),
      description: formData.get("description") || "",
      imageUrl: formData.getAll("imageUrls").map(url => url.trim()).filter(Boolean)[0] || "",
      imageUrls: formData.getAll("imageUrls").map(url => url.trim()).filter(Boolean),
      available: true,
    };

    try {
      const response = await fetch(
        `${API_URL}/api/seller-submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sellerData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not submit your product."
        );
      }

      setSellerMessage(
        "Product submitted successfully! It will appear in the shop shortly."
      );

      form.reset();
    } catch (error) {
      setSellerMessage(
        error.message || "Submission failed. Please try again."
      );
    } finally {
      setSellerSubmitting(false);
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon">🌿</span>
          <span>
            <strong>MUSAVI'S GROCERY</strong>
            <small>
              Fresh from the Farm, Straight to Your Home
            </small>
          </span>
        </a>

        <a className="basket-link" href="/">
          Back to Shop
        </a>
      </header>

      <main>
        <section className="seller-section">
          <p className="eyebrow">GROW WITH US</p>
          <h1>Are you a seller?</h1>
          <p>
            Submit your products to MUSAVI'S GROCERY.
            Your products can appear in our shop immediately.
            We will contact you when a customer orders.
          </p>

          <form
            className="checkout-form seller-form"
            onSubmit={submitProduct}
          >
            <h3>Your contact details</h3>

            <label htmlFor="seller-name">
              Your full name or business name
            </label>
            <input
              id="seller-name"
              name="sellerName"
              type="text"
              maxLength="100"
              required
              placeholder="Enter your name"
            />

            <label htmlFor="seller-phone">
              Your phone number
            </label>
            <input
              id="seller-phone"
              name="sellerPhone"
              type="tel"
              required
              pattern="(07|01)[0-9]{8}|254[17][0-9]{8}"
              title="Enter a valid Kenyan mobile number"
              placeholder="e.g. 0712345678"
            />

            <label htmlFor="seller-location">Your location</label>
            <input
              id="seller-location"
              name="sellerLocation"
              type="text"
              maxLength="200"
              required
              placeholder="e.g. Kisii town"
            />

            <h3>Product details</h3>

            <label htmlFor="seller-product-name">
              Product name
            </label>
            <input
              id="seller-product-name"
              name="productName"
              type="text"
              maxLength="100"
              required
              placeholder="e.g. School shoes"
            />

            <label htmlFor="seller-category">Category</label>
            <select
              id="seller-category"
              name="category"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select a category
              </option>
              <option value="Fresh Produce">Fresh Produce</option>
              <option value="Groceries">Groceries</option>
              <option value="Clothing">Clothing</option>
              <option value="Shoes">Shoes</option>
              <option value="Home Items">Home Items</option>
              <option value="Electronics">Electronics</option>
              <option value="Beauty and Personal Care">
                Beauty and Personal Care
              </option>
              <option value="Other">Other</option>
            </select>

            <label htmlFor="seller-price">
              Price (KSh per unit)
            </label>
            <input
              id="seller-price"
              name="pricePerUnit"
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              required
              placeholder="e.g. 250"
            />

            <label htmlFor="seller-unit">Unit sold</label>
            <select
              id="seller-unit"
              name="unit"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select a unit
              </option>
              <option value="kg">Kilogram (kg)</option>
              <option value="piece">Piece</option>
              <option value="pair">Pair</option>
              <option value="pack">Pack</option>
              <option value="set">Set</option>
              <option value="litre">Litre</option>
              <option value="bag">Bag</option>
              <option value="other">Other</option>
            </select>

            <label htmlFor="seller-description">
              Product description
            </label>
            <textarea
              id="seller-description"
              name="description"
              maxLength="500"
              rows="3"
              placeholder="Describe your product (optional)"
            />

            
            <h3>📸 Product pictures</h3>
            <p>
              Add up to 5 picture links of your product. Clear pictures
              help customers see exactly what you are selling.
            </p>

            <label htmlFor="seller-image-1">Picture 1 (main picture)</label>
            <input
              id="seller-image-1"
              name="imageUrls"
              type="url"
              placeholder="Paste your first picture link"
            />

            <label htmlFor="seller-image-2">Picture 2 (optional)</label>
            <input
              id="seller-image-2"
              name="imageUrls"
              type="url"
              placeholder="Paste your second picture link"
            />

            <label htmlFor="seller-image-3">Picture 3 (optional)</label>
            <input
              id="seller-image-3"
              name="imageUrls"
              type="url"
              placeholder="Paste your third picture link"
            />

            <label htmlFor="seller-image-4">Picture 4 (optional)</label>
            <input
              id="seller-image-4"
              name="imageUrls"
              type="url"
              placeholder="Paste your fourth picture link"
            />

            <label htmlFor="seller-image-5">Picture 5 (optional)</label>
            <input
              id="seller-image-5"
              name="imageUrls"
              type="url"
              placeholder="Paste your fifth picture link"
            />

            <p>
              💡 Having trouble adding picture links? Call us for help:
              {" "}
              <a href="tel:+254110396227">0110396227</a>.
            </p>

            <button
              className="primary-button checkout-button"
              type="submit"
              disabled={sellerSubmitting}
            >
              {sellerSubmitting
                ? "Submitting..."
                : "Submit Product"}
            </button>

            {sellerMessage && (
              <p className="basket-message" role="status">
                {sellerMessage}
              </p>
            )}
          </form>
        </section>
      </main>

      <footer>
        <strong>MUSAVI'S GROCERY</strong>
        <p>Fresh from the Farm, Straight to Your Home.</p>
        <small>
          Ser      description: formData.get("description") || "",
      imageUrl: formData.get("imageUrl") || "",
      available: true,ving customers around Kisii University, Kisii, Kenya.
        </small>
      </footer>
    </div>
  );
}
