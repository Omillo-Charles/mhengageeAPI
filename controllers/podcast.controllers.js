import prisma from "../database/neon.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../config/cloudinary.js";
import { AppError } from "../middlewares/error.middlewares.js";
import { invalidateCache } from "../middlewares/cache.middlewares.js";

const publicWhere = { deletedAt: null, status: "PUBLISHED" };

function publicPodcast(item) {
    return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        coverImage: item.coverImage,
        youtubeUrl: item.youtubeUrl,
        spotifyUrl: item.spotifyUrl,
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

export async function listPodcasts(req, res) {
    const { featured, page, limit } = req.query;
    const where = {
        ...publicWhere,
        ...(featured ? { isFeatured: featured === "true" } : {}),
    };
    const [items, total] = await prisma.$transaction([
        prisma.podcast.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        prisma.podcast.count({ where }),
    ]);

    return res.json({ data: items.map(publicPodcast), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getPodcastBySlug(req, res) {
    const item = await prisma.podcast.findFirst({ where: { ...publicWhere, slug: req.params.slug } });
    if (!item) throw new AppError("Podcast episode not found", 404, "PODCAST_NOT_FOUND");
    await prisma.podcast.update({ where: { id: item.id }, data: { viewCount: { increment: 1 } } });
    return res.json({ data: publicPodcast({ ...item, viewCount: item.viewCount + 1 }) });
}

export async function createPodcast(req, res) {
    if (!req.file) throw new AppError("Cover image is required", 400, "COVER_IMAGE_REQUIRED");
    const image = await uploadToCloudinary(req.file.buffer, "mhengagee/podcasts");
    const data = {
        ...req.body,
        coverImage: image.secure_url,
        coverImagePublicId: image.public_id,
        publishedAt: getPublishedAt(req.body.status, null),
    };
    const item = await prisma.podcast.create({ data });
    await invalidateCache("cache:/api/v1/podcasts");
    return res.status(201).json({ data: publicPodcast(item) });
}

export async function updatePodcast(req, res) {
    const existing = await prisma.podcast.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("Podcast episode not found", 404, "PODCAST_NOT_FOUND");
    const data = { ...req.body, publishedAt: getPublishedAt(req.body.status, existing.publishedAt) };

    if (req.file) {
        const image = await uploadToCloudinary(req.file.buffer, "mhengagee/podcasts");
        data.coverImage = image.secure_url;
        data.coverImagePublicId = image.public_id;
    }

    const item = await prisma.podcast.update({ where: { id: existing.id }, data });
    if (req.file && existing.coverImagePublicId) await deleteFromCloudinary(existing.coverImagePublicId);
    await invalidateCache("cache:/api/v1/podcasts");
    return res.json({ data: publicPodcast(item) });
}

export async function deletePodcast(req, res) {
    const existing = await prisma.podcast.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) throw new AppError("Podcast episode not found", 404, "PODCAST_NOT_FOUND");
    await prisma.podcast.update({ where: { id: existing.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
    if (existing.coverImagePublicId) await deleteFromCloudinary(existing.coverImagePublicId);
    await invalidateCache("cache:/api/v1/podcasts");
    return res.status(204).send();
}