const admin = require("firebase-admin");

// Initialize Firebase Admin without credentials 
// (it will look for GOOGLE_APPLICATION_CREDENTIALS in env or require explicit init)
// We provide a fallback for local testing if user hasn't set it up yet.

try {
  // Try initializing with default credentials
  admin.initializeApp();
} catch (error) {
  console.log("Firebase Admin initialization skipped or failed:", error.message);
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  
  try {
    // If firebase admin is not fully configured, we'll gracefully mock the validation 
    // to keep it "Ready to run locally" out of the box. 
    // For production, remove this check and ensure Firebase is configured.
    if (admin.apps.length === 0 || !process.env.FIREBASE_CONFIG) {
      console.warn("WARNING: Mock token verification used (Firebase not configured)");
      // Mock User
      req.user = {
        uid: "mock-user-123",
        email: "mockuser@example.com",
        name: "Mock User"
      };
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = { verifyToken };
