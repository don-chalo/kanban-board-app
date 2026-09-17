import { buildApp as buildRealApp } from "../app";
import { createMongoBoardRepository, createMongoUserRepository } from "../repositories";

export function buildApp(): ReturnType<typeof buildRealApp> {
  return buildRealApp({
    userRepo: createMongoUserRepository(),
    boardRepo: createMongoBoardRepository(),
  });
}