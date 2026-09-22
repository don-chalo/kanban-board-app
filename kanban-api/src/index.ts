import mongoose from "mongoose";
import { loadConfig } from "./config";
import { buildApp } from "./app";
import { createMongoBoardRepository, createMongoUserRepository } from "./repositories";

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(`Connecting to DB`);
  await mongoose.connect(config.mongodbUri, { family: 4 });
  const app = buildApp(
    {
      userRepo: createMongoUserRepository(),
      boardRepo: createMongoBoardRepository(),
    },
    { corsOrigin: config.corsOrigin },
  );
  app.listen(config.port, () => {
    console.log(`kanban api listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});