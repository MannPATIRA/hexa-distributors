import express, { Request, Response, NextFunction } from "express";
import https from "https";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

async function startServer() {
  const devCerts = await import("office-addin-dev-certs");
  const httpsOptions = await devCerts.getHttpsServerOptions();

  // Webpack dev middleware for hot-reloading the React UI
  if (process.env.NODE_ENV !== "production") {
    const webpack = (await import("webpack")).default;
    const webpackDevMiddleware = (await import("webpack-dev-middleware")).default;
    const webpackHotMiddleware = (await import("webpack-hot-middleware")).default;
    const webpackConfig = require("../../webpack.config");

    const compiler = webpack(webpackConfig);
    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
      })
    );
    app.use(webpackHotMiddleware(compiler));
  } else {
    app.use(express.static(path.join(__dirname, "../../dist")));
  }

  // --- API routes ---
  const authRoutes = (await import("./routes/auth")).default;
  const reorderRoutes = (await import("./routes/reorders")).default;
  const productRoutes = (await import("./routes/products")).default;
  const supplierRoutes = (await import("./routes/suppliers")).default;
  const rfqRoutes = (await import("./routes/rfq")).default;
  const quoteRoutes = (await import("./routes/quotes")).default;
  const orderRoutes = (await import("./routes/orders")).default;
  const simulationRoutes = (await import("./routes/simulation")).default;

  app.use("/auth", authRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/reorders", reorderRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/rfq", rfqRoutes);
  app.use("/api/quotes", quoteRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/simulation", simulationRoutes);

  // Static assets (icons)
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

  const PORT = parseInt(process.env.PORT || "3000");

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`\n  Hexa Procurement Server`);
    console.log(`  ───────────────────────`);
    console.log(`  UI:   https://localhost:${PORT}/taskpane.html`);
    console.log(`  Auth: https://localhost:${PORT}/auth/login/buyer`);
    console.log(`  Sim:  https://localhost:${PORT}/auth/login/supplier`);
    console.log(`  API:  https://localhost:${PORT}/api/auth/status\n`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
