import { randomUUID } from "node:crypto";
import { User, UserId } from "../domain/entities";
import { userDocToDomain, userToDoc } from "../mappers";
import { UserModel } from "../models";

export interface UserRepository {
  create(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByIds(ids: UserId[]): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  resolveUserByEmail(email: string): Promise<User>;
  searchByEmailPrefix(prefix: string, limit?: number): Promise<User[]>;
}

const DEFAULT_SEARCH_LIMIT = 8;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createMongoUserRepository(): UserRepository {
  return {
    async create(user) {
      await UserModel.create(userToDoc(user));
    },

    async findById(id) {
      const doc = await UserModel.findById(id).lean();
      return doc ? userDocToDomain(doc) : null;
    },

    async findByIds(ids) {
      const unique = [...new Set(ids)];
      if (unique.length === 0) {
        return [];
      }
      const docs = await UserModel.find({ _id: { $in: unique } }).lean();
      const byId = new Map(docs.map((doc) => [String(doc._id), userDocToDomain(doc)]));
      return unique.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    },

    async findByEmail(email) {
      const doc = await UserModel.findOne({ email }).lean();
      return doc ? userDocToDomain(doc) : null;
    },

    async resolveUserByEmail(email) {
      const normalized = normalizeEmail(email);
      const existing = await UserModel.findOne({ email: normalized }).lean();
      if (existing) {
        return userDocToDomain(existing);
      }
      const user: User = { id: randomUUID(), email: normalized };
      try {
        await UserModel.create(userToDoc(user));
      } catch (err) {
        const isDuplicate =
          typeof err === "object" && err !== null && "code" in err && err.code === 11000;
        if (!isDuplicate) {
          throw err;
        }
        const raced = await UserModel.findOne({ email: normalized }).lean();
        if (raced) {
          return userDocToDomain(raced);
        }
        throw err;
      }
      return user;
    },

    async searchByEmailPrefix(prefix, limit = DEFAULT_SEARCH_LIMIT) {
      const normalized = normalizeEmail(prefix);
      if (normalized.length === 0) {
        return [];
      }
      const pattern = new RegExp(`^${escapeRegExp(normalized)}`);
      const [exact, matches] = await Promise.all([
        UserModel.findOne({ email: normalized }).lean(),
        UserModel.find({ email: { $regex: pattern } })
          .sort({ email: 1 })
          .limit(limit)
          .lean(),
      ]);
      const rest = matches.filter((doc) => exact === null || doc._id !== exact._id);
      const ordered = exact ? [exact, ...rest] : rest;
      return ordered.slice(0, limit).map(userDocToDomain);
    },
  };
}