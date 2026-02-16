import { Router } from "express";
import {
  getBuyerAuthUrl,
  getSupplierAuthUrl,
  acquireBuyerToken,
  acquireSupplierToken,
  getAuthStatus,
} from "../services/graph";

const router = Router();

// Initiate buyer OAuth flow
router.get("/login/buyer", async (_req, res) => {
  try {
    const url = await getBuyerAuthUrl();
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initiate supplier sim OAuth flow
router.get("/login/supplier", async (_req, res) => {
  try {
    const url = await getSupplierAuthUrl();
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Buyer OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("No authorization code received.");
    }
    await acquireBuyerToken(code);
    res.send(`
      <html><body style="font-family: Segoe UI, sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: #1B4D7A;">Buyer Account Connected</h2>
        <p style="color: #666;">You can close this window and return to Outlook.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body></html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html><body style="font-family: Segoe UI, sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: #D32F2F;">Authentication Failed</h2>
        <p>${err.message}</p>
      </body></html>
    `);
  }
});

// Supplier sim OAuth callback
router.get("/supplier-callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("No authorization code received.");
    }
    await acquireSupplierToken(code);
    res.send(`
      <html><body style="font-family: Segoe UI, sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: #2E8B57;">Supplier Sim Account Connected</h2>
        <p style="color: #666;">You can close this window and return to Outlook.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body></html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html><body style="font-family: Segoe UI, sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: #D32F2F;">Authentication Failed</h2>
        <p>${err.message}</p>
      </body></html>
    `);
  }
});

// Auth status check
router.get("/status", (_req, res) => {
  res.json(getAuthStatus());
});

export default router;
