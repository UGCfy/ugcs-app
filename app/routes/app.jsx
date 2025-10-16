import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  const nodeEnv = process.env.NODE_ENV || "development";
  // eslint-disable-next-line no-undef
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  
  // Determine server type
  const serverType = appUrl.includes("onrender.com") ? "Render" : 
                     appUrl.includes("trycloudflare.com") ? "Local" : 
                     "Unknown";

  return { 
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    environment: {
      type: nodeEnv,
      server: serverType,
      url: appUrl,
    },
  };
};

export default function App() {
  const { apiKey, environment } = useLoaderData();

  const getServerBadgeStyle = () => {
    const baseStyle = {
      position: "fixed",
      bottom: "12px",
      right: "12px",
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: "600",
      zIndex: 9999,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    };

    if (environment.server === "Render") {
      return {
        ...baseStyle,
        background: "#008060",
        color: "white",
      };
    } else if (environment.server === "Local") {
      return {
        ...baseStyle,
        background: "#f49342",
        color: "white",
      };
    } else {
      return {
        ...baseStyle,
        background: "#666",
        color: "white",
      };
    }
  };

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/media">Media</s-link>
        <s-link href="/app/widget-setup">Widget Setup</s-link>
        <s-link href="/app/channels">Content Channels</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/billing">Billing</s-link>
        <s-link href="/app/team">Team</s-link>
      </s-app-nav>
      <Outlet />
      
      {/* Environment Indicator */}
      <div style={getServerBadgeStyle()}>
        <span>{environment.server === "Render" ? "🌐" : environment.server === "Local" ? "💻" : "❓"}</span>
        <span>
          {environment.server} Server
          {environment.type === "development" && " (Dev)"}
        </span>
      </div>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
