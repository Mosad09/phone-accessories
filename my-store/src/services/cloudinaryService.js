const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const CLOUDINARY_UPLOAD_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
  : "";

const getUploadConfigError = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return "Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.";
  }
  return "";
};

export const uploadImageToCloudinary = (file, options = {}) => {
  const { folder = "products", onProgress } = options;
  const configError = getUploadConfigError();
  if (configError) {
    return Promise.reject(new Error(configError));
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_UPLOAD_URL, true);

    xhr.upload.onprogress = (event) => {
      if (typeof onProgress === "function" && event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading image to Cloudinary."));
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && result.secure_url) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id || null,
            format: result.format || null,
          });
          return;
        }
        reject(
          new Error(
            result?.error?.message || "Cloudinary upload failed. Please try again."
          )
        );
      } catch {
        reject(new Error("Invalid response from Cloudinary upload endpoint."));
      }
    };

    xhr.send(formData);
  });
};

export const uploadImagesToCloudinary = async (files, options = {}) => {
  const uploadResults = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const result = await uploadImageToCloudinary(file, options);
    uploadResults.push(result);
  }
  return uploadResults;
};

export const deleteCloudinaryImages = async (_publicIds = []) => {
  // Unsigned frontend uploads cannot securely destroy assets without server-side credentials.
  // We keep public IDs for future server-side cleanup jobs.
  return;
};
