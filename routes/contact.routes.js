import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitContactMessage } from "../controllers/contact.controllers.js";
import { contactMessageSchema, validate } from "../middlewares/validation.middlewares.js";

const contactRouter = Router();
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "CONTACT_RATE_LIMITED", message: "Too many contact requests. Please try again later." } },
});

contactRouter.post("/", contactLimiter, validate(contactMessageSchema), submitContactMessage);

export default contactRouter;