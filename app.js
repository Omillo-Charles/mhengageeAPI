import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import { PORT, FRONTEND_URL } from "./config/env.js";
import { configurePassport } from "./config/passport.js";
import { verifyDatabaseConnection } from "./database/neon.js";
import authRouter from "./routes/auth.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middlewares.js";

const app = express();

configurePassport(passport);

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1/auth", authRouter);

app.get("/", (req, res) => {
    return res.json({
        "title": "MhengaGee Media API",
        "body": "Welcome to the MhengaGee Media API"
    })
})

app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer() {
    try {
        await verifyDatabaseConnection();
        console.log("Database connection established successfully");

        app.listen(PORT || 5500, () => {
            console.log(`The MhengaGee Media API is running on http://localhost:${PORT || 5500}`);
        });
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exitCode = 1;
    }
}

startServer();

export default app;