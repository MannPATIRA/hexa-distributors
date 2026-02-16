# Hexa Procurement — Outlook Add-in

An Outlook add-in that automates procurement workflows for distributors. Demo build with simulated supplier replies via Microsoft Graph API.

## Prerequisites

- **Node.js v18+**
- **Two Microsoft accounts**: one buyer (runs in Outlook), one supplier-sim (sends simulated replies)
- **Azure App Registration** with:
  - Redirect URIs: `https://localhost:3000/auth/callback` and `https://localhost:3000/auth/supplier-callback` (type: **Web**, not SPA)
  - Delegated permissions: `Mail.Send`, `Mail.Read`, `Mail.ReadWrite`, `User.Read`
  - Supported account types: "Accounts in any org directory and personal Microsoft accounts"

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate HTTPS certs (trusted for Outlook)
npx office-addin-dev-certs install

# 3. Configure environment
cp .env.example .env
# Edit .env with your AZURE_CLIENT_ID, BUYER_EMAIL, SUPPLIER_SIM_EMAIL

# 4. Start the server
npm start
```

On first start, navigate to:
- `https://localhost:3000/auth/login/buyer` — sign in with your buyer account
- `https://localhost:3000/auth/login/supplier` — sign in with your supplier-sim account

## Sideload the Add-in

1. Open https://aka.ms/olksideload
2. Go to "My add-ins" → "Custom Addins"
3. Click "Add from File" → select `manifest.xml`
4. Open Outlook, click any email, and find "Hexa Procurement" in the toolbar

## Demo Flow

1. Dashboard shows 12 items needing reorder
2. Click an item → see supplier history
3. Click "Get New Quotes" → build an RFQ → send to 4 suppliers
4. Wait 30-90 seconds for simulated supplier replies to arrive
5. Open a reply email → add-in auto-detects it → capture the quote
6. Compare quotes side-by-side → award to the best supplier
7. PO is sent, unsuccessful suppliers notified, order tracked

## Architecture

Single Express.js server on `https://localhost:3000`:
- Serves React taskpane UI via webpack-dev-middleware
- Handles all `/api/*` routes
- Manages OAuth for two accounts via MSAL Node + PKCE
- Sends/receives emails via Microsoft Graph API
- All state in-memory (resets on restart)
