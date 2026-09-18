import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../database/neon.js";
import {
    GOOGLE_CALLBACK_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
} from "./env.js";

export function configurePassport(passport) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
        throw new Error("Google OAuth configuration is incomplete");
    }

    passport.use(new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value?.toLowerCase();

            if (!email) {
                return done(new Error("Google account did not provide an email address"));
            }

            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser?.authProvider === "LOCAL") {
                return done(new Error("An account with this email already uses local sign in"));
            }

            const user = existingUser
                ? await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        googleId: profile.id,
                        emailVerified: true,
                        lastLoginAt: new Date(),
                        firstName: profile.name?.givenName || existingUser.firstName,
                        lastName: profile.name?.familyName || existingUser.lastName,
                        displayName: profile.displayName || existingUser.displayName,
                        avatarUrl: profile.photos?.[0]?.value || existingUser.avatarUrl,
                    },
                })
                : await prisma.user.create({
                    data: {
                        email,
                        googleId: profile.id,
                        authProvider: "GOOGLE",
                        emailVerified: true,
                        lastLoginAt: new Date(),
                        firstName: profile.name?.givenName,
                        lastName: profile.name?.familyName,
                        displayName: profile.displayName,
                        avatarUrl: profile.photos?.[0]?.value,
                    },
                });

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));
}
