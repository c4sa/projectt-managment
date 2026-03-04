// Project-related types

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  message: string;
  edited?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  message: string;
  edited?: boolean;
  editedAt?: string;
  createdAt: string;
}
