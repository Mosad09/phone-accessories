import { auth } from "../utils/firebase";

const AI_PRODUCT_INFO_URL =
  import.meta.env.VITE_AI_PRODUCT_INFO_URL || "/api/analyze-product-image";

const MAX_ANALYSIS_IMAGE_SIDE = 1024;
const ANALYSIS_IMAGE_QUALITY = 0.82;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for analysis."));
    image.src = src;
  });

const imageFileToAnalysisDataUrl = async (file) => {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const scale = Math.min(
    1,
    MAX_ANALYSIS_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image for analysis.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", ANALYSIS_IMAGE_QUALITY);
};

export const analyzeProductImage = async ({ file, imageUrl, categories = [] }) => {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("Sign in as an admin to use AI analysis.");
  }

  const payload = {
    categories,
    ...(file ? { imageDataUrl: await imageFileToAnalysisDataUrl(file) } : {}),
    ...(!file && imageUrl ? { imageUrl } : {}),
  };

  const response = await fetch(AI_PRODUCT_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Image analysis failed.");
  }

  return data.suggestions || {};
};
