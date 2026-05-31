const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const AI_CONFIDENCE_THRESHOLD = 0.65;
const MAX_IMAGE_DATA_URL_LENGTH = 6_500_000;

const PRODUCT_INFO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "productName",
    "productNameConfidence",
    "category",
    "categoryConfidence",
    "description",
    "descriptionConfidence",
  ],
  properties: {
    productName: { type: "string" },
    productNameConfidence: { type: "number" },
    category: { type: "string" },
    categoryConfidence: { type: "number" },
    description: { type: "string" },
    descriptionConfidence: { type: "number" },
  },
};

const jsonError = (res, status, message) => {
  res.status(status).json({ error: message });
};

const extractBearerToken = (req) => {
  const authorizationHeader = req.get("authorization") || "";
  const [scheme, token] = authorizationHeader.split(" ");
  return scheme === "Bearer" && token ? token : "";
};

const verifyAdminRequest = async (req) => {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, message: "Sign in as an admin to use AI analysis." };
  }

  const decodedToken = await admin.auth().verifyIdToken(token);
  const firestore = admin.firestore();

  const userDoc = await firestore.collection("users").doc(decodedToken.uid).get();
  if (userDoc.exists && userDoc.data()?.role === "admin") {
    return { ok: true, uid: decodedToken.uid };
  }

  if (decodedToken.email) {
    const emailAdminSnapshot = await firestore
      .collection("users")
      .where("email", "==", decodedToken.email)
      .where("role", "==", "admin")
      .limit(1)
      .get();

    if (!emailAdminSnapshot.empty) {
      return { ok: true, uid: decodedToken.uid };
    }
  }

  return { ok: false, status: 403, message: "Admin access is required for AI analysis." };
};

const isValidImageDataUrl = (value) => {
  return /^data:image\/(png|jpe?g|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
};

const isValidImageUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /\.(png|jpe?g|webp)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
};

const validateImageInput = ({ imageDataUrl, imageUrl }) => {
  if (imageDataUrl) {
    if (typeof imageDataUrl !== "string" || !isValidImageDataUrl(imageDataUrl)) {
      return { error: "Upload a valid JPG, PNG, or WEBP image." };
    }
    if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return { error: "Image is too large for AI analysis. Try a smaller image." };
    }
    return { imageInput: imageDataUrl };
  }

  if (imageUrl) {
    if (typeof imageUrl !== "string" || !isValidImageUrl(imageUrl)) {
      return { error: "Use a valid HTTPS JPG, PNG, or WEBP image URL." };
    }
    return { imageInput: imageUrl };
  }

  return { error: "Image data or image URL is required." };
};

const normalizeCategories = (categories) => {
  if (!Array.isArray(categories)) return [];

  const normalized = categories
    .map((category) => (typeof category === "string" ? category.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);

  return Array.from(new Set(normalized));
};

const buildAnalysisPrompt = (knownCategories = []) => {
  const categoryInstruction = knownCategories.length
    ? `Prefer one of these existing categories when it fits: ${knownCategories.join(", ")}.`
    : "Choose a concise category suitable for a phone accessories store.";

  return [
    "Analyze this product image for an admin product creation form.",
    "Return only information that is visually supported by the image.",
    "The store sells phone accessories and related tech accessories.",
    categoryInstruction,
    "Use short ecommerce-friendly copy.",
    "If confidence for a field is low, set that field to an empty string and its confidence below 0.65.",
  ].join(" ");
};

const extractResponseText = (responseData) => {
  if (typeof responseData?.output_text === "string") {
    return responseData.output_text;
  }

  const textParts = [];
  for (const outputItem of responseData?.output || []) {
    for (const contentItem of outputItem?.content || []) {
      if (typeof contentItem?.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }
  return textParts.join("\n");
};

const confidenceValue = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(1, numberValue));
};

const keepWhenConfident = (value, confidence) => {
  if (confidenceValue(confidence) < AI_CONFIDENCE_THRESHOLD) {
    return "";
  }
  return typeof value === "string" ? value.trim() : "";
};

const sanitizeSuggestions = (rawSuggestions) => ({
  name: keepWhenConfident(rawSuggestions.productName, rawSuggestions.productNameConfidence),
  category: keepWhenConfident(rawSuggestions.category, rawSuggestions.categoryConfidence),
  description: keepWhenConfident(rawSuggestions.description, rawSuggestions.descriptionConfidence),
  confidence: {
    name: confidenceValue(rawSuggestions.productNameConfidence),
    category: confidenceValue(rawSuggestions.categoryConfidence),
    description: confidenceValue(rawSuggestions.descriptionConfidence),
  },
});

const analyzeWithOpenAi = async ({ imageInput, categories, apiKey }) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildAnalysisPrompt(categories) },
            { type: "input_image", image_url: imageInput, detail: "low" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "product_image_info",
          strict: true,
          schema: PRODUCT_INFO_SCHEMA,
        },
      },
      temperature: 0.2,
      max_output_tokens: 400,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("OpenAI vision request failed", {
      status: response.status,
      error: data?.error?.message,
    });
    throw new Error("AI image analysis failed.");
  }

  const responseText = extractResponseText(data);
  return sanitizeSuggestions(JSON.parse(responseText || "{}"));
};

exports.analyzeProductImage = onRequest(
  {
    region: "us-central1",
    secrets: [openAiApiKey],
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      jsonError(res, 405, "Method not allowed.");
      return;
    }

    try {
      const adminCheck = await verifyAdminRequest(req);
      if (!adminCheck.ok) {
        jsonError(res, adminCheck.status, adminCheck.message);
        return;
      }

      const { imageDataUrl, imageUrl, categories } = req.body || {};
      const validation = validateImageInput({ imageDataUrl, imageUrl });
      if (validation.error) {
        jsonError(res, 400, validation.error);
        return;
      }

      const suggestions = await analyzeWithOpenAi({
        imageInput: validation.imageInput,
        categories: normalizeCategories(categories),
        apiKey: openAiApiKey.value(),
      });

      res.status(200).json({ suggestions });
    } catch (error) {
      logger.error("AI product image analysis failed", error);
      jsonError(res, 500, "Failed to analyze product image.");
    }
  }
);
