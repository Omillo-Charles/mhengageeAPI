import { Router } from "express";
import { upload } from "../config/cloudinary.js";
import { createPodcast, deletePodcast, getPodcastBySlug, listPodcasts, updatePodcast } from "../controllers/podcast.controllers.js";
import { requireAdmin } from "../middlewares/auth.middlewares.js";
import { cacheResponse } from "../middlewares/cache.middlewares.js";
import { createPodcastSchema, podcastQuerySchema, updatePodcastSchema, validate } from "../middlewares/validation.middlewares.js";

const podcastRouter = Router();

podcastRouter.get("/", validate(podcastQuerySchema, "query"), cacheResponse(60), listPodcasts);
podcastRouter.get("/:slug", cacheResponse(60), getPodcastBySlug);
podcastRouter.post("/", requireAdmin, upload.single("coverImage"), validate(createPodcastSchema), createPodcast);
podcastRouter.patch("/:id", requireAdmin, upload.single("coverImage"), validate(updatePodcastSchema), updatePodcast);
podcastRouter.delete("/:id", requireAdmin, deletePodcast);

export default podcastRouter;