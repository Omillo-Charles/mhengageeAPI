import { YOUTUBE_CHANNEL_ID, YOUTUBE_KEY } from "../config/env.js";
import { AppError } from "../middlewares/error.middlewares.js";

function youtubeError(message) {
    return new AppError(message, 502, "YOUTUBE_UNAVAILABLE");
}

function decodeHtmlEntities(value = "") {
    const entities = {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
    };

    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] || match);
}

export async function listYoutubePodcasts(req, res) {
    if (!YOUTUBE_KEY || !YOUTUBE_CHANNEL_ID) {
        throw youtubeError("YouTube feed is not configured");
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const params = new URLSearchParams({
        part: "snippet",
        channelId: YOUTUBE_CHANNEL_ID,
        maxResults: String(limit),
        order: "date",
        type: "video",
        key: YOUTUBE_KEY,
    });
    if (req.query.pageToken) params.set("pageToken", String(req.query.pageToken));
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

    if (!response.ok) {
        throw youtubeError("YouTube feed is unavailable right now");
    }

    const payload = await response.json();
    const data = (payload.items || [])
        .filter((item) => item.id?.videoId)
        .map((item) => ({
            id: item.id.videoId,
            title: decodeHtmlEntities(item.snippet.title),
            description: decodeHtmlEntities(item.snippet.description),
            videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
        }));

    return res.json({ data, nextPageToken: payload.nextPageToken || null });
}