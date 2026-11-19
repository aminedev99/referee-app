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
  Team,
  User,
} from "./types";

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

const ERROR_TRANSLATIONS: Record<string, string> = {
  "Unauthorized": "Non autorisé. Veuillez vous reconnecter.",
  "Invalid credentials": "Email ou mot de passe incorrect.",
  "Admin access required": "Accès administrateur requis.",
  "Referee access required": "Accès arbitre requis.",
  "Not authenticated": "Vous n'êtes pas authentifié.",
  "Incorrect email or password": "Email ou mot de passe incorrect.",
  "User account is deactivated": "Ce compte utilisateur est désactivé.",
  "User account not found": "Compte utilisateur introuvable.",
  "User not found": "Utilisateur introuvable.",
  "Referee profile not found for this user": "Profil d'arbitre introuvable pour cet utilisateur.",
  "Current password is incorrect": "Le mot de passe actuel est incorrect.",
  "Current password is required": "Le mot de passe actuel est requis.",
  "Password must be at least 8 characters long": "Le mot de passe doit comporter au moins 8 caractères.",
  "Password must be at least 8 characters": "Le mot de passe doit comporter au moins 8 caractères.",
  "New password must be at least 8 characters long": "Le nouveau mot de passe doit comporter au moins 8 caractères.",
  "New password must be at least 8 characters": "Le nouveau mot de passe doit comporter au moins 8 caractères.",
  "Phone number is required": "Le numéro de téléphone est requis.",
  "Referee name is required": "Le nom de l'arbitre est requis.",
  "Referee not found": "Arbitre introuvable.",
  "Referee or associated user account not found": "Arbitre ou compte utilisateur associé introuvable.",
  "Referee has assignments, deactivate instead": "L'arbitre a des désignations associées, veuillez le désactiver à la place.",
  "Team not found": "Équipe introuvable.",
  "Invalid home or away team ID": "Identifiant d'équipe domicile ou extérieure invalide.",
  "Away team must differ from home team": "L'équipe à domicile et l'équipe à l'extérieur doivent être différentes.",
  "Home team and away team cannot be the same": "L'équipe à domicile et l'équipe à l'extérieur doivent être différentes.",
  "Invalid teams selected": "Équipes sélectionnées invalides.",
  "Match not found": "Match introuvable.",
  "Associated match not found": "Match associé introuvable.",
  "Match date is required": "La date du match est requise.",
  "Match date must be in the future": "La date du match doit être ultérieure à aujourd'hui.",
  "Invalid match date or time format": "Format de date ou d'heure invalide.",
  "Cannot edit past matches": "Impossible de modifier un match déjà passé.",
  "Cannot edit a cancelled match": "Impossible de modifier un match annulé.",
  "At least one referee assignment is required": "Au moins une désignation d'arbitre est requise.",
  "Duplicate referee in assignments is not allowed": "Un même arbitre ne peut pas être désigné plusieurs fois pour le même match.",
  "Paying team must be either home or away team": "L'équipe payeuse doit être l'équipe domicile ou extérieure.",
  "Indemnity must be greater than 0": "L'indemnité doit être supérieure à 0 DH.",
  "Assignment not found": "Désignation introuvable.",
  "Assignment is already confirmed": "Cette désignation est déjà confirmée.",
  "Assignment is already refused": "Cette désignation a déjà été refusée.",
  "Cannot answer an assignment for a past match": "Impossible de répondre pour un match déjà passé.",
  "Cannot answer an assignment for a cancelled match": "Impossible de répondre pour un match annulé.",
  "Too close to the match, contact the administration": "Trop proche du match (moins de 24h), veuillez contacter l'administration.",
  "Cannot delete assignment that has an issued receipt": "Impossible de supprimer une désignation ayant déjà un reçu émis.",
  "Cannot delete assignment with existing receipt": "Impossible de supprimer une désignation ayant déjà un reçu émis.",
  "Cannot remove assignment that already has an issued receipt": "Impossible de retirer une désignation ayant déjà un reçu émis.",
  "Cannot change function or indemnity for an assignment with an issued receipt": "Impossible de modifier la fonction ou l'indemnité d'une désignation ayant déjà un reçu.",
  "Reminder already sent in the last 12 hours. Please wait before reminding again.": "Rappel déjà envoyé au cours des 12 dernières heures. Veuillez patienter avant de relancer.",
  "Reminder already sent within the last 12 hours": "Rappel déjà envoyé au cours des 12 dernières heures. Veuillez patienter avant de relancer.",
  "Reminder can only be sent for pending assignments": "Les rappels ne peuvent être envoyés que pour les désignations en attente.",
  "Can only remind pending assignments": "Les rappels ne peuvent être envoyés que pour les désignations en attente.",
  "Receipt not found for this assignment": "Aucun reçu trouvé pour cette désignation.",
  "Receipt can only be generated for confirmed assignments": "Le reçu ne peut être généré que pour les désignations confirmées.",
  "Can only create receipts for confirmed assignments": "Le reçu ne peut être généré que pour les désignations confirmées.",
  "Receipt PDF not found": "PDF du reçu introuvable.",
  "Not authorized to access this receipt": "Non autorisé à accéder à ce reçu.",
  "Not authorized to download this receipt": "Non autorisé à télécharger ce reçu.",
  "Failed to download receipt PDF": "Échec du téléchargement du reçu PDF.",
  "Notification not found": "Notification introuvable.",
  "Invalid or expired token": "Jeton de session invalide ou expiré.",
  "Invalid token payload": "Contenu de session invalide.",
  "Internal Server Error": "Une erreur interne du serveur est survenue.",
  "Not Found": "Ressource introuvable.",
  "Bad Request": "Requête invalide.",
  "Forbidden": "Action non autorisée.",
};

