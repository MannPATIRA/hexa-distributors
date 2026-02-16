import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import ItemDetail from "./components/ItemDetail";
import QuickReorder from "./components/QuickReorder";
import RFQBuilder from "./components/RFQBuilder";
import RFQTracker from "./components/RFQTracker";
import QuoteCapture from "./components/QuoteCapture";
import QuoteComparison from "./components/QuoteComparison";
import AwardOrder from "./components/AwardOrder";
import OrderTracker from "./components/OrderTracker";
import Settings from "./components/Settings";

export type Screen =
  | { name: "dashboard" }
  | { name: "item-detail"; sku: string }
  | { name: "quick-reorder"; sku: string; supplierId?: string }
  | { name: "rfq-builder"; skus?: string[] }
  | { name: "rfq-tracker"; rfqId?: string }
  | { name: "quote-capture"; rfqId: string; emailBody?: string; senderEmail?: string }
  | { name: "quote-comparison"; rfqId: string }
  | { name: "award-order"; rfqId: string; supplierId: string }
  | { name: "order-tracker" }
  | { name: "settings" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });
  const [history, setHistory] = useState<Screen[]>([]);

  const navigate = useCallback(
    (next: Screen) => {
      setHistory((prev) => [...prev, screen]);
      setScreen(next);
    },
    [screen]
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setScreen(last);
      return newHistory;
    });
  }, []);

  // Office.js: detect when user reads a supplier reply email
  useEffect(() => {
    if (typeof Office === "undefined") return;
    try {
      Office.context.mailbox?.addHandlerAsync(
        Office.EventType.ItemChanged,
        () => detectQuoteEmail(navigate)
      );
      // Also check the current item on load
      detectQuoteEmail(navigate);
    } catch {
      // Office.js may not be available in all contexts
    }
  }, [navigate]);

  const canGoBack = history.length > 0;

  const screenName = screen.name;

  return (
    <div className="hexa-app">
      {screenName === "dashboard" && <Dashboard navigate={navigate} />}
      {screenName === "item-detail" && (
        <ItemDetail
          sku={(screen as any).sku}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "quick-reorder" && (
        <QuickReorder
          sku={(screen as any).sku}
          supplierId={(screen as any).supplierId}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "rfq-builder" && (
        <RFQBuilder
          initialSkus={(screen as any).skus}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "rfq-tracker" && (
        <RFQTracker
          rfqId={(screen as any).rfqId}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "quote-capture" && (
        <QuoteCapture
          rfqId={(screen as any).rfqId}
          emailBody={(screen as any).emailBody}
          senderEmail={(screen as any).senderEmail}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "quote-comparison" && (
        <QuoteComparison
          rfqId={(screen as any).rfqId}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "award-order" && (
        <AwardOrder
          rfqId={(screen as any).rfqId}
          supplierId={(screen as any).supplierId}
          navigate={navigate}
          goBack={goBack}
        />
      )}
      {screenName === "order-tracker" && (
        <OrderTracker navigate={navigate} goBack={goBack} />
      )}
      {screenName === "settings" && (
        <Settings navigate={navigate} goBack={goBack} />
      )}
    </div>
  );
}

function detectQuoteEmail(navigate: (s: Screen) => void) {
  try {
    const item = Office.context.mailbox?.item as Office.MessageRead | undefined;
    if (!item) return;

    // In read mode, subject is a string property
    const subject: string = (item.subject as unknown as string) || "";
    const rfqMatch = subject.match(/RE:\s*(RFQ-\d+)/i);
    if (!rfqMatch) return;

    item.body.getAsync(Office.CoercionType.Html, (bodyResult) => {
      if (bodyResult.status !== Office.AsyncResultStatus.Succeeded) return;
      const emailBody: string = bodyResult.value || "";

      const from = item.from;
      const senderEmail = from?.emailAddress || "";
      navigate({
        name: "quote-capture",
        rfqId: rfqMatch[1],
        emailBody,
        senderEmail,
      });
    });
  } catch {
    // Office.js not available
  }
}
