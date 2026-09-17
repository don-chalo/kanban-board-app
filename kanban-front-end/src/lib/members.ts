import { batchUsers, type UserId } from "./api";

export async function resolveMemberEmails(ids: UserId[]): Promise<Map<UserId, string>> {
  const unique = [...new Set(ids)];
  try {
    const users = await batchUsers(unique);
    const byId = new Map(users.map((user) => [user.id, user.email] as const));
    return new Map(unique.map((id) => [id, byId.get(id) ?? id] as const));
  } catch {
    return new Map(unique.map((id) => [id, id] as const));
  }
}