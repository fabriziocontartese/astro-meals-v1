// javascript
// filepath: src/lib/supabaseClient.js
// ...existing code...
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // visible in browser console to help debugging
  console.error("[supabaseClient] MISSING ENV", { url, anonPresent: !!anon });
} else {
  console.log("[supabaseClient] Supabase URL and anon key present");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// debug helper: log auth network responses (dev only)
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await originalFetch(...args);
    try {
      const reqUrl = args[0];
      if (typeof reqUrl === "string" && reqUrl.includes("/auth/v1/token")) {
        // clone to read body safely
        const clone = res.clone();
        clone.text().then((body) => {
          console.warn("[supabaseClient] auth token response", { url: reqUrl, status: res.status, body });
        });
      }
    } catch {
      // ignore
    }
    return res;
  };
}