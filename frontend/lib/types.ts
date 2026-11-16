export type Role = "admin" | "referee";
export type AssignmentStatus = "pending" | "confirmed" | "refused";
export type MatchDivision = "1DV" | "2DV";
export type MatchCategory = "Men" | "Women";
export type RefereeFunction =
  | "Main referee"
  | "Second referee"
  | "Scorer"
  | "Timekeeper"
  | "24s operator";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  referee_id?: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
}

export interface Referee {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  category?: string; // e.g. "National Referee"
  matches_count: number;
  acceptance_rate: number;
  assigned_count?: number;
  confirmed_count?: number;
  refused_count?: number;
}

export interface Assignment {
  id: string;
  match_id: string;
  match?: Match;
  referee_id: string;
  referee?: Referee;
  referee_function: RefereeFunction | string;
  indemnity: number;
  paying_team_id: string;
  paying_team?: Team;
  status: AssignmentStatus;
  refusal_reason?: string;
  receipt?: Receipt;
  created_at?: string;
}

export interface Match {
  id: string;
  match_number?: string; // e.g. "2026-88"
  home_team_id: string;
  away_team_id: string;
  home_team: Team;
  away_team: Team;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:mm
  city: string;
  venue: string;
  division: MatchDivision;
  category: MatchCategory;
  assignments: Assignment[];
}

export interface Receipt {
  id: string;
  assignment_id: string;
  receipt_number: string; // e.g. "2026-0148"
  issued_at: string; // e.g. "2026-11-16"
  amount: number;
  pdf_url?: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  type?: "confirmed" | "refused" | "assignment" | "receipt";
}

export interface RefereeStats {
  total_assigned: number;
  confirmed: number;
  refused: number;
  acceptance_rate: number; // e.g. 83
  past_matches?: {
    id: string;
    home_team: string;
    away_team: string;
    date: string;
    division: string;
    status: AssignmentStatus;
    indemnity: number;
  }[];
}

export interface AdminStats {
  upcoming_matches: number;
  pending_responses: number;
  refused_this_month: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  user: User;
}

export interface CreateMatchInput {
  home_team_id: string;
  away_team_id: string;
  date: string;
  time: string;
  city: string;
  venue: string;
  division: MatchDivision;
  category: MatchCategory;
  assignments: {
    referee_id: string;
    referee_function: string;
    indemnity: number;
    paying_team_id: string;
  }[];
}

export interface CreateRefereeInput {
  name: string;
  email: string;
  phone: string;
  license_number: string;
  temporary_password?: string;
}

export interface CreateTeamInput {
  name: string;
  city: string;
}
