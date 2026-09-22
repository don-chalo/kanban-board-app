import cors from "cors";
import express from "express";
import { BoardRepository, UserRepository } from "./repositories";
import { createBoardsRouter, createTransitionsRouter, createUsersRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export interface AppDependencies {
  userRepo: UserRepository;
  boardRepo: BoardRepository;
}

export interface AppOptions {
  corsOrigin?: string[];
}

export function buildApp({ userRepo, boardRepo }: AppDependencies, opts: AppOptions = {}) {
  const app = express();
  const allowedOrigins = opts.corsOrigin ?? [];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (origin === undefined) {
          callback(null, true);
          return;
        }
        callback(null, allowedOrigins.includes(origin));
      },
    }),
  );
  app.use(express.json());
  app.use(createUsersRouter(userRepo));
  app.use(createTransitionsRouter(userRepo));
  app.use(createBoardsRouter(userRepo, boardRepo));
  app.use(errorHandler);
  return app;
}