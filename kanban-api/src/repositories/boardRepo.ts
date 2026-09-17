import { Board, BoardId, UserId } from "../domain/entities";
import { boardDocToDomain, boardToDoc, taskDocToDomain, taskToDoc } from "../mappers";
import { BoardModel, TaskModel } from "../models";

export interface BoardRepository {
  loadBoardAggregate(boardId: BoardId): Promise<Board | null>;
  saveBoardAggregate(board: Board): Promise<void>;
  listBoardsForMember(userId: UserId): Promise<Board[]>;
}

export function createMongoBoardRepository(): BoardRepository {
  return {
    async loadBoardAggregate(boardId) {
      const boardDoc = await BoardModel.findById(boardId).lean();
      if (!boardDoc) return null;
      const taskDocs = await TaskModel.find({ boardId }).lean();
      return boardDocToDomain(boardDoc, taskDocs.map(taskDocToDomain));
    },

    async saveBoardAggregate(board) {
      await BoardModel.replaceOne({ _id: board.id }, boardToDoc(board), { upsert: true });

      const existingDocs = await TaskModel.find({ boardId: board.id }).select("_id").lean();
      const existingIds = new Set(existingDocs.map((doc) => doc._id));

      for (const task of board.tasks) {
        await TaskModel.replaceOne({ _id: task.id }, taskToDoc(task), { upsert: true });
      }

      const removedIds = [...existingIds].filter(
        (id) => !board.tasks.some((task) => task.id === id),
      );
      if (removedIds.length > 0) {
        await TaskModel.deleteMany({ _id: { $in: removedIds } });
      }
    },

    async listBoardsForMember(userId) {
      const docs = await BoardModel.find({
        $or: [{ creator: userId }, { owner: userId }, { associated: userId }],
      }).lean();
      return docs.map((doc) => boardDocToDomain(doc));
    },
  };
}