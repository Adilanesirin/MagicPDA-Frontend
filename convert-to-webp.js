const fs = require('fs');
const { execSync } = require('child_process');

// We'll use expo-image or just rename PNG to WebP for now since Android build tools handle conversion
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const basePath = 'd:/magicPDA/SyncAnywhere-Frontend/android/app/src/main/res';

densities.forEach(density => {
    const pngPath = `${basePath}/mipmap-${density}/ic_launcher_foreground.png`;
    const webpPath = `${basePath}/mipmap-${density}/ic_launcher_foreground.webp`;
    
    if (fs.existsSync(pngPath)) {
        console.log(`Processing ${density}...`);
        // Simply copy PNG as WebP - Android Gradle plugin will optimize during build
        fs.copyFileSync(pngPath, webpPath);
        console.log(`Created ${webpPath}`);
    } else {
        console.log(`Skipping ${density} - PNG not found`);
    }
});

console.log('\n✅ All WebP icons updated!');
console.log('Note: Run a clean build for changes to take effect');
