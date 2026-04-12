type ApiSuccess<T> = {
  data: T;
};

type ApiFailure = {
  error: {
    code: string;
    message: string;
  };
};

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json() as ApiSuccess<T> | ApiFailure;
  if (!res.ok) {
    throw new Error("error" in json ? json.error.message : "요청에 실패했습니다.");
  }

  if (!("data" in json)) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }

  return json.data;
}

export const api = {
  auth: {
    signup: (username: string, password: string) =>
      request<{ username: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    login: (username: string, password: string) =>
      request<{ username: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request<void>("/api/auth/logout", { method: "POST" }),
    me: () =>
      request<{ username: string }>("/api/auth/me"),
  },

  groups: {
    list: () =>
      request<{ id: string; name: string; position: number }[]>("/api/groups"),
    create: (name: string) =>
      request<{ id: string; name: string; position: number }>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) =>
      request<void>(`/api/groups/${id}`, { method: "DELETE" }),
  },

  notes: {
    list: (groupId?: string) => {
      const qs = groupId ? `?group_id=${encodeURIComponent(groupId)}` : "";
      return request<Note[]>(`/api/notes${qs}`);
    },
    get: (id: string) => request<Note>(`/api/notes/${id}`),
    create: (data: { title?: string; content?: string; group_id?: string }) =>
      request<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: { title?: string; content?: string; group_id?: string | null }
    ) =>
      request<Note>(`/api/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    reorder: (orderedNoteIds: string[]) =>
      request<{ orderedNoteIds: string[] }>("/api/notes/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedNoteIds }),
      }),
    delete: (id: string) =>
      request<void>(`/api/notes/${id}`, { method: "DELETE" }),
  },
};

export type Note = {
  id: string;
  title: string;
  content: string;
  group_id: string | null;
  sort_order: number;
  updated_at: string;
};

export type Group = {
  id: string;
  name: string;
  position: number;
};
