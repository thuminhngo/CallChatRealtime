import { Resend } from "resend";
import "dotenv/config";
import { ENV } from "./env.js";

export const resend = new Resend(ENV.RESEND_API_KEY); 