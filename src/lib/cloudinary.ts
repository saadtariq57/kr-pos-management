import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

let configured = false;

function configure() {
  if (configured) return;

  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
  configured = true;
}

export function getCloudinary() {
  configure();
  return cloudinary;
}

export const CLOUDINARY_UPLOAD_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER || "kr-pos/menu-items";

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_UPLOAD_FOLDER,
        resource_type: "image",
        // Cap large phone photos and let Cloudinary pick the best format/quality.
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { fetch_format: "auto", quality: "auto" },
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary returned no result"));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
