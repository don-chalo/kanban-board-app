import mongoose from "mongoose";
import { ErrorRequestHandler } from "express";
import { DomainError, DomainErrorCode } from "../domain/errors";

export type ApiErrorCode = DomainErrorCode | "unknown_actor" | "validation";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unknown_actor: 401,
  validation: 400,
  unauthorized: 403,
  not_found: 404,
  invalid_transition: 409,
  board_not_done: 409,
  board_not_in_progress: 409,
  read_only: 409,
  member_required: 400,
  duplicate_member: 400,
  not_associated: 400,
  cannot_modify_creator: 400,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError || err instanceof DomainError) {
    const code = err.code;
    res.status(HTTP_STATUS_BY_CODE[code]).json({ error: { code, message: err.message } });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: { code: "validation", message: err.message } });
    return;
  }
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    (err as { type?: unknown }).type === "entity.parse.failed"
  ) {
    res.status(400).json({ error: { code: "bad_json", message: "Malformed request body" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
};