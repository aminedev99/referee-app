import {
  AdminStats,
  Assignment,
  CreateMatchInput,
  CreateRefereeInput,
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
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("referee_token");
  localStorage.removeItem("referee_role");
  localStorage.removeItem("referee_user");
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
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.replace("/login");
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

  return res.json();
}

export const api = {
  // Auth
  async login(formData: FormData | URLSearchParams): Promise<LoginResponse> {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      // In mock mode, passwords are pre-configured or default
      const username = (formData.get("username") as string)?.trim().toLowerCase();

      if (username === "admin@referee.local" || username.includes("admin")) {
        const user: User = {
          id: "user-admin",
          email: "admin@referee.local",
          name: "System Admin",
          role: "admin",
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
          referee_id: "ref-1",
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
        ? { id: "user-admin", email: "admin@referee.local", name: "System Admin", role: "admin" }
        : {
            id: "user-ref-1",
            email: "y.elamrani@mail.ma",
            name: "Youssef El Amrani",
            role: "referee",
            referee_id: "ref-1",
          };
    }
    return request<User>("/auth/me");
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    if (IS_MOCK) return mockStore.getTeams();
    return request<Team[]>("/teams");
  },

  async createTeam(input: CreateTeamInput): Promise<Team> {
    if (IS_MOCK) return mockStore.createTeam(input);
    return request<Team[]>("/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }) as unknown as Promise<Team>;
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
  async getReferees(q?: string): Promise<Referee[]> {
    if (IS_MOCK) return mockStore.getReferees(q);
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return request<Referee[]>(`/referees${query}`);
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

  // Matches
  async getMatches(): Promise<Match[]> {
    if (IS_MOCK) return mockStore.getMatches();
    return request<Match[]>("/matches");
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

  // Assignments
  async getAssignments(status?: string): Promise<Assignment[]> {
    if (IS_MOCK) return mockStore.getAssignments(status);
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return request<Assignment[]>(`/assignments${query}`);
  },

  // Referee me routes
  async getMeAssignments(): Promise<Assignment[]> {
    if (IS_MOCK) return mockStore.getMeAssignments();
    return request<Assignment[]>("/me/assignments");
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
