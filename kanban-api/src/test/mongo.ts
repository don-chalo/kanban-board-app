import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer | null = null;

export async function startTestMongo(): Promise<void> {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri("todo-list"));
}

export async function stopTestMongo(): Promise<void> {
  await mongoose.disconnect();
  await server?.stop();
  server = null;
}