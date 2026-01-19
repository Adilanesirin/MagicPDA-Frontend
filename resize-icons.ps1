# PowerShell script to resize Android adaptive icons with proper padding

# Load System.Drawing assembly
Add-Type -AssemblyName System.Drawing

# Source image (the padded icon we created)
$sourceImage = "C:\Users\adila\.gemini\antigravity\brain\00b35e75-bdd4-4bed-b6fb-3d79cd9e506c\ic_launcher_foreground_xxxhdpi_1767932529378.png"

# Define densities and sizes
$densities = @{
    "xxxhdpi" = 432
    "xxhdpi"  = 324
    "xhdpi"   = 216
    "hdpi"    = 162
    "mdpi"    = 108
}

# Base path for mipmap folders
$basePath = "d:\magicPDA\SyncAnywhere-Frontend\android\app\src\main\res"

# Load source image
$srcImage = [System.Drawing.Image]::FromFile($sourceImage)

foreach ($density in $densities.Keys) {
    $size = $densities[$density]
    $outputPath = "$basePath\mipmap-$density\ic_launcher_foreground.png"
    
    Write-Host "Creating $density icon ($size x $size)..."
    
    # Create new bitmap with target size
    $newImage = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    
    # Set high quality rendering
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Draw the resized image
    $graphics.DrawImage($srcImage, 0, 0, $size, $size)
    
    # Save as PNG
    $newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $newImage.Dispose()
    
    Write-Host "Saved: $outputPath"
}

# Cleanup source image
$srcImage.Dispose()

Write-Host "`nAll icons created successfully!"
Write-Host "Note: WebP conversion will be handled by Android build system"
