// plugin/withNetworkConfig.js
const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withNetworkConfig(config) {
  // Only apply modifications on Android
  return withAndroidManifest(config, (mod) => {
    try {
      const app = mod.modResults.manifest.application[0];

      // Enable cleartext traffic (needed for development/local networks)
      app.$["android:usesCleartextTraffic"] = "true";

      // Set network security config if the file exists
      app.$["android:networkSecurityConfig"] = "@xml/network_security_config";

      // Preserve backup settings
      if (!app.$["android:allowBackup"]) {
        app.$["android:allowBackup"] = "false";
      }

      console.log("✅ Updated AndroidManifest.xml with network security config");
    } catch (e) {
      console.warn("⚠️ Failed to update AndroidManifest.xml:", e.message);
      // Don't fail the build if manifest update fails
    }

    return mod;
  });
}

module.exports = withNetworkConfig;