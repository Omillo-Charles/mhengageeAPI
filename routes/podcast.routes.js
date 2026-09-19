import { Router } from "express";
import { listYoutubePodcasts } from "../controllers/youtube.controllers.js";
import { cacheResponse } from "../middlewares/cache.middlewares.js";

const podcastRouter = Router();

podcastRouter.get("/youtube", cacheResponse(300), listYoutubePodcasts);

export default podcastRouter;