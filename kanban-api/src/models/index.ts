import { Schema, model } from "mongoose";

export interface UserDoc {
  _id: string;
  email: string;
}

export interface BoardDoc {
  _id: string;
  title: string;
  description: string;
  creator: string;
  owner: string;
  associated: string[];
  state: string;
  previousState: string | null;
}

export interface TaskDoc {
  _id: string;
  boardId: string;
  creator: string;
  owner: string;
  title: string;
  description: string;
  state: string;
  previousState: string | null;
  priority?: string;
  startedAt?: string | null;
  storyPoints?: number | null;
}

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true },
  },
  { versionKey: false, collection: "users" },
);
userSchema.index({ email: 1 }, { unique: true });

const boardSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    creator: { type: String, required: true },
    owner: { type: String, required: true },
    associated: { type: [String], default: [] },
    state: { type: String, required: true },
    previousState: { type: String, default: null },
  },
  { versionKey: false, collection: "boards" },
);
boardSchema.index({ creator: 1 });
boardSchema.index({ owner: 1 });
boardSchema.index({ associated: 1 });

const taskSchema = new Schema(
  {
    _id: { type: String, required: true },
    boardId: { type: String, required: true },
    creator: { type: String, required: true },
    owner: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    state: { type: String, required: true },
    previousState: { type: String, default: null },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    startedAt: { type: String, default: null },
    storyPoints: { type: Number, enum: [1, 2, 3, 5, 8, 13], default: null },
  },
  { versionKey: false, collection: "tasks" },
);
taskSchema.index({ boardId: 1 });

export const UserModel = model<UserDoc>("User", userSchema);
export const BoardModel = model<BoardDoc>("Board", boardSchema);
export const TaskModel = model<TaskDoc>("Task", taskSchema);