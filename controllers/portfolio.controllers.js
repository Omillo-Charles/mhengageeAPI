import prisma from "../database/neon.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../config/cloudinary.js";
import { AppError } from "../middlewares/error.middlewares.js";
import { invalidateCache } from "../middlewares/cache.middlewares.js";

const publicWhere = { deletedAt: null, status: "PUBLISHED" };

function publicPortfolio(item) {
    return {
        id: item.id,
        image: item.image,
        status: item.status,
        isFeatured: item.isFeatured,
        publishedAt: item.publishedAt,
        viewCount: item.viewCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

export async function listPortfolio(req, res) {
    const { featured, page, limit } = req.query;
    const where = {
        ...publicWhere,
        ...(featured ? { isFeatured: featured === "true" } : {}),
    };
    const [items, total] = await prisma.$transaction([
        prisma.portfolio.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        prisma.portfolio.count({ where }),
    ]);

    return res.json({ data: items.map(publicPortfolio), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getPortfolioById(req, res) {
    const item = await prisma.portfolio.findFirst({ where: { ...publicWhere, id: req.params.id } });
    if (!item) throw new AppError("Portfolio image not found", 404, "PORTFOLIO_NOT_FOUND");
    await prisma.portfolio.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } });
    return res.json({ data: publicPortfolio({ ...item, viewCount: item.viewCount + 1 }) });
}

export async function createPortfolio(req, res) {
    if (!req.file) throw new AppError("Image is required", 400, "IMAGE_REQUIRED");
    const image = await uploadToCloudinary(req.file.buffer, "mhengagee/portfolio");
    const item = await prisma.portfolio.create({
        data: {
            image: image.secure_url,
            imagePublicId: image.public_id,
        },
    });
    await invalidateCache("cache:/api/v1/portfolio");
    return res.status(201).json({ data: publicPortfolio(item) });
}

export async function updatePortfolio(req, res) {
    if (!req.file) throw new AppError("Image is required", 400, "IMAGE_REQUIRED");
    const existing = await prisma.portfolio.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("Portfolio image not found", 404, "PORTFOLIO_NOT_FOUND");

    const image = await uploadToCloudinary(req.file.buffer, "mhengagee/portfolio");
    const item = await prisma.portfolio.update({
        where: { id: existing.id },
        data: { image: image.secure_url, imagePublicId: image.public_id },
    });

    if (existing.imagePublicId) await deleteFromCloudinary(existing.imagePublicId);
    await invalidateCache("cache:/api/v1/portfolio");
    return res.json({ data: publicPortfolio(item) });
}

export async function deletePortfolio(req, res) {
    const existing = await prisma.portfolio.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("Portfolio image not found", 404, "PORTFOLIO_NOT_FOUND");

    await prisma.portfolio.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
    if (existing.imagePublicId) await deleteFromCloudinary(existing.imagePublicId);
    await invalidateCache("cache:/api/v1/portfolio");
    return res.status(204).send();
}