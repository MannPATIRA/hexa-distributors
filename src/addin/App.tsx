import React, { useState, useEffect, useCallback, useRef } from "react";
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
import QuoteDetail from "./components/QuoteDetail";

export type Screen =
  | { name: "dashboard" }
  | { name: "item-detail"; sku: string }
  | { name: "quick-reorder"; sku: string; supplierId?: string }
  | { name: "rfq-builder"; skus?: string[] }
  | { name: "rfq-tracker"; rfqId?: string }
  | { name: "quote-capture"; rfqId: string; emailBody?: string; senderEmail?: string }
  | { name: "quote-detail"; rfqId: string; supplierId?: string }
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

  // Track which email subject was last detected to avoid re-triggering
  const lastDetectedSubject = useRef<string>("");
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Office.js: detect when user reads a supplier reply email
  useEffect(() => {
    if (typeof Office === "undefined") return;

    const checkCurrentEmail = () => {
      try {
        const item = Office.context.mailbox?.item as Office.MessageRead | undefined;
        if (!item) return;

        const subject: string = (item.subject as unknown as string) || "";

        // Only trigger if this is a different email than last time
        if (subject === lastDetectedSubject.current) return;

        const rfqMatch = subject.match(/RE:\s*(RFQ-\d+)/i);
        if (rfqMatch) {
          lastDetectedSubject.current = subject;
          navigateRef.current({
            name: "quote-detail",
            rfqId: rfqMatch[1],
          });
        }
      } catch {
        // Office.js not available
      }
    };

    try {
      Office.context.mailbox?.addHandlerAsync(
        Office.EventType.ItemChanged,
        () => {
          // Reset tracking so the new email gets detected
          lastDetectedSubject.current = "";
          checkCurrentEmail();
        }
      );
      // Check current item on initial load only
      checkCurrentEmail();
    } catch {
      // Office.js may not be available
    }
  }, []); // Empty deps — only runs once on mount

  const canGoBack = history.length > 0;

  const screenName = screen.name;

  const themeMap: Record<string, string> = {
    dashboard: "theme-blue",
    "item-detail": "theme-blue",
    "quick-reorder": "theme-emerald",
    "rfq-builder": "theme-indigo",
    "rfq-tracker": "theme-violet",
    "quote-capture": "theme-teal",
    "quote-detail": "theme-cyan",
    "quote-comparison": "theme-amber",
    "award-order": "theme-emerald",
    "order-tracker": "theme-blue",
    settings: "theme-slate",
  };

  return (
    <div className={`hexa-app ${themeMap[screenName] || "theme-blue"}`}>
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
      {screenName === "quote-detail" && (
        <QuoteDetail
          rfqId={(screen as any).rfqId}
          supplierId={(screen as any).supplierId}
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

