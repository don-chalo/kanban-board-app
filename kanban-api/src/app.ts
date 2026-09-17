import cors from "cors";
import express from "express";
import { BoardRepository, UserRepository } from "./repositories";
import { createBoardsRouter, createTransitionsRouter, createUsersRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export interface AppDependencies {
  userRepo: UserRepository;
  boardRepo: BoardRepository;
}

export function buildApp({ userRepo, boardRepo }: AppDependencies) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(createUsersRouter(userRepo));
  app.use(createTransitionsRouter(userRepo));
  app.use(createBoardsRouter(userRepo, boardRepo));
  app.use(errorHandler);
  return app;
}