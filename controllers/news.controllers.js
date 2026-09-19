import crypto from "node:crypto";
import { NEWSAPI_API_KEY } from "../config/env.js";
import { AppError } from "../middlewares/error.middlewares.js";

const fallbackImage = "https://res.cloudinary.com/dtsa39r1g/image/upload/v1789733519/mhenga1_dtlgiu.jpg";
const supportedCategories = new Set(["business", "entertainment", "general", "health", "science", "sports", "technology"]);

function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "news-story";
}

function mapArticle(article, index) {
    const sourceUrl = article.url || `${article.title}-${index}`;
    const id = crypto.createHash("sha1").update(sourceUrl).digest("hex").slice(0, 16);

    return {
        id,
        title: article.title || "Untitled story",
        slug: `${slugify(article.title || "news-story")}-${id}`,
        category: article.source?.name || "News",
        description: article.description || "Read the latest story from the news desk.",
        content: article.content || null,
        author: article.author || article.source?.name || "News desk",
        readTime: "5 min read",
        coverImage: article.urlToImage || fallbackImage,
        status: "PUBLISHED",
        isFeatured: index === 0,
        publishedAt: article.publishedAt || null,
        viewCount: 0,
        createdAt: article.publishedAt || null,
        updatedAt: article.publishedAt || null,
        sourceUrl: article.url || null,
    };
}

async function fetchNewsApi({ country, query, category, pageSize, sortBy, endpoint = "top-headlines" }) {
    if (!NEWSAPI_API_KEY) throw new AppError("News API is not configured", 500, "NEWS_API_CONFIG_ERROR");

    const params = new URLSearchParams({ pageSize: String(pageSize), apiKey: NEWSAPI_API_KEY });
    if (country) params.set("country", country);
    if (query) params.set("q", query);
    if (category && supportedCategories.has(category.toLowerCase())) params.set("category", category.toLowerCase());
    if (sortBy) params.set("sortBy", sortBy);

    const response = await fetch(`https://newsapi.org/v2/${endpoint}?${params}`);
    const payload = await response.json();
    if (!response.ok || payload.status !== "ok") throw new AppError("News provider is unavailable", 502, "NEWS_PROVIDER_ERROR");
    return (payload.articles || []).map(mapArticle);
}

async function fetchNews(category, limit) {
    const kenyaNews = await fetchNewsApi({ query: "Kenya", category, pageSize: Math.min(20, Math.max(limit, 8)) });
    const internationalCount = Math.max(0, limit - kenyaNews.length);

    if (!internationalCount) return kenyaNews;

    const internationalNews = await fetchNewsApi({ country: "us", category, pageSize: Math.min(20, internationalCount) });
    return [...kenyaNews, ...internationalNews];
}

export async function listNews(req, res) {
    const { category, page, limit } = req.validatedQuery;
    const articles = await fetchNews(category, limit);
    const start = (page - 1) * limit;
    const data = articles.slice(start, start + limit);
    return res.json({ data, pagination: { page, limit, total: articles.length, pages: Math.ceil(articles.length / limit) } });
}

export async function getNewsBySlug(req, res) {
    const articles = await fetchNews(undefined, 10);
    const article = articles.find((item) => item.slug === req.params.slug);
    if (!article) throw new AppError("News article not found", 404, "NEWS_NOT_FOUND");
    return res.json({ data: article });
}

export async function listTrendingNews(req, res) {
    const { limit } = req.validatedQuery;
    const articles = await fetchNewsApi({ query: "Kenya", pageSize: limit, sortBy: "popularity", endpoint: "everything" });
    return res.json({ data: articles.slice(0, limit) });
}
