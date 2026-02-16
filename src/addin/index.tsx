import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./utils/toast";
import "./styles/global.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

const renderApp = () => {
  const root = createRoot(rootEl);
  root.render(
    <ToastProvider>
      <App />
    </ToastProvider>
  );
};

// Initialize Office.js, then render
if (typeof Office !== "undefined") {
  Office.onReady(() => {
    renderApp();
  });
} else {
  renderApp();
}

if ((module as any).hot) {
  (module as any).hot.accept();
}
