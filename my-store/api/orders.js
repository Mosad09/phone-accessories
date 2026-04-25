export default async function handler(req, res) {
  const API_URL = "https://script.google.com/macros/s/AKfycbzDedo7ei48ZCJgxP23Ne4JIOAs6wz95kql_ki5XLUWJMWBV0GGy3CE9Hum4kV_cWTXgw/exec";

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const email = req.query.email;
      const targetUrl = email ? `${API_URL}?email=${encodeURIComponent(email)}` : API_URL;
      
      const response = await fetch(targetUrl);
      const data = await response.json();
      
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  if (req.method === "POST") {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // GAS prefers text/plain or form to avoid CORS issues if called directly, but since we are server side, application/json is fine too.
        },
        // If req.body is already an object, stringify it
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      });
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch (e) {
        return res.status(200).send(text);
      }
    } catch (error) {
      return res.status(500).json({ error: "Failed to place order" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
