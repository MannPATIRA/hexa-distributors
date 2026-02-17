import https from "https";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const devCerts = await import("office-addin-dev-certs");
  const httpsOptions = await devCerts.getHttpsServerOptions();

  // Import the Express app (routes already attached)
  const { default: app } = await import("./app");

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
    app.use(require("express").static(path.join(__dirname, "../../dist")));
  }

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
