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

const newsFields = {
    title: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(500),
    content: z.string().trim().min(1).optional(),
    author: z.string().trim().min(1).max(120),
    readTime: z.string().trim().min(1).max(40),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    isFeatured: z.preprocess((value) => {
        if (value === undefined) return undefined;
        if (value === true || value === "true") return true;
        if (value === false || value === "false") return false;
        return value;
    }, z.boolean().optional()),
};

export const createNewsSchema = z.object(newsFields);
export const updateNewsSchema = z.object(newsFields).partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const newsQuerySchema = z.object({
    category: z.string().trim().optional(),
    featured: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

export function validate(schema, source = "body") {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return next(result.error);
        }

        req[source] = result.data;
        return next();
    };
}

export function isValidationError(error) {
    return error instanceof ZodError;
}
