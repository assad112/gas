const crypto = require("crypto");

const SALT_SIZE = 16;
const KEY_SIZE = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_SIZE).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_SIZE).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedPasswordHash) {
  if (
    typeof storedPasswordHash !== "string" ||
    !storedPasswordHash.includes(":")
  ) {
    return false;
  }

  const [salt, storedKey] = storedPasswordHash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, KEY_SIZE);
  const storedKeyBuffer = Buffer.from(storedKey, "hex");

  if (storedKeyBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSessionToken
};
