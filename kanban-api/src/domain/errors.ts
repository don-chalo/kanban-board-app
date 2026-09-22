export type DomainErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_transition"
  | "board_not_done"
  | "board_not_in_progress"
  | "read_only"
  | "member_required"
  | "duplicate_member"
  | "cannot_modify_creator"
  | "validation"
  | "not_associated";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}