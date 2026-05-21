import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!convexUrl || !clerkKey) {
  document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b;color:#f4f4f5;font-family:sans-serif;flex-direction:column;gap:12px">
    <div style="font-size:1.5rem;font-weight:bold">⚠️ Missing Environment Variables</div>
    <div style="color:#a1a1aa;font-size:0.9rem">VITE_CONVEX_URL and VITE_CLERK_PUBLISHABLE_KEY must be set in .env.local</div>
  </div>`;
  throw new Error("Missing required env vars: VITE_CONVEX_URL or VITE_CLERK_PUBLISHABLE_KEY");
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
