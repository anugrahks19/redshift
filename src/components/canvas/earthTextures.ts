import * as THREE from 'three';

/**
 * Procedural Earth Texture Generator
 * Produces high-resolution, self-contained textures for day, night city lights,
 * specular reflection, and atmospheric clouds without any external image downloads.
 */

// Simple pseudo-random hash for deterministic procedural variation
function pseudoNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// 2D Smooth Noise
function smoothNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const sx = fx * fx * (3.0 - 2.0 * fx);
  const sy = fy * fy * (3.0 - 2.0 * fy);

  const n00 = pseudoNoise(i, j);
  const n10 = pseudoNoise(i + 1, j);
  const n01 = pseudoNoise(i, j + 1);
  const n11 = pseudoNoise(i + 1, j + 1);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return nx0 * (1 - sy) + nx1 * sy;
}

// Fractal Brownian Motion (fBm)
function fbm(x: number, y: number, octaves: number = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

export function generateEarthTextures() {
  const width = 2048;
  const height = 1024;

  // 1. Day Canvas (Oceans, Continents, Ice Caps)
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = width;
  dayCanvas.height = height;
  const dayCtx = dayCanvas.getContext('2d')!;

  // 2. Night Canvas (City Lights)
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = width;
  nightCanvas.height = height;
  const nightCtx = nightCanvas.getContext('2d')!;

  // 3. Specular Canvas (Ocean reflection)
  const specCanvas = document.createElement('canvas');
  specCanvas.width = width;
  specCanvas.height = height;
  const specCtx = specCanvas.getContext('2d')!;

  // 4. Clouds Canvas
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  const cloudCtx = cloudCanvas.getContext('2d')!;

  // Initialize contexts
  dayCtx.fillStyle = '#061325'; // Deep ocean
  dayCtx.fillRect(0, 0, width, height);

  nightCtx.fillStyle = '#000000';
  nightCtx.fillRect(0, 0, width, height);

  specCtx.fillStyle = '#ffffff'; // Oceans reflect light
  specCtx.fillRect(0, 0, width, height);

  cloudCtx.clearRect(0, 0, width, height);

  const dayImgData = dayCtx.getImageData(0, 0, width, height);
  const dayData = dayImgData.data;

  const nightImgData = nightCtx.getImageData(0, 0, width, height);
  const nightData = nightImgData.data;

  const specImgData = specCtx.getImageData(0, 0, width, height);
  const specData = specImgData.data;

  const cloudImgData = cloudCtx.createImageData(width, height);
  const cloudData = cloudImgData.data;

  // Major continental bounding shapes in equirectangular projection (lon -180..180 => 0..width, lat -90..90 => height..0)
  // We combine parametric continental masks with fractal noise for realistic coastlines and topography.
  const isLandApprox = (u: number, v: number): number => {
    const lon = u * 360 - 180;
    const lat = (1 - v) * 180 - 90;

    let landWeight = 0;

    // Antarctica (South pole ice sheet)
    if (lat < -65) landWeight += 1.2;

    // Greenland & Arctic
    if (lat > 60 && lon > -55 && lon < -15) landWeight += 1.0;

    // North America
    if (lat > 12 && lat < 72 && lon > -168 && lon < -52) {
      const dist = Math.hypot((lon - -100) / 45, (lat - 45) / 25);
      if (dist < 1.0) landWeight += (1.0 - dist) * 1.5;
    }

    // South America
    if (lat > -55 && lat < 12 && lon > -82 && lon < -34) {
      const dist = Math.hypot((lon - -60) / 20, (lat - -20) / 32);
      if (dist < 1.0) landWeight += (1.0 - dist) * 1.5;
    }

    // Eurasia
    if (lat > 10 && lat < 75 && lon > -10 && lon < 170) {
      const dist = Math.hypot((lon - 70) / 60, (lat - 50) / 25);
      if (dist < 1.0) landWeight += (1.0 - dist) * 1.4;
    }

    // Africa
    if (lat > -35 && lat < 38 && lon > -18 && lon < 52) {
      const dist = Math.hypot((lon - 20) / 24, (lat - 5) / 35);
      if (dist < 1.0) landWeight += (1.0 - dist) * 1.5;
    }

    // Australia
    if (lat > -42 && lat < -12 && lon > 112 && lon < 154) {
      const dist = Math.hypot((lon - 134) / 18, (lat - -27) / 14);
      if (dist < 1.0) landWeight += (1.0 - dist) * 1.6;
    }

    return landWeight;
  };

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (1 - v) * 180 - 90;
    const absLat = Math.abs(lat);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const idx = (y * width + x) * 4;

      // Base noise
      const noise = fbm(u * 16, v * 8, 5);
      const microNoise = fbm(u * 64, v * 32, 3);
      const landMask = isLandApprox(u, v);
      const isLand = landMask + (noise - 0.48) * 1.2 > 0.45;

      // Cloud density noise
      const cloudNoise = fbm(u * 14 + 0.5, v * 7 + 0.2, 5);
      const cloudPuff = Math.max(0, cloudNoise - 0.44) * 2.2;

      // Cloud bands concentrated in tropics and mid-latitudes
      const tropicalBand = Math.sin(v * Math.PI) * 0.3;
      const finalCloud = Math.min(1.0, (cloudPuff + tropicalBand * 0.4) * 0.95);

      if (finalCloud > 0.1) {
        cloudData[idx] = 255;
        cloudData[idx + 1] = 255;
        cloudData[idx + 2] = 255;
        cloudData[idx + 3] = Math.floor(finalCloud * 230);
      } else {
        cloudData[idx + 3] = 0;
      }

      if (isLand) {
        // Land pixel
        specData[idx] = 20; // Land is mostly matte
        specData[idx + 1] = 20;
        specData[idx + 2] = 20;

        if (absLat > 68) {
          // Polar Ice / Snow
          dayData[idx] = 240;
          dayData[idx + 1] = 248;
          dayData[idx + 2] = 255;
        } else if (absLat < 28 && (u > 0.45 && u < 0.65 || u > 0.15 && u < 0.3)) {
          // Arid desert belts (Sahara / Middle East / Atacama)
          dayData[idx] = Math.floor(180 + microNoise * 40);
          dayData[idx + 1] = Math.floor(140 + microNoise * 30);
          dayData[idx + 2] = Math.floor(90 + microNoise * 20);
        } else {
          // Temperate / Forest
          dayData[idx] = Math.floor(34 + microNoise * 30);
          dayData[idx + 1] = Math.floor(88 + microNoise * 45);
          dayData[idx + 2] = Math.floor(40 + microNoise * 20);
        }

        // Night city lights on inhabited land
        if (absLat < 58 && absLat > 12) {
          const cityNoise = pseudoNoise(x * 0.2, y * 0.2);
          if (cityNoise > 0.91) {
            const brightness = (cityNoise - 0.91) * 11.0;
            nightData[idx] = Math.min(255, Math.floor(255 * brightness));
            nightData[idx + 1] = Math.min(255, Math.floor(205 * brightness));
            nightData[idx + 2] = Math.min(255, Math.floor(110 * brightness));
          }
        }
      } else {
        // Ocean pixel
        const coastProximity = landMask > 0.2 ? 1 : 0;
        if (coastProximity && noise > 0.38) {
          // Turquoise coastal shallows
          dayData[idx] = 16;
          dayData[idx + 1] = 95;
          dayData[idx + 2] = 125;
        } else {
          // Deep Sapphire Ocean
          dayData[idx] = 5;
          dayData[idx + 1] = 20;
          dayData[idx + 2] = 45;
        }
      }
    }
  }

  dayCtx.putImageData(dayImgData, 0, 0);
  nightCtx.putImageData(nightImgData, 0, 0);
  specCtx.putImageData(specImgData, 0, 0);
  cloudCtx.putImageData(cloudImgData, 0, 0);

  const dayTexture = new THREE.CanvasTexture(dayCanvas);
  const nightTexture = new THREE.CanvasTexture(nightCanvas);
  const specTexture = new THREE.CanvasTexture(specCanvas);
  const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  cloudTexture.colorSpace = THREE.SRGBColorSpace;

  return { dayTexture, nightTexture, specTexture, cloudTexture };
}

