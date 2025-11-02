import { Resend } from "resend";
import "dotenv/config";
import { ENV } from "./env.js";

// Validate RESEND_API_KEY
if (!ENV.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required in environment variables");
}

export const resendClient = new Resend(ENV.RESEND_API_KEY);

// Validate sender email and name
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

if (!ENV.EMAIL_FROM || !validateEmail(ENV.EMAIL_FROM)) {
  throw new Error(
    "EMAIL_FROM must be a valid email address in environment variables"
  );
}

if (!ENV.EMAIL_FROM_NAME) {
  throw new Error("EMAIL_FROM_NAME is required in environment variables");
}

export const sender = {
  email: ENV.EMAIL_FROM,
  name: ENV.EMAIL_FROM_NAME,
};
