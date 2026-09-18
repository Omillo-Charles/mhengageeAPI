import { Router } from "express";
import passport from "passport";
import { currentUser, deleteAccount, forgotPassword, googleCallback, refresh, resendVerificationEmail, resetPassword, signin, signout, signup, verifyEmail } from "../controllers/auth.controllers.js";
import { AppError } from "../middlewares/error.middlewares.js";
import { requireAuth } from "../middlewares/auth.middlewares.js";
import { forgotPasswordSchema, resetPasswordSchema, signinSchema, signupSchema, validate, verifyEmailSchema } from "../middlewares/validation.middlewares.js";

const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/signin", validate(signinSchema), signin);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), resetPassword);
authRouter.post("/refresh", refresh);
authRouter.post("/signout", requireAuth, signout);
authRouter.get("/me", requireAuth, currentUser);
authRouter.post("/verify-email", requireAuth, validate(verifyEmailSchema), verifyEmail);
authRouter.post("/verify-email/resend", requireAuth, resendVerificationEmail);
authRouter.delete("/account", requireAuth, deleteAccount);
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
authRouter.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (error, user) => {
        if (error) return next(error);
        if (!user) return next(new AppError("Google authentication failed", 401, "GOOGLE_AUTH_FAILED"));

        req.user = user;
        return next();
    })(req, res, next);
}, googleCallback);

export default authRouter;