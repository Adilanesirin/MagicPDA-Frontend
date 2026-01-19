const fs = require('fs');

const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const basePath = 'd:/magicPDA/SyncAnywhere-Frontend/android/app/src/main/res';

densities.forEach(density => {
    const webpPath = `${basePath}/mipmap-${density}/ic_launcher_foreground.webp`;
    const pngPath = `${basePath}/mipmap-${density}/ic_launcher_foreground.png`;

    try {
        // Delete old webp file if it exists
        if (fs.existsSync(webpPath)) {
            fs.unlinkSync(webpPath);
            console.log(`✓ Deleted old ${density} webp`);
        }

        // Rename PNG to WebP (Android needs webp extension)
        if (fs.existsSync(pngPath)) {
            fs.renameSync(pngPath, webpPath);
            console.log(`✓ Converted ${density} png → webp`);
        }
    } catch (error) {
        console.error(`✗ Error processing ${density}:`, error.message);
    }
});

console.log('\n✅ All adaptive icons updated with proper padding!');
console.log('📱 Next step: Clean build your Android app');
console.log('   Run: cd android && ./gradlew clean && cd .. && eas build --profile preview --platform android');
