import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./components/theme-provider";
import { useUser } from "./hooks/use-user";
import { keepAliveService } from "./lib/replit-keep-alive";
import App from "./App";

// Disable HMR to prevent random refreshes
console.log('[HMR] Attempting to disable HMR from application code');

// Disable WebSocket-based connections when the page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('[HMR] Adding additional HMR prevention measures');
  
  // Intercept any reconnection attempts
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    // Check if this is a Vite HMR request
    if (input && typeof input === 'string' && 
        (input.includes('vite') || input.includes('hmr'))) {
      console.log(`[HMR] Blocked fetch request to: ${input}`);
      return new Promise(() => {}); // Never resolve this promise
    }
    return originalFetch.apply(this, [input, init]);
  };
  
  // Start the keep-alive service to prevent application refresh
  keepAliveService.start();
  console.log('[KeepAlive] Service initialized on page load');
});

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <Component {...rest} />;
}

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <StrictMode>
    <ThemeProvider>
      <SWRConfig value={{ fetcher }}>
        <div className="min-h-screen bg-background">
          <App />
        </div>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>,
);