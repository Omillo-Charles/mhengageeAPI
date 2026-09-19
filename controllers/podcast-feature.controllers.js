import prisma from "../database/neon.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { podcastFeatureRequestEmail } from "../emails/templates.js";
import { sendEmail } from "../services/email.service.js";
import { AppError } from "../middlewares/error.middlewares.js";

export async function submitPodcastFeatureRequest(req, res) {
    if (!ADMIN_EMAIL) throw new AppError("Podcast request email is not configured", 500, "PODCAST_EMAIL_CONFIG_ERROR");

    const { name, email, topic, message } = req.body;
    const request = await prisma.podcastFeatureRequest.create({ data: { name, email, topic, message } });

    try {
        await sendEmail({
            to: ADMIN_EMAIL,
            replyTo: email,
            ...podcastFeatureRequestEmail({ name, email, topic, message }),
        });
    } catch (error) {
        await prisma.podcastFeatureRequest.delete({ where: { id: request.id } });
        throw error;
    }

    return res.status(201).json({ message: "Your podcast feature request has been sent successfully", id: request.id });
}