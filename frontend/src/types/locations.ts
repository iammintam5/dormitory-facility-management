import { User } from './users';

export type DormBlock = {
  id: number;
  code: string;
  name: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type Floor = {
  id: number;
  blockId: number;
  floorNumber: number;
  name?: string | null;
  block?: DormBlock;
};

export type Room = {
  id: number;
  floorId: number;
  roomCode: string;
  capacity?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  floor?: Floor & {
    block?: DormBlock;
  };
  roomStudents?: RoomStudentAssignment[];
};

export type RoomStudentAssignment = {
  id: number;
  roomId?: number;
  studentId?: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  student: User;
};
