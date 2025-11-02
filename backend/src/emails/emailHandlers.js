import { resend } from "../lib/mail.js";
import { createWelcomeEmailTemplate } from "./WelcomeemailTemplate.js";
import { createOTPEmailTemplate } from "./OTPEmailTemplate.js";
import { ENV } from "../lib/env.js";

const SENDER_EMAIL = `Team 24 <no-reply@thuminhngo.id.vn>`;

export const sendWelcomeEmail = async (email, name, clientURL) => {
  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: "Welcome to ChatWeb",
      html: createWelcomeEmailTemplate(name, clientURL),
    });

    if (error) {
      throw new Error(`Resend Error (Welcome): ${JSON.stringify(error)}`);
    }

    console.log("Welcome Email sent successfully:", data.id);
    return data;
  } catch (error) {
    console.error("System Error sending welcome email:", error);
    throw error;
  }
};

export const sendOTPEmail = async (email, name, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `Security Team <otp@thuminhngo.id.vn>`,
      to: [email],
      subject: "OTP code to reset your password",
      html: createOTPEmailTemplate(name, otp),
    });

    if (error) {
      throw new Error(`Resend Error (OTP): ${JSON.stringify(error)}`);
    }

    console.log("OTP Email sent successfully:", data.id);
    return data;
  } catch (error) {
    console.error("System Error sending mail OTP:", error);
    throw error;
  }
};
