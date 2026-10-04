import { MAX_IMAGE_BYTES, sniffImageMime } from "./shared";

export type OriginalImage = {
  mime: "image/png" | "image/jpeg";
  imageBase64: string;
  width: number;
  height: number;
  fileSize: number;
  originalFilename: string;
  previewUrl: string;
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (!width || !height) reject(new Error("Could not read image dimensions."));
      else resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open this image."));
    };
    img.src = url;
  });
}

export async function readOriginalImage(file: File): Promise<OriginalImage> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) {
    throw new Error("Upload a PNG or JPEG. The original file is stored as-is.");
  }
  const { width, height } = await readSize(file);
  const imageBase64 = uint8ToBase64(bytes);
  return {
    mime,
    imageBase64,
    width,
    height,
    fileSize: bytes.byteLength,
    originalFilename: file.name,
    previewUrl: `data:${mime};base64,${imageBase64}`,
  };
}
