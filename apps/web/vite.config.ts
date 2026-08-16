import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Precaching the app shell is what makes "open the app with no
      // Internet" (spec §33, §42) actually work after the first visit.
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "TulongLink",
        short_name: "TulongLink",
        description: "Offline-first emergency communication and community relay network.",
        theme_color: "#b91c1c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
      workbox: {
        // Never let a stale cached response silently stand in for a
        // real server round trip on an emergency-critical request — API
        // calls always hit the network, and only 404 without one.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testSetup.ts"],
  },
});
