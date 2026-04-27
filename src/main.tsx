import React from "react";
console.log("APP STARTING...");
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./lib/i18n";
import { disableRightClick } from "./utils/security";

// Disable right-click globally
disableRightClick();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
