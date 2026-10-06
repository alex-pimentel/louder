import "./style.css";
import * as React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { Shell } from "./shell/shell";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Elemento #app não encontrado.");
}

createRoot(root).render(
  <React.StrictMode>
    <Shell>
      <App />
    </Shell>
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
