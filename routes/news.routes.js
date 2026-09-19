import { Router } from "express";
import { getNewsBySlug, listNews, listTrendingNews } from "../controllers/news.controllers.js";
import { cacheResponse } from "../middlewares/cache.middlewares.js";
import { newsQuerySchema, trendingNewsQuerySchema, validate } from "../middlewares/validation.middlewares.js";

const newsRouter = Router();

newsRouter.get("/trending", validate(trendingNewsQuerySchema, "query"), cacheResponse(300), listTrendingNews);
newsRouter.get("/", validate(newsQuerySchema, "query"), cacheResponse(60), listNews);
newsRouter.get("/:slug", cacheResponse(60), getNewsBySlug);

export default newsRouter;
