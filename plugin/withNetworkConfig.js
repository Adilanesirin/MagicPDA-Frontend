// plugin/withNetworkConfig.js
const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

function withNetworkConfig(config) {
  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      const xmlDir = path.join(
        mod.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        NETWORK_SECURITY_CONFIG_XML
      );
      return mod;
    },
  ]);

  return withAndroidManifest(config, (mod) => {
    try {
      const app = mod.modResults.manifest.application[0];

      app.$["android:usesCleartextTraffic"] = "true";
      app.$["android:networkSecurityConfig"] = "@xml/network_security_config";

      if (!app.$["android:allowBackup"]) {
        app.$["android:allowBackup"] = "false";
      }

      console.log("Updated AndroidManifest.xml with network security config");
    } catch (e) {
      console.warn("Failed to update AndroidManifest.xml:", e.message);
    }

    return mod;
  });
}

module.exports = withNetworkConfig;