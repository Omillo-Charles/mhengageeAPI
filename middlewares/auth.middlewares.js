import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config/env.js";
import { AppError } from "./error.middlewares.js";

export function getAccessToken(req) {
    const authorization = req.get("authorization");

    if (authorization?.startsWith("Bearer ")) {
        return authorization.slice(7);
    }

    return req.cookies?.accessToken;
}

export function requireAuth(req, res, next) {
    const token = getAccessToken(req);

    if (!token || !JWT_ACCESS_SECRET) {
        return next(new AppError("Authentication is required", 401, "UNAUTHENTICATED"));
    }

    try {
        req.auth = jwt.verify(token, JWT_ACCESS_SECRET);
        return next();
    } catch {
        return next(new AppError("Access token is invalid or expired", 401, "INVALID_ACCESS_TOKEN"));
    }
}
