import { Router } from "express";
import { DomainError } from "../domain/errors";
import { UserRepository } from "../repositories";
import { ApiError } from "../middleware/errorHandler";
import { createActorMiddleware } from "../middleware/actor";

export function createUsersRouter(userRepo: UserRepository): Router {
  const router = Router();

  router.post("/login", async (req, res) => {
    const email = req.body?.email;
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ApiError("validation", "email is required");
    }
    const user = await userRepo.resolveUserByEmail(email);
    res.status(200).json(user);
  });

  const authenticated = Router();
  authenticated.use(createActorMiddleware(userRepo));

  authenticated.get("/", async (req, res) => {
    const email = req.query.email;
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ApiError("validation", "email is required");
    }
    res.json(await userRepo.searchByEmailPrefix(email));
  });

  authenticated.post("/resolve", async (req, res) => {
    const email = req.body?.email;
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ApiError("validation", "email is required");
    }
    res.json(await userRepo.resolveUserByEmail(email));
  });

  authenticated.post("/batch", async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) {
      throw new ApiError("validation", "ids is required");
    }
    if (ids.length > 100 || ids.some((id) => typeof id !== "string" || id.length === 0)) {
      throw new ApiError("validation", "ids must be at most 100 non-empty strings");
    }
    res.json(await userRepo.findByIds(ids));
  });

  authenticated.get("/:userId", async (req, res) => {
    const user = await userRepo.findById(req.params.userId);
    if (!user) {
      throw new DomainError("not_found", `User ${req.params.userId} not found`);
    }
    res.json(user);
  });

  router.use("/users", authenticated);

  return router;
}