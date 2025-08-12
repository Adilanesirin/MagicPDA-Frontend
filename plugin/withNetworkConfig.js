// plugin/withNetworkConfig.js
const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withNetworkConfig(config) {
  // Step 1: Copy XML into android res/xml
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const src = path.join(
        modConfig.modRequest.projectRoot,
        "network_security_config.xml"
      );
      const destDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app/src/main/res/xml"
      );
      const dest = path.join(destDir, "network_security_config.xml");

      if (!fs.existsSync(src)) {
        throw new Error(
          "network_security_config.xml not found in project root. Please ensure the file exists."
        );
      }

      // Create directory if it doesn't exist
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(src, dest);
      console.log("✅ Copied network_security_config.xml to res/xml");

      return modConfig;
    },
  ]);

  // Step 2: Inject manifest changes
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];

    // Enable cleartext traffic
    app.$["android:usesCleartextTraffic"] = "true";

    // Set network security config
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";

    // Add additional security attributes for development
    if (!app.$["android:allowBackup"]) {
      app.$["android:allowBackup"] = "false";
    }

    console.log("✅ Updated AndroidManifest.xml with network security config");
    console.log("   - usesCleartextTraffic: true");
    console.log("   - networkSecurityConfig: @xml/network_security_config");

    return mod;
  });
}

module.exports = withNetworkConfig;
