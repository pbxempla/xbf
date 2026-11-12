import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import nodemailer from "nodemailer";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(projectRoot, ".env");

try {
  loadEnvFile(envPath);
} catch (error) {
  console.error(`Unable to load the project's .env file: ${error.message}`);
  process.exit(1);
}

const host = process.env.XEMPLA_MAIL_SERVER?.trim().toLowerCase();
const rawPort = process.env.XEMPLA_MAIL_PORT?.trim();
const port = rawPort ? Number(rawPort) : 587;
const rawSsl = process.env.XEMPLA_MAIL_SSL?.trim();
const secure = rawSsl === "true";
const useCredentials = process.env.XEMPLA_USE_CREDENTIALS?.trim() === "true";
const username = process.env.XEMPLA_MAIL_USERNAME?.trim();
const password = process.env.XEMPLA_MAIL_PASSWORD?.trim();
const from = process.env.XEMPLA_MAIL_FROM?.trim();
const fromAddress = from?.match(/<([^<>]+)>/)?.[1] ?? from;
const errors = [];

if (host !== "smtp.gmail.com") {
  errors.push("XEMPLA_MAIL_SERVER must be smtp.gmail.com for authenticated Google Workspace SMTP.");
}

if (!Number.isInteger(port) || ![465, 587].includes(port)) {
  errors.push("XEMPLA_MAIL_PORT must be 465 or 587.");
}

if (rawSsl && rawSsl !== "true" && rawSsl !== "false") {
  errors.push('XEMPLA_MAIL_SSL must be "true" or "false".');
} else if ((port === 465) !== secure) {
  errors.push("Use XEMPLA_MAIL_SSL=true with port 465, or false with port 587.");
}

if (!useCredentials) {
  errors.push("XEMPLA_USE_CREDENTIALS must be true.");
}

if (!username) {
  errors.push("XEMPLA_MAIL_USERNAME is required.");
}

if (!password) {
  errors.push("XEMPLA_MAIL_PASSWORD is required (use a Google Workspace app password).");
}

if (fromAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)) {
  errors.push("XEMPLA_MAIL_FROM must contain a valid email address (optionally with a display name).");
}

if (errors.length > 0) {
  console.error("SMTP configuration is incomplete or invalid:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user: username, pass: password },
});

try {
  await transporter.verify();
  console.log(`SMTP configuration verified successfully (${host}:${port}). No email was sent.`);
} catch (error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of [username, password]) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  const code = error && typeof error === "object" && "code" in error ? ` (${error.code})` : "";
  console.error(`SMTP verification failed${code}: ${message}`);
  process.exitCode = 1;
} finally {
  transporter.close();
}
