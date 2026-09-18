import { Resend } from "resend";
import { EMAIL_FROM, RESEND_API_KEY } from "../config/env.js";
import { AppError } from "../middlewares/error.middlewares.js";

export async function sendEmail({ to, subject, html, text, replyTo }) {
    if (!RESEND_API_KEY || !EMAIL_FROM) {
        throw new AppError("Email service is not configured", 500, "EMAIL_CONFIG_ERROR");
    }

    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html, text, ...(replyTo ? { replyTo } : {}) });

    if (error) {
        throw new AppError("Email could not be sent", 502, "EMAIL_SEND_ERROR");
    }
}