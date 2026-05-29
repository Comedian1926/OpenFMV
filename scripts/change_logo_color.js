const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo.png');
const outputPath = path.join(__dirname, '../public/logo_orange.png');
const targetColor = { r: 255, g: 106, b: 0 }; // #FF6A00 Aliyun Orange
const threshold = 200; // Threshold for "white"

async function processImage() {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelArray = new Uint8Array(data);
    const channels = info.channels;

    let changedPixels = 0;

    for (let i = 0; i < pixelArray.length; i += channels) {
      const r = pixelArray[i];
      const g = pixelArray[i + 1];
      const b = pixelArray[i + 2];
      
      // Check if pixel is white or near white (including anti-aliased edges)
      // We check if it's "light enough" and "gray enough"
      const brightness = (r + g + b) / 3;
      const isGrayscale = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(b - r) < 20;
      
      // Lower threshold to catch anti-aliased edges (e.g., > 50)
      // Only change if it's not fully transparent
      let shouldChange = brightness > 50 && isGrayscale;
      
      if (channels === 4 && pixelArray[i + 3] === 0) {
        shouldChange = false;
      }

      if (shouldChange) {
        // If it's an edge (semi-transparent or dark gray due to AA), we might want to just set it to Orange
        // But we must preserve the "darkness" if it's actually black.
        // If it's white anti-aliased, it's just white with lower alpha.
        // If it's white on black background flattened, it's gray.
        
        // Assuming standard white logo on transparent:
        // The edge pixels are white (255,255,255) with Alpha < 255.
        // My previous script checked R,G,B > 200.
        // If the pixel is (255,255,255, 100), it would be changed.
        // But if the pixel is pre-multiplied or just gray (100,100,100, 255), it wasn't changed.
        
        // If the user says "edges are still white", it implies they are visible.
        // If they are gray, they might look white-ish compared to black?
        // Or maybe they are white with low alpha, and my previous check failed?
        // Wait, (255,255,255) with alpha 100 is still R=255.
        // Unless the image data is premultiplied? sharp .raw() gives non-premultiplied usually.
        
        // Let's assume the "white edges" are actually gray pixels (e.g. 200,200,200) or similar.
        // So lowering the threshold is the key.
        
        pixelArray[i] = targetColor.r;
        pixelArray[i + 1] = targetColor.g;
        pixelArray[i + 2] = targetColor.b;
        changedPixels++;
      }
    }

    console.log(`Changed ${changedPixels} pixels.`);

    await sharp(pixelArray, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
    .toFile(outputPath);

    console.log(`Successfully saved orange logo to ${outputPath}`);

  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
