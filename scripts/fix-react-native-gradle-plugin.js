const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts'
);

const androidSettingsPath = path.join(__dirname, '..', 'android', 'settings.gradle');
const androidSettingsGeneratedInclude = 'includeBuild(expoAutolinking.reactNativeGradlePlugin)';

if (!fs.existsSync(targetPath)) {
  console.log('Skipping React Native Gradle plugin patch because the package is not installed yet.');
  process.exit(0);
}

const marker = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }';
const replacement = `dependencyResolutionManagement {
  versionCatalogs {
    create("libs") {
      from(files("gradle/libs.versions.toml"))
    }
  }
}

${marker}`;

let content = fs.readFileSync(targetPath, 'utf8');

if (content.includes('dependencyResolutionManagement')) {
  console.log('React Native Gradle plugin settings already patched.');
} else {
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    console.error('Could not locate the marker in the React Native Gradle plugin settings file.');
    process.exit(1);
  }

  content = content.slice(0, markerIndex) + replacement.slice(0, replacement.indexOf(marker)) + content.slice(markerIndex);
  fs.writeFileSync(targetPath, content);
  console.log('Patched React Native Gradle plugin settings.gradle.kts to register the libs version catalog.');
}

if (fs.existsSync(androidSettingsPath)) {
  let androidSettings = fs.readFileSync(androidSettingsPath, 'utf8');
  let changed = false;

  if (androidSettings.includes(androidSettingsGeneratedInclude)) {
    androidSettings = androidSettings.replace(androidSettingsGeneratedInclude, '');
    androidSettings = androidSettings.replace(/\r?\n{3,}/g, '\n\n');
    changed = true;
    console.log('Removed the stale generated includeBuild(expoAutolinking.reactNativeGradlePlugin) from android/settings.gradle.');
  }

  if (changed) {
    fs.writeFileSync(androidSettingsPath, androidSettings);
  }
}
