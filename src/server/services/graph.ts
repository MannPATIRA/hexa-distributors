import {
  PublicClientApplication,
  CryptoProvider,
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
  Configuration,
  AccountInfo,
} from "@azure/msal-node";
import fs from "fs";
import path from "path";

const IS_VERCEL = process.env.VERCEL === "1";
const CACHE_DIR = IS_VERCEL ? "/tmp" : path.join(__dirname, "../../..");

const TOKENS_PATH = path.join(CACHE_DIR, "tokens.json");
const MSAL_CACHE_BUYER_PATH = path.join(CACHE_DIR, ".msal-cache-buyer.json");
const MSAL_CACHE_SUPPLIER_PATH = path.join(CACHE_DIR, ".msal-cache-supplier.json");

const SCOPES = ["Mail.Send", "Mail.Read", "Mail.ReadWrite", "User.Read"];

const PORT = process.env.PORT || "3000";
const BASE_URL = process.env.BASE_URL || `https://localhost:${PORT}`;
const REDIRECT_URI_BUYER = `${BASE_URL}/auth/callback`;
const REDIRECT_URI_SUPPLIER = `${BASE_URL}/auth/supplier-callback`;

interface TokenCache {
  buyer?: { account?: any };
  supplier?: { account?: any };
}

let tokenCache: TokenCache = {};
let msalBuyer: PublicClientApplication | null = null;
let msalSupplier: PublicClientApplication | null = null;

const cryptoProvider = new CryptoProvider();
let buyerPkce: { verifier: string; challenge: string } | null = null;
let supplierPkce: { verifier: string; challenge: string } | null = null;

function getMsalConfig(): Configuration {
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!clientId) {
    throw new Error("AZURE_CLIENT_ID is not set in .env");
  }
  const authority = process.env.MSAL_AUTHORITY || "https://login.microsoftonline.com/consumers";
  return {
    auth: {
      clientId,
      authority,
    },
  };
}

function ensureMsalInstances() {
  if (!msalBuyer) {
    const config = getMsalConfig();
    msalBuyer = new PublicClientApplication(config);
    // Restore MSAL's internal cache (contains refresh tokens)
    try {
      if (fs.existsSync(MSAL_CACHE_BUYER_PATH)) {
        const cacheData = fs.readFileSync(MSAL_CACHE_BUYER_PATH, "utf-8");
        msalBuyer.getTokenCache().deserialize(cacheData);
      }
    } catch {
      // Fresh cache
    }
  }
  if (!msalSupplier) {
    const config = getMsalConfig();
    msalSupplier = new PublicClientApplication(config);
    try {
      if (fs.existsSync(MSAL_CACHE_SUPPLIER_PATH)) {
        const cacheData = fs.readFileSync(MSAL_CACHE_SUPPLIER_PATH, "utf-8");
        msalSupplier.getTokenCache().deserialize(cacheData);
      }
    } catch {
      // Fresh cache
    }
  }
}

function saveMsalCache() {
  try {
    if (msalBuyer) {
      fs.writeFileSync(MSAL_CACHE_BUYER_PATH, msalBuyer.getTokenCache().serialize());
    }
    if (msalSupplier) {
      fs.writeFileSync(MSAL_CACHE_SUPPLIER_PATH, msalSupplier.getTokenCache().serialize());
    }
  } catch (err) {
    console.error("Failed to save MSAL cache:", err);
  }
}

function loadTokenCache() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const data = fs.readFileSync(TOKENS_PATH, "utf-8");
      tokenCache = JSON.parse(data);
    }
  } catch {
    tokenCache = {};
  }
}

function saveTokenCache() {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenCache, null, 2));
  } catch (err) {
    console.error("Failed to save token cache:", err);
  }
}

loadTokenCache();

// --- Auth Status ---
export function getAuthStatus() {
  ensureMsalInstances();
  return {
    buyer: !!(tokenCache.buyer?.account),
    supplier: !!(tokenCache.supplier?.account),
  };
}

// --- Auth URL Generation ---
export async function getBuyerAuthUrl(): Promise<string> {
  ensureMsalInstances();
  const pkceCodes = await cryptoProvider.generatePkceCodes();
  buyerPkce = { verifier: pkceCodes.verifier, challenge: pkceCodes.challenge };

  const authCodeUrlParams: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: REDIRECT_URI_BUYER,
    codeChallenge: pkceCodes.challenge,
    codeChallengeMethod: "S256",
    prompt: "select_account",
  };

  return msalBuyer!.getAuthCodeUrl(authCodeUrlParams);
}

export async function getSupplierAuthUrl(): Promise<string> {
  ensureMsalInstances();
  const pkceCodes = await cryptoProvider.generatePkceCodes();
  supplierPkce = { verifier: pkceCodes.verifier, challenge: pkceCodes.challenge };

  const authCodeUrlParams: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: REDIRECT_URI_SUPPLIER,
    codeChallenge: pkceCodes.challenge,
    codeChallengeMethod: "S256",
    prompt: "select_account",
  };

  return msalSupplier!.getAuthCodeUrl(authCodeUrlParams);
}

// --- Token Acquisition ---
export async function acquireBuyerToken(code: string): Promise<void> {
  ensureMsalInstances();
  if (!buyerPkce) throw new Error("No PKCE state for buyer. Start login flow first.");

  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI_BUYER,
    codeVerifier: buyerPkce.verifier,
  };

  const response = await msalBuyer!.acquireTokenByCode(tokenRequest);
  tokenCache.buyer = {
    account: response.account,
  };
  saveTokenCache();
  saveMsalCache();
  buyerPkce = null;
}

export async function acquireSupplierToken(code: string): Promise<void> {
  ensureMsalInstances();
  if (!supplierPkce) throw new Error("No PKCE state for supplier. Start login flow first.");

  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI_SUPPLIER,
    codeVerifier: supplierPkce.verifier,
  };

  const response = await msalSupplier!.acquireTokenByCode(tokenRequest);
  tokenCache.supplier = {
    account: response.account,
  };
  saveTokenCache();
  saveMsalCache();
  supplierPkce = null;
}

// --- Token Access ---
export async function getBuyerAccessToken(): Promise<string | null> {
  ensureMsalInstances();
  if (!tokenCache.buyer?.account) return null;

  try {
    const response = await msalBuyer!.acquireTokenSilent({
      scopes: SCOPES,
      account: tokenCache.buyer.account as AccountInfo,
    });
    saveMsalCache();
    return response.accessToken;
  } catch {
    console.warn("[Graph] Buyer token refresh failed — re-authentication required");
    return null;
  }
}

export async function getSupplierAccessToken(): Promise<string | null> {
  ensureMsalInstances();
  if (!tokenCache.supplier?.account) return null;

  try {
    const response = await msalSupplier!.acquireTokenSilent({
      scopes: SCOPES,
      account: tokenCache.supplier.account as AccountInfo,
    });
    saveMsalCache();
    return response.accessToken;
  } catch {
    console.warn("[Graph] Supplier token refresh failed — re-authentication required");
    return null;
  }
}

// --- Email Sending ---
async function sendEmailViaGraph(
  accessToken: string,
  message: {
    subject: string;
    body: string;
    toRecipients: { name: string; email: string }[];
    fromName?: string;
  }
): Promise<void> {
  const graphPayload: any = {
    message: {
      subject: message.subject,
      body: { contentType: "HTML", content: message.body },
      toRecipients: message.toRecipients.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    },
    saveToSentItems: true,
  };

  if (message.fromName) {
    graphPayload.message.from = {
      emailAddress: {
        name: message.fromName,
        address: process.env.SUPPLIER_SIM_EMAIL || "",
      },
    };
  }

  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph API sendMail error (${response.status}): ${text}`);
  }
}

export async function sendEmailAsBuyer(message: {
  subject: string;
  body: string;
  toRecipients: { name: string; email: string }[];
}): Promise<void> {
  const token = await getBuyerAccessToken();
  if (!token) throw new Error("Buyer not authenticated. Visit https://localhost:3000/auth/login/buyer");
  await sendEmailViaGraph(token, message);
}

export async function sendEmailAsSupplier(message: {
  subject: string;
  body: string;
  toRecipients: { name: string; email: string }[];
  fromName?: string;
}): Promise<void> {
  const token = await getSupplierAccessToken();
  if (!token) throw new Error("Supplier sim not authenticated. Visit https://localhost:3000/auth/login/supplier");
  await sendEmailViaGraph(token, {
    subject: message.subject,
    body: message.body,
    toRecipients: message.toRecipients,
    fromName: message.fromName,
  });
}