export function translateErrorMessage(raw: string): string {
  if (!raw) return "Une erreur inattendue est survenue";
  const trimmed = raw.trim();

  if (ERROR_TRANSLATIONS[trimmed]) {
    return ERROR_TRANSLATIONS[trimmed];
  }

  // Dynamic regex matches
  const conflictMatch = trimmed.match(/(.+) is already assigned to (.+) vs (.+) at (.+)/i);
  if (conflictMatch) {
    return `${conflictMatch[1]} est déjà désigné(e) pour le match ${conflictMatch[2]} vs ${conflictMatch[3]} à ${conflictMatch[4]}.`;
  }

  const licMatch = trimmed.match(/Referee with license number (.+) already exists/i);
  if (licMatch) {
    return `Un arbitre avec le numéro de licence ${licMatch[1]} existe déjà.`;
  }

  const emailMatch = trimmed.match(/User with email (.+) already exists/i);
  if (emailMatch) {
    return `Un compte avec l'adresse email ${emailMatch[1]} existe déjà.`;
  }

  const teamMatch = trimmed.match(/Team with name (.+) already exists/i);
  if (teamMatch) {
    return `Une équipe avec le nom ${teamMatch[1]} existe déjà.`;
  }

  const refNotFound = trimmed.match(/Referee (.+) not found/i);
  if (refNotFound) {
    return `Arbitre ${refNotFound[1]} introuvable.`;
  }

  if (trimmed.toLowerCase().includes("invalid moroccan phone number")) {
    return "Numéro de téléphone marocain invalide (ex: 06 12 34 56 78 ou +212612345678).";
  }

  if (trimmed.toLowerCase().startsWith("request failed:")) {
    const status = trimmed.replace(/^request failed:\s*/i, "");
    return `Échec de la requête: ${status}`;
  }

  return trimmed;
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
    throw new Error(translateErrorMessage("Unauthorized"));
  }

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (typeof errJson.detail === "string") {
        errorMsg = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorMsg = errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ");
      } else if (errJson.message) {
        errorMsg = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(translateErrorMessage(errorMsg));
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  async login(formData: FormData | URLSearchParams): Promise<LoginResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const rawMsg = typeof err.detail === "string" ? err.detail : "Invalid credentials";
      throw new Error(translateErrorMessage(rawMsg));
    }

    const data: LoginResponse = await res.json();
    setStoredToken(data.access_token);
    if (data.role) localStorage.setItem("referee_role", data.role);
    if (data.user) localStorage.setItem("referee_user", JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async updateAuthMe(data: { full_name?: string; phone?: string }): Promise<User> {
    return request<User>("/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return request<{ message: string }>("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    return request<Team[]>("/teams");
  },

  async createTeam(input: CreateTeamInput): Promise<Team> {
    return request<Team>("/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateTeam(id: string, input: Partial<CreateTeamInput>): Promise<Team> {
    return request<Team>(`/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  // Referees
  async getReferees(q?: string, active?: boolean): Promise<Referee[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (active !== undefined) params.set("active", String(active));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Referee[]>(`/referees${qs}`);
  },

  async getRefereeById(id: string): Promise<Referee> {
    return request<Referee>(`/referees/${id}`);
  },

  async createReferee(input: CreateRefereeInput): Promise<Referee> {
    return request<Referee>("/referees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateReferee(id: string, input: UpdateRefereeInput): Promise<Referee> {
    return request<Referee>(`/referees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async resetRefereePassword(id: string, password: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/referees/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  },

  async deactivateReferee(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/referees/${id}/deactivate`, {
      method: "POST",
    });
  },

  async activateReferee(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/referees/${id}/activate`, {
      method: "POST",
    });
  },

  async deleteReferee(id: string): Promise<void> {
    return request<void>(`/referees/${id}`, {
      method: "DELETE",
    });
  },

  // Matches
  async getMatches(scope?: string): Promise<Match[]> {
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    return request<Match[]>(`/matches${qs}`);
  },

  async getMatchById(id: string): Promise<Match> {
    return request<Match>(`/matches/${id}`);
  },

  async createMatch(input: CreateMatchInput): Promise<Match> {
    return request<Match>("/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateMatch(id: string, input: Partial<CreateMatchInput>): Promise<Match> {
    return request<Match>(`/matches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async cancelMatch(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/matches/${id}/cancel`, {
      method: "POST",
    });
  },

  // Assignments
  async getAssignments(status?: string): Promise<Assignment[]> {
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return request<Assignment[]>(`/assignments${query}`);
  },

  async deleteAssignment(id: string): Promise<void> {
    return request<void>(`/assignments/${id}`, {
      method: "DELETE",
    });
  },

  async remindAssignment(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/assignments/${id}/remind`, {
      method: "POST",
    });
  },

  // Referee me routes
  async getMeAssignments(tab?: string): Promise<Assignment[]> {
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    return request<Assignment[]>(`/me/assignments${qs}`);
  },

  async getMeAssignmentById(id: string): Promise<Assignment> {
    return request<Assignment>(`/me/assignments/${id}`);
  },

  async confirmAssignment(id: string): Promise<Assignment> {
    return request<Assignment>(`/me/assignments/${id}/confirm`, {
      method: "POST",
    });
  },

  async refuseAssignment(id: string, reason?: string): Promise<Assignment> {
    return request<Assignment>(`/me/assignments/${id}/refuse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },

  async getMeProfile(): Promise<Referee> {
    return request<Referee>("/me/profile");
  },

  async getMeStats(): Promise<RefereeStats> {
    return request<RefereeStats>("/me/stats");
  },

  // Admin stats
  async getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>("/admin/stats");
  },

  // Receipts
  async createReceipt(assignmentId: string): Promise<Receipt> {
    return request<Receipt>(`/assignments/${assignmentId}/receipt`, {
      method: "POST",
    });
  },

  getReceiptPdfUrl(assignmentId: string): string {
    return `${BASE_URL}/assignments/${assignmentId}/receipt.pdf`;
  },

  async downloadReceiptPdf(assignmentId: string, filename: string = "receipt.pdf"): Promise<void> {
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
      throw new Error(translateErrorMessage(msg));
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
    return request<Notification[]>("/notifications");
  },

  async markNotificationAsRead(id: string): Promise<Notification> {
    return request<Notification>(`/notifications/${id}/read`, {
      method: "POST",
    });
  },

  async markAllNotificationsAsRead(): Promise<Notification[]> {
    return request<Notification[]>("/notifications/read-all", {
      method: "POST",
    });
  },
};
