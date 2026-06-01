import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { redirectToCanonicalHost } from "./lib/redirectToCanonicalHost";

// Redireciona páginas públicas (/careers, /c, /vagas) servidas a partir
// dos hosts do Lovable para gentia.tech antes de montar a árvore React.
redirectToCanonicalHost();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

