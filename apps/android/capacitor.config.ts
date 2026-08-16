import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.tulonglink.app",
  appName: "TulongLink",
  // Points at the web app's production build output. No native plugins
  // are registered yet — there's nothing to bridge until Phase 3 adds
  // BLE (see README.md in this directory).
  webDir: "../web/dist",
};

export default config;
