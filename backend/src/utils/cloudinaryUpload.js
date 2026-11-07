import cloudinary from "../config/cloudinary.js";
import { PRODUCT_MEDIA_FOLDER, VIDEO_EAGER } from "./media.js";

export function uploadImageBuffer(buffer, { folder = "byapardesk/products" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export function deleteImage(publicId, resourceType = "image") {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

// Lets the admin panel upload a product photo or video straight to
// Cloudinary (videos are too big to pass through this server). Only these
// exact params are signed, so the upload can only land in the product folder.
export function signProductUpload(type) {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary is not configured");
  }

  const params = {
    folder: PRODUCT_MEDIA_FOLDER,
    timestamp: Math.round(Date.now() / 1000),
  };
  if (type === "video") {
    params.eager = VIDEO_EAGER;
    params.eager_async = "true";
  }

  return {
    cloud_name,
    api_key,
    resource_type: type === "video" ? "video" : "image",
    params,
    signature: cloudinary.utils.api_sign_request(params, api_secret),
  };
}

export function cloudName() {
  return cloudinary.config().cloud_name;
}
