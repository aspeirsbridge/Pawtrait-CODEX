const DEFAULT_MAX_DIMENSION = 2048;
const DEFAULT_JPEG_QUALITY = 0.86;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export async function optimizeUploadedImage(
  file: File,
  options?: {
    maxDimension?: number;
    jpegQuality?: number;
  }
): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));

  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image");
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const shouldKeepPng = file.type === "image/png";
  return canvas.toDataURL(
    shouldKeepPng ? "image/png" : "image/jpeg",
    shouldKeepPng ? undefined : jpegQuality
  );
}
