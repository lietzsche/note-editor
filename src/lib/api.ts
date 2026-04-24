type ApiSuccess<T> = {
  data: T;
};

type ApiFailure<T = unknown> = {
  error: {
    code: string;
    message: string;
  };
  data?: T;
};

export class ApiError<T = unknown> extends Error {
  code: string;
  data?: T;

  constructor(code: string, message: string, data?: T) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}

async function request<T, E = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json() as ApiSuccess<T> | ApiFailure<E>;
  if (!res.ok) {
    if ("error" in json) {
      throw new ApiError(json.error.code, json.error.message, json.data);
    }
    throw new ApiError("UNKNOWN", "요청에 실패했습니다.");
  }

  if ("error" in json) {
    throw new ApiError(json.error.code, json.error.message, json.data);
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
  admin: {
    listUsers: ({ search, limit }: { search?: string; limit?: number } = {}) => {
      const params = new URLSearchParams();
      if (search?.trim()) params.set("search", search.trim());
      if (limit) params.set("limit", String(limit));
      const qs = params.toString();
      return request<AdminUser[]>(`/api/admin/users${qs ? `?${qs}` : ""}`);
    },
    resetPassword: (userId: string) =>
      request<AdminPasswordResetResult>(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
      }),
    listPasswordResetAudit: (limit?: number) => {
      const qs = typeof limit === "number" ? `?limit=${limit}` : "";
      return request<AdminPasswordResetAuditEntry[]>(`/api/admin/audit/password-resets${qs}`);
    },
  },

  groups: {
    list: () =>
      request<{ id: string; name: string; position: number }[]>("/api/groups"),
    create: (name: string) =>
      request<{ id: string; name: string; position: number }>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    update: (id: string, name: string) =>
      request<{ id: string; name: string; position: number }>(`/api/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),
    reorder: (orderedGroupIds: string[]) =>
      request<{ orderedGroupIds: string[] }>("/api/groups/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedGroupIds }),
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
      data: {
        title?: string;
        content?: string;
        group_id?: string | null;
        updated_at?: string;
        force?: boolean;
      }
    ) =>
      request<Note, Note>(`/api/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    reorder: (
      orderedNoteIds: string[],
      scope?: { type: "group"; group_id: string }
    ) =>
      request<{ orderedNoteIds: string[]; scope?: { type: "group"; group_id: string } }>("/api/notes/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedNoteIds, scope }),
      }),
    moveGroup: (id: string, group_id: string | null) =>
      request<Note>(`/api/notes/${id}/group`, {
        method: "PATCH",
        body: JSON.stringify({ group_id }),
      }),
    delete: (id: string) =>
      request<void>(`/api/notes/${id}`, { method: "DELETE" }),
    share: {
      activate: (id: string, expiresAt?: string) =>
        request<{
          share_token: string;
          is_active: boolean;
          expires_at: string | null;
          access_count: number;
          share_url: string;
        }>(`/api/notes/${id}/share`, {
          method: "POST",
          body: JSON.stringify({ expires_at: expiresAt }),
        }),
      deactivate: (id: string) =>
        request<void>(`/api/notes/${id}/share`, { method: "DELETE" }),
      get: (id: string) =>
        request<{
          share_token: string | null;
          is_active: boolean;
          expires_at: string | null;
          access_count: number;
          share_url: string | null;
        }>(`/api/notes/${id}/share`),
    },
  },
  shared: {
    get: (shareToken: string) =>
      request<SharedNote>(`/api/shared/${shareToken}`),
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

export type SharedNote = Pick<Note, "title" | "content" | "updated_at"> & {
  shared: true;
};

export type Group = {
  id: string;
  name: string;
  position: number;
};

export type AdminUser = {
  id: string;
  username: string;
  created_at: string;
};

export type AdminPasswordResetResult = {
  userId: string;
  username: string;
  tempPassword: string;
  resetAt: string;
  resetBy: string;
};

export type AdminPasswordResetAuditEntry = {
  id: string;
  admin_user_id: string;
  admin_username: string;
  target_user_id: string;
  target_username: string;
  reset_mode: string;
  created_at: string;
};
