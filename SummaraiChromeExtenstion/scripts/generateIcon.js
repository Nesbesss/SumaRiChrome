const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for Chrome extension
const sizes = [16, 32, 48, 128];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Function to draw the icon
function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6366F1');  // Indigo
  gradient.addColorStop(1, '#8B5CF6');  // Purple

  // Draw circle with gradient
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw "AI" text
  const fontSize = size * 0.4;
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI', size/2, size/2);

  // Add subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetX = size * 0.05;
  ctx.shadowOffsetY = size * 0.05;

  return canvas;
}

// Generate icons for all sizes
sizes.forEach(size => {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated ${size}x${size} icon`);
});

// Update manifest.json with icon paths
const manifestPath = path.join(__dirname, '../manifest.json');
const manifest = require(manifestPath);

manifest.icons = {};
sizes.forEach(size => {
  manifest.icons[size] = `icons/icon${size}.png`;
});

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Updated manifest.json with icon paths'); 