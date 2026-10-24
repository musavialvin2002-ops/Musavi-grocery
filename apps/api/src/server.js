
import express from "express";
import cors from "cors";
import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";

import {
  initializeDatabase,
  saveOrder,
  getOrders,
  getOrder,
  updateOrder,
  getSetting,
  saveSetting,
} from "./database.js";
const app = express();
const PORT = Number(process.env.PORT) || 4000;

async function sendOrderEmail(order) {
  if (!process.env.RESEND_API_KEY) {
    console.error("Order email skipped: RESEND_API_KEY is not configured.");
    return;
  }

  const itemsText = order.items
    .map((item) => `${item.productName}: KSh ${item.budget}`)
    .join("\n");

  const emailText = [
    "A new MUSAVI'S GROCERY order has been received.",
    "",
    `Order reference: ${order.reference}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Delivery location: ${order.deliveryLocation}`,
    `Delivery instructions: ${order.deliveryInstructions || "None"}`,
    "",
    "Items:",
    itemsText,
    "",
    `Total: KSh ${order.total}`,
    `Payment: ${order.paymentMethod}`,
    `Status: ${order.status}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: ["musavialvin2002@gmail.com"],
        subject: `New grocery order ${order.reference}`,
        text: emailText,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Order email failed:", result);
      return;
    }

    console.log("Order email accepted by Resend:", result.id);
  } catch (error) {
    console.error("Order email failed:", error.message);
  }
}



app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://127.0.0.1:5176",
      "http://127.0.0.1:5177",
      process.env.WEB_ORIGIN,
    ].filter(Boolean),
    allowedHeaders: ["Content-Type", "x-owner-password"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  })
);


function requireOwner(req, res, next) {
  const expectedPassword = process.env.OWNER_PASSWORD;
  const suppliedPassword = req.get("x-owner-password") || "";

  if (!expectedPassword) {
    return res.status(500).json({
      error: "Owner password is not configured.",
    });
  }

  const expected = Buffer.from(expectedPassword);
  const supplied = Buffer.from(suppliedPassword);

  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({
      error: "Owner authentication required.",
    });
  }

  next();
}

app.use(express.json({ limit: "100kb" }));

const products = [
  {
    id: "tomatoes",
    name: "Fresh Tomatoes",
    category: "Fresh Produce",
    pricePerKg: 120,
    unit: "kg",
    available: true,
    image: "",
    description: "Fresh tomatoes for everyday cooking.",
  },
  {
    id: "onions",
    name: "Onions",
    category: "Fresh Produce",
    pricePerKg: 150,
    unit: "kg",
    available: true,
    image: "",
    description: "Everyday cooking onions.",
  },
  {
    id: "garlic",
    name: "Garlic",
    category: "Fresh Produce",
    pricePerKg: 400,
    unit: "kg",
    available: true,
    image: "",
    description: "Garlic for flavourful meals.",
  },
  {
    id: "royco-cubes",
    name: "Royco Cubes",
    category: "Seasonings",
    pricePerKg: null,
    unit: "pack",
    available: true,
    image: "",
    description: "Seasoning cubes for your meals.",
  },
];

// Temporary storage for local testing.
// Orders will be lost if the server restarts.
// Orders are now stored in the SQLite database.
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "MUSAVI'S GROCERY API",
    message: "Fresh from the Farm, Straight to Your Home",
  });
});


app.get("/api/products", async (_req, res) => {
  try {
    const savedProducts = await getSetting("products", products);

    res.json({
      products: savedProducts,
      currency: "KES",
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    res.status(500).json({
      error: "Could not load products.",
    });
  }
});

app.patch("/api/products", requireOwner, async (req, res) => {
  try {
    const { products: updatedProducts } = req.body ?? {};

    if (
      !Array.isArray(updatedProducts) ||
      updatedProducts.length < 1 ||
      updatedProducts.length > 100
    ) {
      return res.status(400).json({
        error: "Provide between 1 and 100 products.",
      });
    }

    const ids = new Set();

    for (const product of updatedProducts) {
      if (
        !product ||
        typeof product.id !== "string" ||
        !/^[a-z0-9-]{1,80}$/.test(product.id) ||
        ids.has(product.id) ||
        typeof product.name !== "string" ||
        !product.name.trim() ||
        typeof product.category !== "string" ||
        typeof product.unit !== "string" ||
        typeof product.available !== "boolean" ||
        typeof product.description !== "string"
      ) {
        return res.status(400).json({
          error: "One or more products have invalid details.",
        });
      }

      ids.add(product.id);

      if (
        product.pricePerKg !== null &&
        (!Number.isFinite(product.pricePerKg) || product.pricePerKg < 0)
      ) {
        return res.status(400).json({
          error: "Product prices must be zero or greater.",
        });
      }

      const imageUrl = product.imageUrl ?? product.image ?? "";

      if (typeof imageUrl !== "string") {
        return res.status(400).json({
          error: "Product photo must be a URL.",
        });
      }

      if (imageUrl) {
        try {
          const url = new URL(imageUrl);
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Unsupported URL protocol.");
          }
        } catch {
          return res.status(400).json({
            error: "Enter a valid HTTP or HTTPS photo URL.",
          });
        }
      }
    }

    const normalizedProducts = updatedProducts.map((product) => {
      const imageUrl = product.imageUrl ?? product.image ?? "";

      return {
        id: product.id,
        name: product.name.trim(),
        category: product.category.trim(),
        pricePerKg: product.pricePerKg,
        unit: product.unit.trim(),
        available: product.available,
        image: imageUrl,
        imageUrl,
        description: product.description.trim(),
      };
    });

    await saveSetting("products", normalizedProducts);

    res.json({
      message: "Products saved successfully.",
      products: normalizedProducts,
    });
  } catch (error) {
    console.error("Failed to save products:", error);
    res.status(500).json({
      error: "Could not save products.",
    });
  }
});

app.get("/api/shop-settings", async (_req, res) => {
  try {
    const settings = await getSetting("shop", {
      closed: false,
      closureMessage: "We'll be back soon as we restock.",
      supportPhone: "0110396227",
    });

    res.json({ settings });
  } catch (error) {
    console.error("Failed to load shop settings:", error);
    res.status(500).json({ message: "Could not load shop settings." });
  }
});

app.patch("/api/shop-settings", requireOwner, async (req, res) => {
  try {
    const { closed, closureMessage, supportPhone } = req.body;

    if (
      typeof closed !== "boolean" ||
      typeof closureMessage !== "string" ||
      typeof supportPhone !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid shop settings.",
      });
    }

    const settings = {
      closed,
      closureMessage: closureMessage.slice(0, 300),
      supportPhone: supportPhone.slice(0, 30),
    };

    await saveSetting("shop", settings);

    res.json({ message: "Shop settings saved.", settings });
  } catch (error) {
    console.error("Failed to save shop settings:", error);
    res.status(500).json({ message: "Could not save shop settings." });
  }
});


app.post("/api/orders", async (req, res) => {
  const {
    customerName,
    customerPhone,
    deliveryLocation,
    deliveryInstructions = "",
    items,
  } = req.body ?? {};
  
  try {
    const shopSettings = await getSetting("shop", {
      closed: false,
      closureMessage: "We'll be back soon as we restock.",
      supportPhone: "0110396227",
    });

    if (shopSettings.closed) {
      return res.status(503).json({
        error: shopSettings.closureMessage,
      });
    }
  } catch (error) {
    console.error("Failed to check shop settings:", error);
    return res.status(500).json({
      error: "We couldn't check shop availability. Please try again.",
    });
  }


  if (
    typeof customerName !== "string" ||
    customerName.trim().length < 2 ||
    customerName.trim().length > 100
  ) {
    return res.status(400).json({ error: "Enter your full name." });
  }

  if (
    typeof customerPhone !== "string" ||
    !/^(?:(?:07|01)\d{8}|254[17]\d{8})$/.test(customerPhone.trim())
  ) {
    return res.status(400).json({
      error: "Enter a valid Kenyan mobile number.",
    });
  }

  if (
    typeof deliveryLocation !== "string" ||
    deliveryLocation.trim().length < 5 ||
    deliveryLocation.trim().length > 300
  ) {
    return res.status(400).json({
      error: "Enter your delivery location.",
    });
  }

  if (
    typeof deliveryInstructions !== "string" ||
    deliveryInstructions.length > 500
  ) {
    return res.status(400).json({
      error: "Delivery instructions are too long.",
    });
  }

  if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
    return res.status(400).json({
      error: "Your basket must contain at least one item.",
    });
  }

const orderItems = [];
const savedProducts = await getSetting("products", products);
  for (const item of items) {
    const product = savedProducts.find(
  (availableProduct) => availableProduct.id === item.productId
);
    const budget = Number(item.budget);

    if (!product || !product.available) {
      return res.status(400).json({
        error: "A selected product is unavailable.",
      });
    }

    if (!Number.isSafeInteger(budget) || budget < 10 || budget > 100000) {
      return res.status(400).json({
        error: "Each product budget must be between KSh 10 and KSh 100,000.",
      });
    }

    orderItems.push({
      productId: product.id,
      productName: product.name,
      budget,
    });
  }

  const total = orderItems.reduce((sum, item) => sum + item.budget, 0);

  const order = {
    id: randomUUID(),
    reference: `MSG-${Date.now().toString().slice(-8)}`,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    deliveryLocation: deliveryLocation.trim(),
    deliveryInstructions: deliveryInstructions.trim(),
    items: orderItems,
    total,
    paymentMethod: "Cash on delivery",
    status: "Received",
    createdAt: new Date().toISOString(),
  };

await saveOrder(order);
console.log("New MUSAVI'S GROCERY order received:", order.reference);

void sendOrderEmail(order);

  return res.status(201).json({
    message: "Your order has been received.",
    order: {
      reference: order.reference,
      total: order.total,
      status: order.status,
    },
  });
});

// Temporary local testing endpoint.
// Do not expose customer order details through a public endpoint.

app.get("/api/orders", requireOwner, async (_req, res) => {
  try {
    res.json({
      orders: (await getOrders()).map((order) => ({
        reference: order.reference,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to load orders:", error);
    res.status(500).json({ error: "Failed to load orders." });
  }
});

app.patch("/api/orders/:reference/status", requireOwner, async (req, res) => {
  const { status } = req.body ?? {};

  const allowedStatuses = [
    "Received",
    "Confirmed",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Invalid order status.",
    });
  }

const { reference } = req.params;
console.log("Status update requested for:", reference);
const order = await getOrder(reference);
console.log("Order found:", Boolean(order));
  if (!order) {
    return res.status(404).json({
      error: "Order not found.",
    });
  }

await updateOrder(reference, status);
order.status = status;
  console.log(`Order ${reference} status updated to ${status}`);

  return res.json({
    message: "Order status updated.",
    order: {
      reference: order.reference,
      status: order.status,
    },
  });
});


initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`MUSAVI'S GROCERY API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize the Supabase database:", error);
    process.exit(1);
  });