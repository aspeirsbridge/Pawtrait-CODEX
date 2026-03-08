import { createRoot } from "react-dom/client";
import "./index.css";
import { getClientEnv } from "@/lib/env";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root container #root was not found.");
}

const root = createRoot(rootEl);

function renderStartupError(message: string) {
  root.render(
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
        color: "#0f172a",
        padding: "24px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          padding: "20px",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "1.25rem" }}>
          App configuration error
        </h1>
        <p style={{ margin: "0 0 8px", color: "#334155" }}>
          The app could not start because required environment values are invalid.
        </p>
        <pre
          style={{
            margin: 0,
            padding: "12px",
            borderRadius: "8px",
            background: "#f1f5f9",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </pre>
      </section>
    </main>
  );
}

async function bootstrap() {
  try {
    getClientEnv();
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    renderStartupError(message);
  }
}

void bootstrap();
