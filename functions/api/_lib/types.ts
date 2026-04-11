export type Env = {
  DB: D1Database;
  AUTH_SESSION_SECRET: string;
  AUTH_SESSION_TTL_SECONDS?: string;
};

export type User = {
  id: string;
  username: string;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  group_id: string | null;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Group = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type SessionData = {
  userId: string;
  username: string;
};
