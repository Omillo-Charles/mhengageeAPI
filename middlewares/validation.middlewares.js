import { z, ZodError } from "zod";

const passwordSchema = z.string().min(8).max(72);

export const signupSchema = z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
});

export const signinSchema = z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: passwordSchema,
});

export const verifyEmailSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(32),
    password: passwordSchema,
});

export const newsQuerySchema = z.object({
    category: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(20).default(12),
});

export const trendingNewsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(10).default(4),
});

export const portfolioQuerySchema = z.object({
    featured: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(24),
});

export const contactMessageSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    service: z.string().trim().min(1).max(120),
    message: z.string().trim().min(10).max(5000),
});

export const quoteRequestSchema = z.object({
    name: z.string().trim().min(1).max(120),
    company: z.string().trim().max(160).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40).optional(),
    service: z.string().trim().min(1).max(120),
    budget: z.string().trim().max(80).optional(),
    date: z.string().trim().date().optional(),
    location: z.string().trim().max(160).optional(),
    brief: z.string().trim().min(10).max(10000),
    referral: z.string().trim().max(120).optional(),
});

export const podcastFeatureRequestSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    topic: z.string().trim().min(1).max(200),
    message: z.string().trim().min(10).max(5000),
});

export function validate(schema, source = "body") {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return next(result.error);
        }

        if (source === "query") {
            req.validatedQuery = result.data;
        } else {
            req[source] = result.data;
        }
        return next();
    };
}

export function isValidationError(error) {
    return error instanceof ZodError;
}
