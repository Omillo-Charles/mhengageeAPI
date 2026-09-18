import { Redis } from "@upstash/redis";
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "../config/env.js";

const memoryCache = new Map();
const redis = UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
    : null;

function cacheKey(req) {
    return `cache:${req.originalUrl}`;
}

export function cacheResponse(ttlSeconds = 60) {
    return async (req, res, next) => {
        const key = cacheKey(req);

        try {
            const cached = redis ? await redis.get(key) : memoryCache.get(key);

            if (cached) {
                res.set("X-Cache", "HIT");
                return res.json(cached);
            }

            const originalJson = res.json.bind(res);
            res.json = (body) => {
                void storeCache(key, body, ttlSeconds);
                res.set("X-Cache", "MISS");
                return originalJson(body);
            };

            return next();
        } catch (error) {
            console.error("Cache read failed:", error);
            return next();
        }
    };
}

export async function invalidateCache(prefix = "cache:/api/v1/news") {
    if (redis) {
        let cursor = 0;
        do {
            const result = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
            cursor = Number(result[0]);
            if (result[1].length) await redis.del(...result[1]);
        } while (cursor !== 0);
        return;
    }

    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) memoryCache.delete(key);
    }
}

async function storeCache(key, body, ttlSeconds) {
    if (redis) {
        await redis.set(key, body, { ex: ttlSeconds });
    } else {
        memoryCache.set(key, body);
        setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000).unref();
    }
}
