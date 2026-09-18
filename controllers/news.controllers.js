import prisma from "../database/neon.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../config/cloudinary.js";
import { AppError } from "../middlewares/error.middlewares.js";
import { invalidateCache } from "../middlewares/cache.middlewares.js";

const publicWhere = { deletedAt: null, status: "PUBLISHED" };

function publicNews(item) {
    return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        category: item.category,
        description: item.description,
        content: item.content,
        author: item.author,
        readTime: item.readTime,
        coverImage: item.coverImage,
        status: item.status,
        isFeatured: item.isFeatured,
        publishedAt: item.publishedAt,
        viewCount: item.viewCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

function getPublishedAt(status, currentValue) {
    return status === "PUBLISHED" && !currentValue ? new Date() : currentValue;
}

export async function listNews(req, res) {
    const { category, featured, page, limit } = req.query;
    const where = {
        ...publicWhere,
        ...(category ? { category } : {}),
        ...(featured ? { isFeatured: featured === "true" } : {}),
    };
    const [items, total] = await prisma.$transaction([
        prisma.news.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        prisma.news.count({ where }),
    ]);

    return res.json({ data: items.map(publicNews), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getNewsBySlug(req, res) {
    const item = await prisma.news.findFirst({ where: { ...publicWhere, slug: req.params.slug } });
    if (!item) throw new AppError("News article not found", 404, "NEWS_NOT_FOUND");
    await prisma.news.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } });
    return res.json({ data: publicNews({ ...item, viewCount: item.viewCount + 1 }) });
}

export async function createNews(req, res) {
    if (!req.file) throw new AppError("Cover image is required", 400, "COVER_IMAGE_REQUIRED");
    const image = await uploadToCloudinary(req.file.buffer, "mhengagee/news");
    const data = { ...req.body, coverImage: image.secure_url, coverImagePublicId: image.public_id, publishedAt: getPublishedAt(req.body.status, null) };
    const item = await prisma.news.create({ data });
    await invalidateCache();
    return res.status(201).json({ data: publicNews(item) });
}

export async function updateNews(req, res) {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("News article not found", 404, "NEWS_NOT_FOUND");
    const data = { ...req.body, publishedAt: getPublishedAt(req.body.status, existing.publishedAt) };

    if (req.file) {
        const image = await uploadToCloudinary(req.file.buffer, "mhengagee/news");
        data.coverImage = image.secure_url;
        data.coverImagePublicId = image.public_id;
    }

    const item = await prisma.news.update({ where: { id: existing.id }, data });
    if (req.file && existing.coverImagePublicId) await deleteFromCloudinary(existing.coverImagePublicId);
    await invalidateCache();
    return res.json({ data: publicNews(item) });
}

export async function deleteNews(req, res) {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("News article not found", 404, "NEWS_NOT_FOUND");
    await prisma.news.update({ where: { id: existing.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    if (existing.coverImagePublicId) await deleteFromCloudinary(existing.coverImagePublicId);
    await invalidateCache();
    return res.status(204).send();
}
