import { Router } from "express";
import { upload } from "../config/cloudinary.js";
import { createPortfolio, deletePortfolio, getPortfolioById, listPortfolio, updatePortfolio } from "../controllers/portfolio.controllers.js";
import { requireAdmin } from "../middlewares/auth.middlewares.js";
import { cacheResponse } from "../middlewares/cache.middlewares.js";
import { portfolioQuerySchema, validate } from "../middlewares/validation.middlewares.js";

const portfolioRouter = Router();

portfolioRouter.get("/", validate(portfolioQuerySchema, "query"), cacheResponse(60), listPortfolio);
portfolioRouter.get("/:id", cacheResponse(60), getPortfolioById);
portfolioRouter.post("/", requireAdmin, upload.single("image"), createPortfolio);
portfolioRouter.patch("/:id", requireAdmin, upload.single("image"), updatePortfolio);
portfolioRouter.delete("/:id", requireAdmin, deletePortfolio);

export default portfolioRouter;