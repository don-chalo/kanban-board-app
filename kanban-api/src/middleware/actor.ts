import { RequestHandler } from "express";
import { UserId } from "../domain/entities";
import { UserRepository } from "../repositories";
import { ApiError } from "./errorHandler";

declare global {
  namespace Express {
    interface Request {
      actorId?: UserId;
    }
  }
}

export function createActorMiddleware(userRepo: UserRepository): RequestHandler {
  return async (req, _res, next) => {
    const userId = req.header("x-user-id");
    if (!userId) {
      next(new ApiError("unknown_actor", "Missing X-User-Id header"));
      return;
    }
    const user = await userRepo.findById(userId);
    if (!user) {
      next(new ApiError("unknown_actor", `Unknown user: ${userId}`));
      return;
    }
    req.actorId = user.id;
    next();
  };
}