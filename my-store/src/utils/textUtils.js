/**
 * Convert a string to Title Case, preserving common acronyms and technical terms.
 * Example: "bdt astronaut bluetooth speaker an153 – 5w portable wireless speaker"
 * Output: "BDT Astronaut Bluetooth Speaker AN153 – 5W Portable Wireless Speaker"
 */
export function toTitleCase(str) {
  if (!str) return "";

  // Common ecommerce / technology acronyms that should be fully uppercase
  const acronyms = new Set([
    "bdt", "usb", "aux", "fm", "am", "sd", "tf", "hd", "led", "lcd", "otg", "jbl", "rgb",
    "qc", "pd", "mah", "pps", "bt", "cpu", "gpu", "ram", "rom", "gb", "tb", "mb", "egp"
  ]);

  return str
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";

      // Check if word contains a hyphen (e.g. "type-c")
      if (word.includes("-") && word.length > 1) {
        return word.split("-").map(part => toTitleCase(part)).join("-");
      }

      // Strip punctuation to check against acronyms (e.g. "(usb)" or "bdt," -> "usb" or "bdt")
      const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();

      // If it contains a digit (e.g. "5w", "an153", "s21", "2a"), capitalize everything
      const hasDigit = /\d/.test(word);

      if (acronyms.has(cleanWord) || hasDigit) {
        return word.toUpperCase();
      }

      // Keep punctuation-only or dashes as-is
      if (word === "–" || word === "-" || word === "&") return word;

      // Normal word casing: Capitalize first character, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
