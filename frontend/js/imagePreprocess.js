// src/preprocess/imagePreprocess.js
// DeepFocus+ — Image Preprocessing (v0.1)
// Features: validate input → load image → optional centre-crop → resize → optional grayscale
// Outputs: canvas (default) | dataURL | Blob | ImageData | Float32Array (normalised 0..1)

/* =========================
   Public API
   ========================= */

export async function preprocessImage(input, opts = {}) {
  // Options (with sensible defaults)
  const {
    size = 256,                // output max side (or exact side if cropSquare=true)
    cropSquare = true,         // centre-crop to square
    grayscale = false,         // convert to grayscale
    output = "canvas",         // "canvas" | "dataURL" | "blob" | "imageData" | "float32"
    mime = "image/png",        // when output = dataURL/blob
    quality = 0.92,            // 0..1 for JPEG/WebP
    normalise = true           // when output = float32: scale 0..255 → 0..1
  } = opts;

  // 1) Validate input
  if (!isSupportedInput(input)) {
    throw new Error("Unsupported image input. Use a URL string or a PNG/JPEG/WEBP file.");
  }

  // 2) Load pixels
  const { img, revoke } = await loadImage(input);

  try {
    // 3) Crop + Resize on canvas
    let canvas = drawToCanvas(img, { size, cropSquare });

    // 4) Optional grayscale
    if (grayscale) {
      canvas = toGrayscale(canvas);
    }

    // 5) Produce requested output
    switch (output) {
      case "canvas":
        return makeResult({ img, canvas });

      case "dataURL": {
        const dataURL = canvas.toDataURL(mime, quality);
        return makeResult({ img, canvas, dataURL });
      }

      case "blob": {
        const blob = await canvasToBlob(canvas, mime, quality);
        return makeResult({ img, canvas, blob });
      }

      case "imageData": {
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return makeResult({ img, canvas, imageData });
      }

      case "float32": {
        const ctx = canvas.getContext("2d");
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // data = RGBA (Uint8ClampedArray)
        const out = new Float32Array(width * height * 3);
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (normalise) {
            out[j] = r / 255;
            out[j + 1] = g / 255;
            out[j + 2] = b / 255;
          } else {
            out[j] = r;
            out[j + 1] = g;
            out[j + 2] = b;
          }
        }
        return makeResult({ img, canvas, float32: out, width, height, channels: 3, normalised: normalise });
      }

      default:
        throw new Error(`Unknown output type: ${output}`);
    }
  } finally {
    // Clean up a blob URL if we created one
    if (typeof revoke === "function") revoke();
  }
}

/* =========================
   Helpers — Validation & Loading
   ========================= */

function isSupportedInput(input) {
  if (typeof input === "string") return true; // URL/path string
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  
  if (input instanceof File || input instanceof Blob) {
    if (allowed.includes(input.type)) return true;
    throw new Error ("Input not supported! Try an png, jpeg or webp image ");
  }
  throw new Error ("Input not supported! Try and image or URL String!");
}

async function loadImage(input) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let blobUrl = null;

    img.crossOrigin = "anonymous";          // helpful for canvas usage
    img.onload = () => resolve({ img, revoke: blobUrl ? () => URL.revokeObjectURL(blobUrl) : null });
    img.onerror = () => reject(new Error("Failed to load image"));

    if (typeof input === "string") {
      img.src = input;                      // remote/local URL
    } else {
      blobUrl = URL.createObjectURL(input); // File/Blob → blob URL
      img.src = blobUrl;
    }
  });
}

/* =========================
   Helpers — Crop, Resize, Grayscale
   ========================= */

function getCropRect(img, cropSquare = true) {
  const srcW = img.naturalWidth, srcH = img.naturalHeight;
  if (!cropSquare) return { sx: 0, sy: 0, sw: srcW, sh: srcH };
  const side = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - side) / 2);
  const sy = Math.floor((srcH - side) / 2);
  return { sx, sy, sw: side, sh: side };
}

function getDestSize(sw, sh, size = 256, cropSquare = true) {
  if (cropSquare) return { dw: size, dh: size };
  const scale = size / Math.max(sw, sh);
  return { dw: Math.round(sw * scale), dh: Math.round(sh * scale) };
}

function drawToCanvas(img, { size = 256, cropSquare = true } = {}) {
  const { sx, sy, sw, sh } = getCropRect(img, cropSquare);
  const { dw, dh } = getDestSize(sw, sh, size, cropSquare);

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

function toGrayscale(srcCanvas) {
  const { width, height } = srcCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const sctx = srcCanvas.getContext("2d");
  const dctx = canvas.getContext("2d");

  const imgData = sctx.getImageData(0, 0, width, height);
  const d = imgData.data; // Uint8ClampedArray RGBA

  // Luma coefficients (sRGB): 0.299 R + 0.587 G + 0.114 B
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    d[i] = d[i + 1] = d[i + 2] = y;
    // d[i+3] alpha unchanged
  }

  dctx.putImageData(imgData, 0, 0);
  return canvas;
}

/* =========================
   Helpers — Outputs
   ========================= */

function canvasToBlob(canvas, mime = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      // Safari < 14 fallback
      try {
        const dataURL = canvas.toDataURL(mime, quality);
        const blob = dataURLToBlob(dataURL);
        resolve(blob);
      } catch (e) {
        reject(e);
      }
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("toBlob() produced null"));
      resolve(blob);
    }, mime, quality);
  });
}

function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(",");
  const mime = (header.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const bin = atob(base64);
  const len = bin.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/* =========================
   Helper — Uniform return object
   ========================= */

function makeResult(obj) {
  const { img, canvas } = obj;
  return {
    ...obj,
    meta: {
      srcWidth: img.naturalWidth,
      srcHeight: img.naturalHeight,
      outWidth: canvas.width,
      outHeight: canvas.height
    },
    note: obj.note || "preprocessImage: success"
  };
}
