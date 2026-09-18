import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitQuoteRequest } from "../controllers/quote.controllers.js";
import { quoteRequestSchema, validate } from "../middlewares/validation.middlewares.js";

const quoteRouter = Router();
const quoteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "QUOTE_RATE_LIMITED", message: "Too many quote requests. Please try again later." } },
});

quoteRouter.post("/", quoteLimiter, validate(quoteRequestSchema), submitQuoteRequest);

export default quoteRouter;