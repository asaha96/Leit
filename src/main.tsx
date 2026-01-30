import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Show a clear error instead of throwing so the screen isn't blank on Vercel/Lovable when env is missing
if (!clerkPubKey) {
  createRoot(document.getElementById("root")!).render(
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      background: "#fafafa",
      color: "#333",
    }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>Missing configuration</h1>
      <p style={{ marginBottom: 16, maxWidth: 400 }}>
        Set <code style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}>VITE_CLERK_PUBLISHABLE_KEY</code> in your deployment environment (Vercel / Lovable project settings).
      </p>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        Get your key from the <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">Clerk dashboard</a>.
      </p>
    </div>
  );
} else {
  createRoot(document.getElementById("root")!).render(
    <ClerkProvider publishableKey={clerkPubKey}>
      <App />
    </ClerkProvider>
  );
}
