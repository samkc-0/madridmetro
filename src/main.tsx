import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app";
import "@/index.css";

const rootElement = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* este div envuelve la canvas y la centra a full */}
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: 0,
        padding: 0,
      }}
    >
      <App />
    </div>
  </React.StrictMode>,
);
