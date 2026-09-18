import prisma from "../database/neon.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { contactNotificationEmail } from "../emails/templates.js";
import { sendEmail } from "../services/email.service.js";
import { AppError } from "../middlewares/error.middlewares.js";

export async function submitContactMessage(req, res) {
    if (!ADMIN_EMAIL) {
        throw new AppError("Contact email is not configured", 500, "CONTACT_EMAIL_CONFIG_ERROR");
    }

    const { name, email, service, message } = req.body;
    const contactMessage = await prisma.contactMessage.create({
        data: { name, email, service, message },
    });

    try {
        await sendEmail({
            to: ADMIN_EMAIL,
            replyTo: email,
            ...contactNotificationEmail({ name, email, service, message }),
        });
    } catch (error) {
        await prisma.contactMessage.delete({ where: { id: contactMessage.id } });
        throw error;
    }

    return res.status(201).json({
        message: "Your inquiry has been sent successfully",
        id: contactMessage.id,
    });
}