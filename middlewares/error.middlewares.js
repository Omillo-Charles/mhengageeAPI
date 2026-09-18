import { Prisma } from "../generated/prisma/index.js";
import { isValidationError } from "./validation.middlewares.js";

export class AppError extends Error {
    constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function notFoundHandler(req, res, next) {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

export function errorHandler(error, req, res, next) {
    let statusCode = error.statusCode || 500;
    let code = error.code || "INTERNAL_SERVER_ERROR";
    let message = error.message || "An unexpected error occurred";
    let details;

    if (isValidationError(error)) {
        statusCode = 400;
        code = "VALIDATION_ERROR";
        message = "Request validation failed";
        details = error.issues.map(({ path, message: issueMessage }) => ({
            path,
            message: issueMessage,
        }));
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            statusCode = 409;
            code = "CONFLICT";
            message = "A record with those details already exists";
        } else {
            statusCode = 500;
            code = "DATABASE_ERROR";
            message = "A database error occurred";
        }
    }

    if (statusCode >= 500) {
        console.error(error);
    }

    return res.status(statusCode).json({
        error: {
            code,
            message,
            ...(details ? { details } : {}),
            ...(process.env.NODE_ENV === "development" && statusCode >= 500 ? { stack: error.stack } : {}),
        },
    });
}
