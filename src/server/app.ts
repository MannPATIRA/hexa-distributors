import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// --- API routes (imported eagerly so they work in serverless) ---
import authRoutes from "./routes/auth";
import reorderRoutes from "./routes/reorders";
import productRoutes from "./routes/products";
import supplierRoutes from "./routes/suppliers";
import rfqRoutes from "./routes/rfq";
import quoteRoutes from "./routes/quotes";
import orderRoutes from "./routes/orders";
import simulationRoutes from "./routes/simulation";

app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reorders", reorderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/rfq", rfqRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/simulation", simulationRoutes);

// Static assets (icons) — serves from /assets in both local and Vercel
app.use("/assets", express.static(path.join(__dirname, "../../assets")));

// 404 handler for API routes
app.use("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err.message, err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
