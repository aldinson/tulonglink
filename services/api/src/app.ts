import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { incidentRouter } from "./routes/incident.js";
import { communityRouter } from "./routes/community.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/incidents", incidentRouter);
  app.use("/api/communities", communityRouter);

  app.use(errorHandler);

  return app;
}
