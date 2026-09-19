import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitPodcastFeatureRequest } from "../controllers/podcast-feature.controllers.js";
import { podcastFeatureRequestSchema, validate } from "../middlewares/validation.middlewares.js";

const podcastFeatureRouter = Router();
const featureRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "PODCAST_REQUEST_RATE_LIMITED", message: "Too many requests. Please try again later." } },
});

podcastFeatureRouter.post("/", featureRequestLimiter, validate(podcastFeatureRequestSchema), submitPodcastFeatureRequest);

export default podcastFeatureRouter;