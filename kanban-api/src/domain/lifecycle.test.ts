import { describe, expect, it } from "vitest";
import { LifecycleState } from "./entities";
import { allowedTransitions, canTransition, isTerminal } from "./lifecycle";

describe("canTransition", () => {
  it("allows To Do -> In Progress", () => {
    expect(canTransition(LifecycleState.ToDo, LifecycleState.InProgress, null)).toBe(true);
  });

  it("rejects To Do -> Done (skipping In Progress)", () => {
    expect(canTransition(LifecycleState.ToDo, LifecycleState.Done, null)).toBe(false);
  });

  it("allows In Progress -> Done", () => {
    expect(canTransition(LifecycleState.InProgress, LifecycleState.Done, null)).toBe(true);
  });

  it("rejects In Progress -> To Do (backtracking)", () => {
    expect(canTransition(LifecycleState.InProgress, LifecycleState.ToDo, null)).toBe(false);
  });

  it("rejects blocking from To Do but allows blocking from In Progress", () => {
    expect(canTransition(LifecycleState.ToDo, LifecycleState.Blocked, null)).toBe(false);
    expect(canTransition(LifecycleState.InProgress, LifecycleState.Blocked, null)).toBe(true);
  });

  it("allows cancelling from To Do and In Progress", () => {
    expect(canTransition(LifecycleState.ToDo, LifecycleState.Cancelled, null)).toBe(true);
    expect(canTransition(LifecycleState.InProgress, LifecycleState.Cancelled, null)).toBe(true);
  });

  it("returns a blocked task only to In Progress", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.ToDo, LifecycleState.ToDo)).toBe(false);
    expect(canTransition(LifecycleState.Blocked, LifecycleState.InProgress, LifecycleState.InProgress)).toBe(true);
  });

  it("does not let a blocked task return to a different state", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.InProgress, LifecycleState.ToDo)).toBe(false);
    expect(canTransition(LifecycleState.Blocked, LifecycleState.ToDo, LifecycleState.InProgress)).toBe(false);
  });

  it("rejects cross transitions from Blocked to Done or Cancelled", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.Done, LifecycleState.InProgress)).toBe(false);
    expect(canTransition(LifecycleState.Blocked, LifecycleState.Cancelled, LifecycleState.ToDo)).toBe(false);
  });

  it("does not let a blocked task switch to Blocked again", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.Blocked, LifecycleState.ToDo)).toBe(false);
  });

  it("rejects every move with no recorded previous state", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.ToDo, null)).toBe(false);
    expect(canTransition(LifecycleState.Blocked, LifecycleState.InProgress, null)).toBe(false);
  });

  it("rejects unblocking to a corrupt previous state", () => {
    expect(canTransition(LifecycleState.Blocked, LifecycleState.Done, LifecycleState.Done)).toBe(false);
    expect(canTransition(LifecycleState.Blocked, LifecycleState.Cancelled, LifecycleState.Cancelled)).toBe(false);
  });

  it("treats Done and Cancelled as terminal", () => {
    for (const target of Object.values(LifecycleState)) {
      expect(canTransition(LifecycleState.Done, target, null)).toBe(false);
      expect(canTransition(LifecycleState.Cancelled, target, null)).toBe(false);
    }
  });
});

describe("allowedTransitions", () => {
  it("lists the next states for a To Do entity", () => {
    expect(
      allowedTransitions({ state: LifecycleState.ToDo, previousState: null }),
    ).toEqual([LifecycleState.InProgress, LifecycleState.Cancelled]);
  });

  it("lists the next states for an In Progress entity", () => {
    expect(
      allowedTransitions({ state: LifecycleState.InProgress, previousState: null }),
    ).toEqual([LifecycleState.Done, LifecycleState.Blocked, LifecycleState.Cancelled]);
  });

  it("returns only In Progress for a Blocked entity", () => {
    expect(
      allowedTransitions({ state: LifecycleState.Blocked, previousState: LifecycleState.ToDo }),
    ).toEqual([]);
    expect(
      allowedTransitions({ state: LifecycleState.Blocked, previousState: LifecycleState.InProgress }),
    ).toEqual([LifecycleState.InProgress]);
  });

  it("returns nothing for a Blocked entity with a corrupt or missing previous state", () => {
    expect(allowedTransitions({ state: LifecycleState.Blocked, previousState: null })).toEqual([]);
    expect(
      allowedTransitions({ state: LifecycleState.Blocked, previousState: LifecycleState.Done }),
    ).toEqual([]);
  });

  it("returns nothing for terminal states", () => {
    expect(allowedTransitions({ state: LifecycleState.Done, previousState: null })).toEqual([]);
    expect(
      allowedTransitions({ state: LifecycleState.Cancelled, previousState: null }),
    ).toEqual([]);
  });
});

describe("isTerminal", () => {
  it("is terminal only for Done and Cancelled", () => {
    expect(isTerminal(LifecycleState.Done)).toBe(true);
    expect(isTerminal(LifecycleState.Cancelled)).toBe(true);
    expect(isTerminal(LifecycleState.ToDo)).toBe(false);
    expect(isTerminal(LifecycleState.InProgress)).toBe(false);
    expect(isTerminal(LifecycleState.Blocked)).toBe(false);
  });
});