import mongoose from "mongoose";
import { loadConfig } from "./config";
import { buildApp } from "./app";
import { createMongoBoardRepository, createMongoUserRepository } from "./repositories";

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(`Connecting to MongoDB at ${config.mongodbUri}`);
  await mongoose.connect(config.mongodbUri, { family: 4 });
  const app = buildApp({
    userRepo: createMongoUserRepository(),
    boardRepo: createMongoBoardRepository(),
  });
  app.listen(config.port, () => {
    console.log(`kanban api listening on ${config.mongodbUri} port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});