import { Router } from "express";
import { createNews, deleteNews, getNewsBySlug, listNews, updateNews } from "../controllers/news.controllers.js";
import { requireAdmin } from "../middlewares/auth.middlewares.js";
import { cacheResponse } from "../middlewares/cache.middlewares.js";
import { createNewsSchema, newsQuerySchema, updateNewsSchema, validate } from "../middlewares/validation.middlewares.js";
import { upload } from "../config/cloudinary.js";

const newsRouter = Router();

newsRouter.get("/", validate(newsQuerySchema, "query"), cacheResponse(60), listNews);
newsRouter.get("/:slug", cacheResponse(60), getNewsBySlug);
newsRouter.post("/", requireAdmin, upload.single("coverImage"), validate(createNewsSchema), createNews);
newsRouter.patch("/:id", requireAdmin, upload.single("coverImage"), validate(updateNewsSchema), updateNews);
newsRouter.delete("/:id", requireAdmin, deleteNews);

export default newsRouter;
