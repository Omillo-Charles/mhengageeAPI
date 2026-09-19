import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/neon.js";
import {
    JWT_ACCESS_EXPIRY,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_EXPIRY,
    JWT_REFRESH_SECRET,
} from "../config/env.js";
import { AppError } from "../middlewares/error.middlewares.js";
import { passwordResetEmail, verificationEmail } from "../emails/templates.js";
import { sendEmail } from "../services/email.service.js";
import { FRONTEND_URL } from "../config/env.js";

const accessCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
    ...accessCookieOptions,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

function assertJwtConfig() {
    if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
        throw new AppError("JWT configuration is incomplete", 500, "AUTH_CONFIG_ERROR");
    }
}

function parseDuration(value, fallbackMilliseconds) {
    const match = String(value || "").match(/^(\d+)\s*(ms|s|m|h|d)$/i);

    if (!match) return fallbackMilliseconds;

    const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(match[1]) * multipliers[match[2].toLowerCase()];
}

export function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
    };
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function createOpaqueToken() {
    return crypto.randomBytes(32).toString("hex");
}

function createOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

async function createVerificationToken(userId) {
    const otp = createOtp();
    await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
    await prisma.emailVerificationToken.create({
        data: {
            tokenHash: hashToken(otp),
            userId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
    });
    return otp;
}

async function sendVerificationEmail(user) {
    const otp = await createVerificationToken(user.id);
    await sendEmail({ to: user.email, ...verificationEmail({ otp }) });
}

export function issueTokens(user, familyId = crypto.randomUUID()) {
    assertJwtConfig();
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRY || "15m" });
    const refreshToken = jwt.sign({ sub: user.id, type: "refresh", familyId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY || "7d" });

    return { accessToken, refreshToken, familyId };
}

export async function persistRefreshToken(userId, refreshToken, familyId) {
    await prisma.refreshToken.create({
        data: {
            tokenHash: hashToken(refreshToken),
            familyId,
            userId,
            expiresAt: new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRY, 7 * 24 * 60 * 60 * 1000)),
        },
    });
}

export function setAuthCookies(res, tokens) {
    res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);
}

function clearAuthCookies(res) {
    res.clearCookie("accessToken", accessCookieOptions);
    res.clearCookie("refreshToken", refreshCookieOptions);
}

export async function signup(req, res) {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        throw new AppError("An account with that email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            authProvider: "LOCAL",
            firstName,
            lastName,
            displayName: [firstName, lastName].filter(Boolean).join(" ") || undefined,
        },
    });
    const tokens = issueTokens(user);
    await persistRefreshToken(user.id, tokens.refreshToken, tokens.familyId);
    setAuthCookies(res, tokens);
    await sendVerificationEmail(user);

    return res.status(201).json({ user: publicUser(user) });
}

export async function signin(req, res) {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.authProvider !== "LOCAL" || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const tokens = issueTokens(updatedUser);
    await persistRefreshToken(updatedUser.id, tokens.refreshToken, tokens.familyId);
    setAuthCookies(res, tokens);

    return res.json({ user: publicUser(updatedUser) });
}

export async function verifyEmail(req, res) {
    const token = await prisma.emailVerificationToken.findFirst({
        where: {
            tokenHash: hashToken(req.body.otp),
            userId: req.auth.sub,
            usedAt: null,
            expiresAt: { gt: new Date() },
        },
    });

    if (!token) {
        throw new AppError("Verification code is invalid or expired", 400, "INVALID_VERIFICATION_CODE");
    }

    await prisma.$transaction([
        prisma.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: req.auth.sub }, data: { emailVerified: true } }),
    ]);

    return res.json({ message: "Email verified successfully" });
}

export async function resendVerificationEmail(req, res) {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) throw new AppError("User account no longer exists", 404, "USER_NOT_FOUND");
    if (user.emailVerified) return res.json({ message: "Email is already verified" });

    await sendVerificationEmail(user);
    return res.json({ message: "Verification code sent" });
}

export async function forgotPassword(req, res) {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });

    if (user?.authProvider === "LOCAL") {
        const token = createOpaqueToken();
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        await prisma.passwordResetToken.create({
            data: {
                tokenHash: hashToken(token),
                userId: user.id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });

        const resetUrl = `${FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`;
        await sendEmail({ to: user.email, ...passwordResetEmail({ resetUrl }) });
    }

    return res.json({ message: "If an account exists for that email, a password reset link has been sent" });
}

export async function resetPassword(req, res) {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(req.body.token) },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
        throw new AppError("Password reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.$transaction([
        prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
        prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash, authProvider: "LOCAL" } }),
        prisma.refreshToken.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    clearAuthCookies(res);
    return res.json({ message: "Password reset successfully" });
}

export async function googleCallback(req, res) {
    const tokens = issueTokens(req.user);
    await persistRefreshToken(req.user.id, tokens.refreshToken, tokens.familyId);
    setAuthCookies(res, tokens);

    const destination = req.user.role === "ADMIN" ? "/admin" : "/";
    return res.redirect(`${FRONTEND_URL || "http://localhost:3000"}${destination}`);
}

export async function refresh(req, res) {
    assertJwtConfig();
    const token = req.cookies?.refreshToken;

    if (!token) {
        throw new AppError("Refresh token is required", 401, "MISSING_REFRESH_TOKEN");
    }

    let payload;
    try {
        payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
        throw new AppError("Refresh token is invalid or expired", 401, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date() || storedToken.userId !== payload.sub) {
        throw new AppError("Refresh token is invalid or revoked", 401, "INVALID_REFRESH_TOKEN");
    }

    const tokens = issueTokens(storedToken.user, storedToken.familyId);
    await prisma.$transaction([
        prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date(), replacedAt: new Date() } }),
        prisma.refreshToken.create({
            data: {
                tokenHash: hashToken(tokens.refreshToken),
                familyId: tokens.familyId,
                userId: storedToken.userId,
                expiresAt: new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRY, 7 * 24 * 60 * 60 * 1000)),
            },
        }),
    ]);
    setAuthCookies(res, tokens);

    return res.json({ user: publicUser(storedToken.user) });
}

export async function signout(req, res) {
    const token = req.cookies?.refreshToken;
    if (token) {
        await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(token), userId: req.auth.sub, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    clearAuthCookies(res);
    return res.status(204).send();
}

export async function currentUser(req, res) {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) throw new AppError("User account no longer exists", 401, "USER_NOT_FOUND");
    return res.json({ user: publicUser(user) });
}

export async function deleteAccount(req, res) {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });

    if (!user) {
        throw new AppError("User account no longer exists", 404, "USER_NOT_FOUND");
    }

    await prisma.user.delete({ where: { id: user.id } });
    clearAuthCookies(res);

    return res.status(204).send();
}
