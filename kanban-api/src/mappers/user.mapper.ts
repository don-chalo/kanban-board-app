import { User } from "../domain/entities";
import { UserDoc } from "../models";

export function userDocToDomain(doc: UserDoc): User {
  return { id: doc._id, email: doc.email };
}

export function userToDoc(user: User): UserDoc {
  return { _id: user.id, email: user.email };
}