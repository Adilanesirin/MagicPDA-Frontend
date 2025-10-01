const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add transformer options for better Hermes compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Disable some optimizations that might cause issues
    keep_fnames: true,
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });