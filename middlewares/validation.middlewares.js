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
