import { User } from './users';

export interface CouncilMember {
  userId: number;
  roleInCouncil: string;
  user: User;
}

export interface UpdateCouncilDto {
  members: {
    userId: number;
    roleInCouncil: string;
  }[];
}
