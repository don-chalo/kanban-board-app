import "dotenv/config";

export interface AppConfig {
  mongodbUri: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mongodbUri = env.DATABASE_URL;
  if (typeof mongodbUri !== "string" || mongodbUri.trim().length === 0) {
    throw new Error("DATABASE_URL is required");
  }
  const port = Number(env.DEFAULT_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DEFAULT_PORT is required and must be a positive integer");
  }
  return { mongodbUri, port };
}