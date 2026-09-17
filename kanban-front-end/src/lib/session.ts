export interface UserIdentity {
  id: string;
  email: string;
}

const STORAGE_KEY = "todo.identity";

export function saveIdentity(identity: UserIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function readIdentity(): UserIdentity | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserIdentity;
  } catch {
    return null;
  }
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}