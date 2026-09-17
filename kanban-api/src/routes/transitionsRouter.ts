import { Router } from "express";
import { LifecycleState } from "../domain/entities";
import { ALL_LIFECYCLE_STATES, allowedTransitions } from "../domain/lifecycle";
import { FROZEN_BOARD_STATES } from "../domain/guards";
import { UserRepository } from "../repositories";
import { createActorMiddleware } from "../middleware/actor";

export function createTransitionsRouter(userRepo: UserRepository): Router {
  const router = Router();
  router.use(createActorMiddleware(userRepo));

  router.get("/transitions", async (_req, res) => {
    const transitions: Record<string, LifecycleState[]> = {};
    for (const state of ALL_LIFECYCLE_STATES) {
      transitions[state] =
        state === LifecycleState.Blocked
          ? allowedTransitions({ state, previousState: LifecycleState.InProgress })
          : allowedTransitions({ state, previousState: null });
    }
    res.set("Cache-Control", "public, max-age=3600");
    res.json({ transitions, frozenStates: [...FROZEN_BOARD_STATES] });
  });

  return router;
}
