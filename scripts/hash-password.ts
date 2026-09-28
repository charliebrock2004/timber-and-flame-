/**
 * Generates the ADMIN_PASSWORD_HASH value for your .env / Vercel settings.
 *   npm run admin:hash -- "your long password"
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error('Usage: npm run admin:hash -- "a password of at least 12 characters"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 12);
console.log("\nADMIN_PASSWORD_HASH (base64 — paste this, no escaping needed):");
console.log(Buffer.from(hash).toString("base64"));
console.log("\nSESSION_SECRET suggestion (if you don't have one yet):");
console.log(randomBytes(32).toString("base64url"));
console.log();
