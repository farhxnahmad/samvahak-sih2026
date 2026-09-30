import cloudinary from "../config/cloudinary";

export interface UploadedImage {
  url: string;
  publicId: string;
}

/** Streams a single file buffer (from multer memory storage) to Cloudinary. */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export const uploadBuffers = (buffers: Buffer[], folder: string) =>
  Promise.all(buffers.map((b) => uploadBuffer(b, folder)));

export const deleteImage = (publicId: string) => cloudinary.uploader.destroy(publicId);
