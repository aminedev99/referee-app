import {
  AdminStats,
  Assignment,
  CreateMatchInput,
  CreateRefereeInput,
  UpdateRefereeInput,
  CreateTeamInput,
  LoginResponse,
  Match,
  Notification,
  Receipt,
  Referee,
  RefereeStats,
  Role,
  Team,
  User,
} from "./types";
import { mockStore } from "./mock";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const BASE_URL = "/api";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("referee_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("referee_token", token);
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `rm_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("referee_token");
  localStorage.removeItem("referee_role");
  localStorage.removeItem("referee_user");
  document.cookie = "rm_token=; path=/; max-age=0; SameSite=Lax";
}

let onUnauthorizedCallback: (() => void) | null = null;
export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearStoredToken();
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const current = window.location.pathname + window.location.search;
      window.location.replace(`/login?next=${encodeURIComponent(current)}`);
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  async login(formData: FormData | URLSearchParams): Promise<LoginResponse> {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const username = (formData.get("username") as string)?.trim().toLowerCase();

      if (username === "admin@referee.local" || username.includes("admin")) {
        const user: User = {
          id: "user-admin",
          email: "admin@referee.local",
          name: "System Admin",
          role: "admin",
          is_active: true,
        };
        const token = "mock-admin-token";
        setStoredToken(token);
        localStorage.setItem("referee_role", "admin");
        localStorage.setItem("referee_user", JSON.stringify(user));
        return { access_token: token, token_type: "bearer", role: "admin", user };
      } else {
        const user: User = {
          id: "user-ref-1",
          email: username || "y.elamrani@mail.ma",
          name: "Youssef El Amrani",
          role: "referee",
          is_active: true,
          referee_id: "ref-1",
          phone: "+212661234567",
        };
        const token = "mock-referee-token";
        setStoredToken(token);
        localStorage.setItem("referee_role", "referee");
        localStorage.setItem("referee_user", JSON.stringify(user));
        return { access_token: token, token_type: "bearer", role: "referee", user };
      }
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid credentials");
    }

    const data: LoginResponse = await res.json();
    setStoredToken(data.access_token);
    if (data.role) localStorage.setItem("referee_role", data.role);
    if (data.user) localStorage.setItem("referee_user", JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      const role = (localStorage.getItem("referee_role") as Role) || "referee";
      const cached = localStorage.getItem("referee_user");
      if (cached) return JSON.parse(cached);

      return role === "admin"
        ? { id: "user-admin", email: "admin@referee.local", name: "System Admin", role: "admin", is_active: true }
        : {
            id: "user-ref-1",
            email: "y.elamrani@mail.ma",
            name: "Youssef El Amrani",
            role: "referee",
            is_active: true,
            referee_id: "ref-1",
            phone: "+212661234567",
          };
    }
    return request<User>("/auth/me");
  },

  async updateAuthMe(data: { full_name?: string; phone?: string }): Promise<User> {
    if (IS_MOCK) return mockStore.updateAuthMe(data);
    return request<User>("/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.changePassword(data);
    return request<{ message: string }>("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    if (IS_MOCK) return mockStore.getTeams();
    return request<Team[]>("/teams");
  },

  async createTeam(input: CreateTeamInput): Promise<Team> {
    if (IS_MOCK) return mockStore.createTeam(input);
    return request<Team>("/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateTeam(id: string, input: Partial<CreateTeamInput>): Promise<Team> {
    if (IS_MOCK) return mockStore.updateTeam(id, input);
    return request<Team>(`/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  // Referees
  async getReferees(q?: string, active?: boolean): Promise<Referee[]> {
    if (IS_MOCK) return mockStore.getReferees(q, active);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (active !== undefined) params.set("active", String(active));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Referee[]>(`/referees${qs}`);
  },

  async getRefereeById(id: string): Promise<Referee> {
    if (IS_MOCK) return mockStore.getRefereeById(id);
    return request<Referee>(`/referees/${id}`);
  },

  async createReferee(input: CreateRefereeInput): Promise<Referee> {
    if (IS_MOCK) return mockStore.createReferee(input);
    return request<Referee>("/referees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateReferee(id: string, input: UpdateRefereeInput): Promise<Referee> {
    if (IS_MOCK) return mockStore.updateReferee(id, input);
    return request<Referee>(`/referees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async resetRefereePassword(id: string, password: string): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.resetRefereePassword(id, password);
    return request<{ message: string }>(`/referees/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  },

  async deactivateReferee(id: string): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.deactivateReferee(id);
    return request<{ message: string }>(`/referees/${id}/deactivate`, {
      method: "POST",
    });
  },

  async activateReferee(id: string): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.activateReferee(id);
    return request<{ message: string }>(`/referees/${id}/activate`, {
      method: "POST",
    });
  },

  async deleteReferee(id: string): Promise<void> {
    if (IS_MOCK) return mockStore.deleteReferee(id);
    return request<void>(`/referees/${id}`, {
      method: "DELETE",
    });
  },

  // Matches
  async getMatches(scope?: string): Promise<Match[]> {
    if (IS_MOCK) return mockStore.getMatches(scope);
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    return request<Match[]>(`/matches${qs}`);
  },

  async getMatchById(id: string): Promise<Match> {
    if (IS_MOCK) return mockStore.getMatchById(id);
    return request<Match>(`/matches/${id}`);
  },

  async createMatch(input: CreateMatchInput): Promise<Match> {
    if (IS_MOCK) return mockStore.createMatch(input);
    return request<Match>("/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateMatch(id: string, input: Partial<CreateMatchInput>): Promise<Match> {
    if (IS_MOCK) return mockStore.updateMatch(id, input);
    return request<Match>(`/matches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async cancelMatch(id: string): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.cancelMatch(id);
    return request<{ message: string }>(`/matches/${id}/cancel`, {
      method: "POST",
    });
  },

  // Assignments
  async getAssignments(status?: string): Promise<Assignment[]> {
    if (IS_MOCK) return mockStore.getAssignments(status);
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return request<Assignment[]>(`/assignments${query}`);
  },

  async deleteAssignment(id: string): Promise<void> {
    if (IS_MOCK) return mockStore.deleteAssignment(id);
    return request<void>(`/assignments/${id}`, {
      method: "DELETE",
    });
  },

  async remindAssignment(id: string): Promise<{ message: string }> {
    if (IS_MOCK) return mockStore.remindAssignment(id);
    return request<{ message: string }>(`/assignments/${id}/remind`, {
      method: "POST",
    });
  },

  // Referee me routes
  async getMeAssignments(tab?: string): Promise<Assignment[]> {
    if (IS_MOCK) return mockStore.getMeAssignments(tab);
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    return request<Assignment[]>(`/me/assignments${qs}`);
  },

  async getMeAssignmentById(id: string): Promise<Assignment> {
    if (IS_MOCK) return mockStore.getMeAssignmentById(id);
    return request<Assignment>(`/me/assignments/${id}`);
  },

  async confirmAssignment(id: string): Promise<Assignment> {
    if (IS_MOCK) return mockStore.confirmAssignment(id);
    return request<Assignment>(`/me/assignments/${id}/confirm`, {
      method: "POST",
    });
  },

  async refuseAssignment(id: string, reason?: string): Promise<Assignment> {
    if (IS_MOCK) return mockStore.refuseAssignment(id, reason);
    return request<Assignment>(`/me/assignments/${id}/refuse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },

  async getMeProfile(): Promise<Referee> {
    if (IS_MOCK) return mockStore.getMeProfile();
    return request<Referee>("/me/profile");
  },

  async getMeStats(): Promise<RefereeStats> {
    if (IS_MOCK) return mockStore.getMeStats();
    return request<RefereeStats>("/me/stats");
  },

  // Admin stats
  async getAdminStats(): Promise<AdminStats> {
    if (IS_MOCK) return mockStore.getAdminStats();
    return request<AdminStats>("/admin/stats");
  },

  // Receipts
  async createReceipt(assignmentId: string): Promise<Receipt> {
    if (IS_MOCK) return mockStore.createReceipt(assignmentId);
    return request<Receipt>(`/assignments/${assignmentId}/receipt`, {
      method: "POST",
    });
  },

  getReceiptPdfUrl(assignmentId: string): string {
    if (IS_MOCK) {
      return "#";
    }
    return `${BASE_URL}/assignments/${assignmentId}/receipt.pdf`;
  },

  async downloadReceiptPdf(assignmentId: string, filename: string = "receipt.pdf"): Promise<void> {
    if (IS_MOCK) {
      return;
    }
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}/assignments/${assignmentId}/receipt.pdf`, {
      headers,
    });
    if (!res.ok) {
      let msg = "Failed to download receipt PDF";
      try {
        const errJson = await res.json();
        msg = errJson.detail || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    if (IS_MOCK) return mockStore.getNotifications();
    return request<Notification[]>("/notifications");
  },

  async markNotificationAsRead(id: string): Promise<Notification> {
    if (IS_MOCK) return mockStore.markNotificationAsRead(id);
    return request<Notification>(`/notifications/${id}/read`, {
      method: "POST",
    });
  },

  async markAllNotificationsAsRead(): Promise<Notification[]> {
    if (IS_MOCK) return mockStore.markAllNotificationsAsRead();
    return request<Notification[]>("/notifications/read-all", {
      method: "POST",
    });
  },
};
