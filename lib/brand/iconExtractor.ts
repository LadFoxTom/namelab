import sharp from 'sharp';

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

/**
 * Extract the icon/symbol portion from a logo PNG using connected component analysis.
 * For combination marks (icon + text), this isolates the icon.
 * Falls back to the full logo resized to square if extraction fails.
 */
export async function extractIcon(logoPngTransparent: Buffer, size = 1024): Promise<Buffer> {
  try {
    const { data, info } = await sharp(logoPngTransparent)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const total = width * height;

    // Build binary mask of non-transparent pixels
    const opaque = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      opaque[i] = pixels[i * 4 + 3] > 20 ? 1 : 0;
    }

    // Find connected components via flood fill
    const labels = new Int32Array(total);
    const boxes: BoundingBox[] = [];
    let labelCount = 0;

    for (let i = 0; i < total; i++) {
      if (opaque[i] && !labels[i]) {
        labelCount++;
        const label = labelCount;
        const box: BoundingBox = { minX: width, minY: height, maxX: 0, maxY: 0, area: 0 };

        // BFS flood fill
        const queue = [i];
        labels[i] = label;
        let head = 0;

        while (head < queue.length) {
          const idx = queue[head++];
          const x = idx % width;
          const y = (idx - x) / width;

          box.minX = Math.min(box.minX, x);
          box.maxX = Math.max(box.maxX, x);
          box.minY = Math.min(box.minY, y);
          box.maxY = Math.max(box.maxY, y);
          box.area++;

          // 4-connected neighbors
          const neighbors = [];
          if (x > 0) neighbors.push(idx - 1);
          if (x < width - 1) neighbors.push(idx + 1);
          if (y > 0) neighbors.push(idx - width);
          if (y < height - 1) neighbors.push(idx + width);

          for (const n of neighbors) {
            if (opaque[n] && !labels[n]) {
              labels[n] = label;
              queue.push(n);
            }
          }
        }

        boxes.push(box);
      }
    }

    // Filter out tiny components (noise) — less than 1% of image area
    const minArea = total * 0.01;
    const significantBoxes = boxes.filter(b => b.area >= minArea);

    if (significantBoxes.length < 2) {
      // Single component or no meaningful separation — return full logo as square
      return squareCrop(logoPngTransparent, size);
    }

    // Sort by area descending
    significantBoxes.sort((a, b) => b.area - a.area);

    // Heuristic: the icon is typically the component that is:
    // 1. Not the widest (text tends to be wider)
    // 2. More square in aspect ratio
    // 3. In the top or left portion of the image
    let iconBox = significantBoxes[0]; // default to largest
    let bestIconScore = -Infinity;

    for (const box of significantBoxes) {
      const w = box.maxX - box.minX + 1;
      const h = box.maxY - box.minY + 1;
      const aspectRatio = Math.min(w, h) / Math.max(w, h); // 1.0 = perfect square
      const positionScore = (1 - box.minX / width) * 0.3 + (1 - box.minY / height) * 0.3;
      const squarenessScore = aspectRatio * 0.4;
      const score = squarenessScore + positionScore;

      if (score > bestIconScore) {
        bestIconScore = score;
        iconBox = box;
      }
    }

    // Add padding around the icon (5% of the crop size)
    const cropW = iconBox.maxX - iconBox.minX + 1;
    const cropH = iconBox.maxY - iconBox.minY + 1;
    const pad = Math.round(Math.max(cropW, cropH) * 0.05);
    const left = Math.max(0, iconBox.minX - pad);
    const top = Math.max(0, iconBox.minY - pad);
    const extractW = Math.min(width - left, cropW + pad * 2);
    const extractH = Math.min(height - top, cropH + pad * 2);

    const cropped = await sharp(logoPngTransparent)
      .extract({ left, top, width: extractW, height: extractH })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return cropped;
  } catch {
    // Fallback: return full logo as square
    return squareCrop(logoPngTransparent, size);
  }
}

async function squareCrop(buffer: Buffer, size: number): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
