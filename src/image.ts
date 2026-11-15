const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_LONG_EDGE = 2000;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const compressionLadder = [
  { edge: MAX_LONG_EDGE, quality: 0.8 },
  { edge: MAX_LONG_EDGE, quality: 0.6 },
  { edge: 1600, quality: 0.55 },
  { edge: 1280, quality: 0.45 },
  { edge: 960, quality: 0.4 },
];

export interface PreparedImage {
  blob: Blob;
  filename: string;
}

function outputType(inputType: string) {
  if (inputType === "image/png") return "image/png";
  if (inputType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function outputFilename(filename: string, mimeType: string) {
  const base = filename.replace(/\.[^.]+$/, "") || "feedback-image";
  if (mimeType === "image/png") return `${base}.png`;
  if (mimeType === "image/webp") return `${base}.webp`;
  return `${base}.jpg`;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片处理失败，请更换图片"));
      },
      mimeType,
      quality,
    );
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG 和 WebP 图片");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("无法读取这张图片，请更换图片");
  }

  const longestEdge = Math.max(bitmap.width, bitmap.height);
  if (file.size <= MAX_IMAGE_BYTES && longestEdge <= MAX_LONG_EDGE) {
    bitmap.close();
    return { blob: file, filename: file.name };
  }

  try {
    const mimeType = outputType(file.type);
    for (const level of compressionLadder) {
      const scale = Math.min(1, level.edge / longestEdge);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("图片处理失败，请更换图片");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas, mimeType, level.quality);
      if (blob.size <= MAX_IMAGE_BYTES) {
        return {
          blob,
          filename: outputFilename(file.name, mimeType),
        };
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error("图片过大，请裁剪后再试");
}
