const crypto = require("crypto");

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomInt(min, max) {
  return crypto.randomInt(min, max);
}

function slugifyDriverName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildDriverUsernameBase(name, phone) {
  const slug = slugifyDriverName(name);
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  const phoneSuffix = phoneDigits.slice(-4) || String(randomInt(1000, 9999));

  if (slug) {
    return `${slug}-${phoneSuffix}`;
  }

  return `driver-${phoneSuffix}`;
}

function buildDriverUsernameVariant(baseUsername) {
  return `${baseUsername}-${String(randomInt(100, 1000))}`;
}

function generateTemporaryPassword(length = 10) {
  const safeLength = Math.max(8, Number(length) || 10);
  let password = "";

  for (let index = 0; index < safeLength; index += 1) {
    const characterIndex = randomInt(0, PASSWORD_ALPHABET.length);
    password += PASSWORD_ALPHABET[characterIndex];
  }

  return password;
}

module.exports = {
  buildDriverUsernameBase,
  buildDriverUsernameVariant,
  generateTemporaryPassword
};
