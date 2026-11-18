/**
 * Browser-side photo compression before upload (client components only).
 *
 * Phone photos are typically 3–8 MB (4000+ px). Resizing to max 2560 px on the
 * long side at JPEG quality 0.85 keeps fine detail readable (labels, cable
 * markings) at roughly 0.5–1.5 MB per photo. Photos that are already small
 * enough are uploaded unchanged.
 */

export interface CompressOptions {
  maxDimension?: number; // longest side in px
  quality?: number; // JPEG quality 0..1
}

/** A JPEG that needs no resizing is kept as-is (no re-encoding loss) up to this size. */
const KEEP_ORIGINAL_JPEG_BYTES = 4 * 1024 * 1024;

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Decode an image file, honouring EXIF orientation (phone photos are often rotated). */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // fall through to <img> decoding
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Compress one image file into a JPEG data URL.
 * Throws an Error with an Indonesian message if the file can't be used.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<string> {
  const maxDimension = opts.maxDimension ?? 2560;
  const quality = opts.quality ?? 0.85;

  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" bukan file gambar`);
  }

  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new Error(`Format foto "${file.name}" tidak didukung browser ini. Coba ambil ulang sebagai JPG.`);
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
    if (scale === 1 && file.type === "image/jpeg" && file.size <= KEEP_ORIGINAL_JPEG_BYTES) {
      return readAsDataURL(file);
    }

    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");

    // White background so transparent PNGs don't turn black as JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Gagal mengompres foto");

    return readAsDataURL(blob);
  } finally {
    decoded.close();
  }
}

/** Upload one compressed photo (data URL) to the server; returns its URL ("/api/foto/..."). */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, "foto.jpg");
  const res = await fetch("/api/foto", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah foto");
  return data.url as string;
}
