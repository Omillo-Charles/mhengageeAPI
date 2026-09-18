import prisma from "../database/neon.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { quoteNotificationEmail } from "../emails/templates.js";
import { sendEmail } from "../services/email.service.js";
import { AppError } from "../middlewares/error.middlewares.js";

export async function submitQuoteRequest(req, res) {
    if (!ADMIN_EMAIL) {
        throw new AppError("Quote email is not configured", 500, "QUOTE_EMAIL_CONFIG_ERROR");
    }

    const { name, company, email, phone, service, budget, date, location, brief, referral } = req.body;
    const quoteRequest = await prisma.quoteRequest.create({
        data: {
            name,
            company,
            email,
            phone,
            service,
            budget,
            projectDate: date ? new Date(`${date}T00:00:00.000Z`) : undefined,
            location,
            brief,
            referral,
        },
    });

    try {
        await sendEmail({
            to: ADMIN_EMAIL,
            replyTo: email,
            ...quoteNotificationEmail({
                name,
                company,
                email,
                phone,
                service,
                budget,
                projectDate: date,
                location,
                brief,
                referral,
            }),
        });
    } catch (error) {
        await prisma.quoteRequest.delete({ where: { id: quoteRequest.id } });
        throw error;
    }

    return res.status(201).json({
        message: "Your project brief has been sent successfully",
        id: quoteRequest.id,
    });
}