import {
  AdminStats,
  Assignment,
  CreateMatchInput,
  CreateRefereeInput,
  CreateTeamInput,
  Match,
  Notification,
  Receipt,
  Referee,
  RefereeStats,
  Team,
  UpdateRefereeInput,
  User,
} from "./types";

export function normalizeMoroccanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, "");
  if (cleaned.startsWith("00212")) {
    cleaned = "+212" + cleaned.slice(5);
  } else if (cleaned.startsWith("0")) {
    cleaned = "+212" + cleaned.slice(1);
  }
  if (!/^\+212[67]\d{8}$/.test(cleaned)) {
    throw new Error("Invalid Moroccan phone number. Format: 06XXXXXXXX or 07XXXXXXXX");
  }
  return cleaned;
}

// Moroccan basketball teams
export const initialTeams: Team[] = [
  { id: "team-1", name: "Wydad AC", city: "Casablanca" },
  { id: "team-2", name: "Raja CA", city: "Casablanca" },
  { id: "team-3", name: "FUS Rabat", city: "Rabat" },
  { id: "team-4", name: "AS Salé", city: "Salé" },
  { id: "team-5", name: "IR Tanger", city: "Tanger" },
  { id: "team-6", name: "KAC Kénitra", city: "Kénitra" },
];

export const initialReferees: Referee[] = [
  {
    id: "ref-1",
    user_id: "user-ref-1",
    name: "Youssef El Amrani",
    email: "y.elamrani@mail.ma",
    phone: "+212661234567",
    license_number: "1104",
    category: "National Referee",
    is_active: true,
    matches_count: 24,
    acceptance_rate: 83,
    assigned_count: 24,
    confirmed_count: 20,
    refused_count: 4,
  },
  {
    id: "ref-2",
    user_id: "user-ref-2",
    name: "Karim Benali",
    email: "k.benali@mail.ma",
    phone: "+212662345678",
    license_number: "1088",
    category: "Regional Referee",
    is_active: true,
    matches_count: 18,
    acceptance_rate: 78,
    assigned_count: 18,
    confirmed_count: 14,
    refused_count: 4,
  },
  {
    id: "ref-3",
    user_id: "user-ref-3",
    name: "Sara Idrissi",
    email: "s.idrissi@mail.ma",
    phone: "+212663456789",
    license_number: "1105",
    category: "National Referee",
    is_active: true,
    matches_count: 15,
    acceptance_rate: 92,
    assigned_count: 15,
    confirmed_count: 14,
    refused_count: 1,
  },
  {
    id: "ref-4",
    user_id: "user-ref-4",
    name: "Omar Tazi",
    email: "o.tazi@mail.ma",
    phone: "+212664567890",
    license_number: "1120",
    category: "Regional Referee",
    is_active: true,
    matches_count: 12,
    acceptance_rate: 75,
    assigned_count: 12,
    confirmed_count: 9,
    refused_count: 3,
  },
  {
    id: "ref-5",
    user_id: "user-ref-5",
    name: "Hassan Mansouri",
    email: "h.mansouri@mail.ma",
    phone: "+212665123456",
    license_number: "1050",
    category: "Regional Referee",
    is_active: false,
    matches_count: 5,
    acceptance_rate: 60,
    assigned_count: 5,
    confirmed_count: 3,
    refused_count: 2,
  },
];

export const initialReceipts: Receipt[] = [
  {
    id: "rcpt-1",
    assignment_id: "asg-past-1",
    receipt_number: "2026-0001",
    issued_at: "16 Nov 2026",
    amount: 400,
    pdf_url: "#",
  },
  {
    id: "rcpt-2",
    assignment_id: "asg-past-2",
    receipt_number: "2026-0002",
    issued_at: "09 Nov 2026",
    amount: 350,
    pdf_url: "#",
  },
];

export const initialMatches: Match[] = [
  {
    id: "match-1",
    match_number: "2026-88",
    status: "scheduled",
    home_team_id: "team-1",
    away_team_id: "team-2",
    home_team: initialTeams[0],
    away_team: initialTeams[1],
    date: "2026-11-22",
    time: "18:30",
    city: "Casablanca",
    venue: "Salle Mohammed V",
    division: "1DV",
    category: "Men",
    assignments: [],
  },
  {
    id: "match-2",
    match_number: "2026-89",
    status: "scheduled",
    home_team_id: "team-3",
    away_team_id: "team-4",
    home_team: initialTeams[2],
    away_team: initialTeams[3],
    date: "2026-11-23",
    time: "16:00",
    city: "Rabat",
    venue: "Salle Moulay Abdallah",
    division: "2DV",
    category: "Women",
    assignments: [],
  },
  {
    id: "match-3",
    match_number: "2026-90",
    status: "scheduled",
    home_team_id: "team-5",
    away_team_id: "team-6",
    home_team: initialTeams[4],
    away_team: initialTeams[5],
    date: "2026-11-26",
    time: "19:00",
    city: "Tanger",
    venue: "Salle Ziatin",
    division: "1DV",
    category: "Men",
    assignments: [],
  },
  {
    id: "match-cancelled-1",
    match_number: "2026-95",
    status: "cancelled",
    home_team_id: "team-1",
    away_team_id: "team-4",
    home_team: initialTeams[0],
    away_team: initialTeams[3],
    date: "2026-11-28",
    time: "17:00",
    city: "Casablanca",
    venue: "Salle Mohammed V",
    division: "1DV",
    category: "Men",
    assignments: [],
  },
  {
    id: "match-past-1",
    match_number: "2026-75",
    status: "scheduled",
    home_team_id: "team-2",
    away_team_id: "team-3",
    home_team: initialTeams[1],
    away_team: initialTeams[2],
    date: "2026-11-15",
    time: "17:00",
    city: "Casablanca",
    venue: "Salle Mohammed V",
    division: "1DV",
    category: "Men",
    assignments: [],
  },
];

export const initialAssignments: Assignment[] = [
  {
    id: "asg-1",
    match_id: "match-1",
    referee_id: "ref-1",
    referee_function: "Main referee",
    indemnity: 400,
    paying_team_id: "team-1",
    status: "pending",
    needs_attention: false,
  },
  {
    id: "asg-2",
    match_id: "match-1",
    referee_id: "ref-2",
    referee_function: "Second referee",
    indemnity: 300,
    paying_team_id: "team-2",
    status: "confirmed",
  },
  {
    id: "asg-3",
    match_id: "match-2",
    referee_id: "ref-1",
    referee_function: "Second referee",
    indemnity: 300,
    paying_team_id: "team-3",
    status: "pending",
  },
  {
    id: "asg-4",
    match_id: "match-2",
    referee_id: "ref-2",
    referee_function: "Main referee",
    indemnity: 400,
    paying_team_id: "team-4",
    status: "refused",
    refusal_reason: "unavailable that weekend",
  },
  {
    id: "asg-past-1",
    match_id: "match-past-1",
    referee_id: "ref-1",
    referee_function: "Main referee",
    indemnity: 400,
    paying_team_id: "team-2",
    status: "confirmed",
    receipt: initialReceipts[0],
  },
];

export const initialNotifications: Notification[] = [
  {
    id: "notif-1",
    title: "New match assignment",
    description: "Wydad AC vs Raja CA, 22 Nov 2026",
    read: false,
    created_at: "2 hours ago",
    type: "assignment",
  },
  {
    id: "notif-2",
    title: "Receipt generated",
    description: "Receipt No. 2026-0001 for 400 MAD",
    read: true,
    created_at: "Yesterday",
    type: "receipt",
  },
];

class MockStore {
  private teams: Team[] = [...initialTeams];
  private referees: Referee[] = [...initialReferees];
  private matches: Match[] = [...initialMatches];
  private assignments: Assignment[] = [...initialAssignments];
  private receipts: Receipt[] = [...initialReceipts];
  private notifications: Notification[] = [...initialNotifications];
  private receiptCounter = 3;

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    this.assignments.forEach((asg) => {
      asg.referee = this.referees.find((r) => r.id === asg.referee_id);
      asg.match = this.matches.find((m) => m.id === asg.match_id);
      asg.paying_team = this.teams.find((t) => t.id === asg.paying_team_id);
      asg.receipt = this.receipts.find((r) => r.assignment_id === asg.id);

      // compute needs_attention: pending and match within 24h
      if (asg.status === "pending" && asg.match?.date) {
        try {
          const t = asg.match.time || "00:00";
          const fullTime = t.length === 5 ? `${t}:00` : t;
          const matchDt = new Date(`${asg.match.date}T${fullTime}`).getTime();
          const now = Date.now();
          asg.needs_attention = matchDt > now && matchDt - now <= 24 * 3600 * 1000;
        } catch {
          asg.needs_attention = false;
        }
      } else {
        asg.needs_attention = false;
      }
    });

    this.matches.forEach((m) => {
      m.assignments = this.assignments
        .filter((a) => a.match_id === m.id)
        .map((a) => {
          const asgWithoutMatch = { ...a };
          delete asgWithoutMatch.match;
          return asgWithoutMatch as Assignment;
        });
    });
  }

  async delay<T>(data: T, ms = 200): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return data;
  }

  // Auth & Profile
  updateAuthMe(data: { full_name?: string; phone?: string }): Promise<User> {
    const cached = localStorage.getItem("referee_user");
    const user: User = cached
      ? JSON.parse(cached)
      : { id: "user-admin", email: "admin@referee.local", name: "System Admin", role: "admin", is_active: true };

    if (data.full_name) user.name = data.full_name;
    if (user.role === "referee") {
      const ref = this.referees.find((r) => r.id === user.referee_id || r.user_id === user.id);
      if (ref) {
        if (data.full_name) ref.name = data.full_name;
        if (data.phone) {
          ref.phone = normalizeMoroccanPhone(data.phone);
          user.phone = ref.phone;
        }
      }
    }
    localStorage.setItem("referee_user", JSON.stringify(user));
    return this.delay(user);
  }

  changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    if (!data.current_password) throw new Error("Current password is required");
    if (!data.new_password || data.new_password.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }
    return this.delay({ message: "Password updated successfully" });
  }

  getMeProfile(): Promise<Referee> {
    this.hydrate();
    const ref = this.referees.find((r) => r.id === "ref-1") || this.referees[0];
    return this.delay({ ...ref });
  }

  // Teams
  getTeams(): Promise<Team[]> {
    return this.delay([...this.teams]);
  }

  createTeam(input: CreateTeamInput): Promise<Team> {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: input.name,
      city: input.city,
    };
    this.teams.push(newTeam);
    return this.delay(newTeam);
  }

  updateTeam(id: string, input: Partial<CreateTeamInput>): Promise<Team> {
    const team = this.teams.find((t) => t.id === id);
    if (!team) throw new Error("Team not found");
    if (input.name) team.name = input.name;
    if (input.city) team.city = input.city;
    return this.delay(team);
  }

  // Referees
  getReferees(q?: string, active?: boolean): Promise<Referee[]> {
    let result = this.referees;
    if (active !== undefined) {
      result = result.filter((r) => r.is_active === active);
    }
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.license_number.toLowerCase().includes(lower)
      );
    }
    return this.delay([...result]);
  }

  getRefereeById(id: string): Promise<Referee> {
    const ref = this.referees.find((r) => r.id === id);
    if (!ref) throw new Error("Referee not found");
    return this.delay({ ...ref });
  }

  createReferee(input: CreateRefereeInput): Promise<Referee> {
    const normPhone = normalizeMoroccanPhone(input.phone);
    if (this.referees.some((r) => r.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("A referee with this email already exists");
    }
    if (input.license_number && this.referees.some((r) => r.license_number === input.license_number)) {
      throw new Error("A referee with this license number already exists");
    }

    const newRef: Referee = {
      id: `ref-${Date.now()}`,
      name: input.full_name || input.name || "",
      email: input.email,
      phone: normPhone,
      license_number: input.license_number || "",
      category: "National Referee",
      is_active: true,
      matches_count: 0,
      acceptance_rate: 100,
      assigned_count: 0,
      confirmed_count: 0,
      refused_count: 0,
    };
    this.referees.unshift(newRef);
    return this.delay({ ...newRef });
  }

  updateReferee(id: string, input: UpdateRefereeInput): Promise<Referee> {
    const ref = this.referees.find((r) => r.id === id);
    if (!ref) throw new Error("Referee not found");

    if (input.email && input.email.toLowerCase() !== ref.email.toLowerCase()) {
      if (this.referees.some((r) => r.id !== id && r.email.toLowerCase() === input.email!.toLowerCase())) {
        throw new Error("A referee with this email already exists");
      }
      ref.email = input.email;
    }

    if (input.license_number !== undefined && input.license_number !== ref.license_number) {
      if (this.referees.some((r) => r.id !== id && r.license_number === input.license_number)) {
        throw new Error("A referee with this license number already exists");
      }
      ref.license_number = input.license_number;
    }

    if (input.full_name) ref.name = input.full_name;
    if (input.phone) ref.phone = normalizeMoroccanPhone(input.phone);

    return this.delay({ ...ref });
  }

  resetRefereePassword(id: string, password: string): Promise<{ message: string }> {
    const ref = this.referees.find((r) => r.id === id);
    if (!ref) throw new Error("Referee not found");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    return this.delay({ message: "Password reset successfully" });
  }

  deactivateReferee(id: string): Promise<{ message: string }> {
    const ref = this.referees.find((r) => r.id === id);
    if (!ref) throw new Error("Referee not found");
    ref.is_active = false;
    return this.delay({ message: "Referee deactivated" });
  }

  activateReferee(id: string): Promise<{ message: string }> {
    const ref = this.referees.find((r) => r.id === id);
    if (!ref) throw new Error("Referee not found");
    ref.is_active = true;
    return this.delay({ message: "Referee activated" });
  }

  deleteReferee(id: string): Promise<void> {
    const hasAssignments = this.assignments.some((a) => a.referee_id === id);
    if (hasAssignments) {
      throw new Error("Referee has assignments, deactivate instead");
    }
    this.referees = this.referees.filter((r) => r.id !== id);
    return this.delay(undefined);
  }

  // Matches
  getMatches(scope?: string): Promise<Match[]> {
    this.hydrate();
    let result = this.matches;
    if (scope === "cancelled") {
      result = result.filter((m) => m.status === "cancelled");
    } else {
      result = result.filter((m) => m.status !== "cancelled");
    }
    return this.delay([...result]);
  }

  getMatchById(id: string): Promise<Match> {
    this.hydrate();
    const match = this.matches.find((m) => m.id === id);
    if (!match) throw new Error("Match not found");
    return this.delay({ ...match });
  }

  createMatch(input: CreateMatchInput): Promise<Match> {
    if (input.home_team_id === input.away_team_id) {
      throw new Error("Home team and away team cannot be the same");
    }

    const home = this.teams.find((t) => t.id === input.home_team_id);
    const away = this.teams.find((t) => t.id === input.away_team_id);
    if (!home || !away) throw new Error("Invalid teams selected");

    // Conflict check (±3 hours)
    const newMatchTime = new Date(`${input.date}T${input.time || "00:00"}`).getTime();
    for (const asg of input.assignments) {
      const conflict = this.assignments.find((existing) => {
        if (existing.referee_id !== asg.referee_id) return false;
        const m = this.matches.find((match) => match.id === existing.match_id);
        if (!m || m.status === "cancelled" || m.date !== input.date) return false;
        const existingTime = new Date(`${m.date}T${m.time || "00:00"}`).getTime();
        return Math.abs(newMatchTime - existingTime) < 3 * 3600 * 1000;
      });
      if (conflict) {
        const ref = this.referees.find((r) => r.id === asg.referee_id);
        const m = this.matches.find((match) => match.id === conflict.match_id);
        throw new Error(
          `${ref?.name || "Referee"} is already assigned to ${m?.home_team?.name} vs ${m?.away_team?.name} at ${m?.time}`
        );
      }
    }

    const matchId = `match-${Date.now()}`;
    const newMatch: Match = {
      id: matchId,
      match_number: `2026-${Math.floor(Math.random() * 90) + 10}`,
      status: "scheduled",
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      home_team: home,
      away_team: away,
      date: input.date,
      time: input.time,
      city: input.city,
      venue: input.venue,
      division: input.division,
      category: input.category,
      assignments: [],
    };

    const createdAssignments: Assignment[] = input.assignments.map((asgInput, idx) => {
      const ref = this.referees.find((r) => r.id === asgInput.referee_id);
      const paying = this.teams.find((t) => t.id === asgInput.paying_team_id);
      return {
        id: `asg-${Date.now()}-${idx}`,
        match_id: matchId,
        referee_id: asgInput.referee_id,
        referee: ref,
        referee_function: asgInput.referee_function,
        indemnity: Number(asgInput.indemnity),
        paying_team_id: asgInput.paying_team_id,
        paying_team: paying,
        status: "pending",
        match: newMatch,
      };
    });

    this.matches.unshift(newMatch);
    this.assignments.push(...createdAssignments);
    this.hydrate();

    return this.delay(newMatch);
  }

  updateMatch(id: string, input: Partial<CreateMatchInput>): Promise<Match> {
    const match = this.matches.find((m) => m.id === id);
    if (!match) throw new Error("Match not found");

    const dateChanged = input.date && input.date !== match.date;
    const venueChanged = input.venue && input.venue !== match.venue;
    const cityChanged = input.city && input.city !== match.city;

    if (input.date) match.date = input.date;
    if (input.time) match.time = input.time;
    if (input.city) match.city = input.city;
    if (input.venue) match.venue = input.venue;
    if (input.division) match.division = input.division;
    if (input.category) match.category = input.category;

    if (input.assignments) {
      // Sync assignments
      this.assignments = this.assignments.filter((a) => a.match_id !== id);
      const newAssignments: Assignment[] = input.assignments.map((asgInput, idx) => ({
        id: `asg-${Date.now()}-${idx}`,
        match_id: id,
        referee_id: asgInput.referee_id,
        referee: this.referees.find((r) => r.id === asgInput.referee_id),
        referee_function: asgInput.referee_function,
        indemnity: Number(asgInput.indemnity),
        paying_team_id: asgInput.paying_team_id,
        paying_team: this.teams.find((t) => t.id === asgInput.paying_team_id),
        status: "pending",
        match: match,
      }));
      this.assignments.push(...newAssignments);
    } else if (dateChanged || venueChanged || cityChanged) {
      // Reset confirmations to pending
      this.assignments
        .filter((a) => a.match_id === id)
        .forEach((a) => {
          a.status = "pending";
          a.refusal_reason = undefined;
        });
    }

    this.hydrate();
    return this.delay(match);
  }

  cancelMatch(id: string): Promise<{ message: string }> {
    const match = this.matches.find((m) => m.id === id);
    if (!match) throw new Error("Match not found");
    match.status = "cancelled";
    this.hydrate();
    return this.delay({ message: "Match cancelled successfully" });
  }

  // Assignments
  getAssignments(status?: string): Promise<Assignment[]> {
    this.hydrate();
    let result = this.assignments;
    if (status && status !== "all") {
      result = result.filter((a) => a.status === status);
    }
    return this.delay([...result]);
  }

  deleteAssignment(id: string): Promise<void> {
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    if (asg.receipt) throw new Error("Cannot delete assignment with existing receipt");
    this.assignments = this.assignments.filter((a) => a.id !== id);
    this.hydrate();
    return this.delay(undefined);
  }

  remindAssignment(id: string): Promise<{ message: string }> {
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    if (asg.status !== "pending") throw new Error("Can only remind pending assignments");
    if (asg.last_reminded_at) {
      const diff = Date.now() - new Date(asg.last_reminded_at).getTime();
      if (diff < 12 * 3600 * 1000) {
        throw new Error("Reminder already sent within the last 12 hours");
      }
    }
    asg.last_reminded_at = new Date().toISOString();
    return this.delay({ message: "Reminder sent successfully" });
  }

  getMeAssignments(tab?: string): Promise<Assignment[]> {
    this.hydrate();
    let result = this.assignments.filter((a) => a.referee_id === "ref-1");
    if (tab === "pending") {
      result = result.filter((a) => a.status === "pending");
    } else if (tab === "confirmed") {
      result = result.filter((a) => a.status === "confirmed");
    } else if (tab === "refused") {
      result = result.filter((a) => a.status === "refused");
    }
    return this.delay([...result]);
  }

  getMeAssignmentById(id: string): Promise<Assignment> {
    this.hydrate();
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    return this.delay({ ...asg });
  }

  confirmAssignment(id: string): Promise<Assignment> {
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    if (asg.status === "confirmed") throw new Error("Assignment is already confirmed");

    // 24h lock check for refused -> confirmed
    if (asg.status === "refused" && asg.match?.date) {
      const matchDt = new Date(`${asg.match.date}T${asg.match.time || "00:00"}`).getTime();
      if (matchDt - Date.now() < 24 * 3600 * 1000) {
        throw new Error("Too close to the match, contact the administration");
      }
    }

    asg.status = "confirmed";
    asg.refusal_reason = undefined;

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: "Assignment confirmed",
      description: asg.match ? `${asg.match.home_team.name} vs ${asg.match.away_team.name}` : "Confirmed",
      read: false,
      created_at: "Just now",
      type: "confirmed",
    });

    this.hydrate();
    return this.delay({ ...asg });
  }

  refuseAssignment(id: string, reason?: string): Promise<Assignment> {
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    if (asg.status === "refused") throw new Error("Assignment is already refused");

    // 24h lock check for confirmed -> refused
    if (asg.status === "confirmed" && asg.match?.date) {
      const matchDt = new Date(`${asg.match.date}T${asg.match.time || "00:00"}`).getTime();
      if (matchDt - Date.now() < 24 * 3600 * 1000) {
        throw new Error("Too close to the match, contact the administration");
      }
    }

    asg.status = "refused";
    asg.refusal_reason = reason || "Unavailable";

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: "Assignment refused",
      description: asg.match ? `${asg.match.home_team.name} vs ${asg.match.away_team.name}` : "Refused",
      read: false,
      created_at: "Just now",
      type: "refused",
    });

    this.hydrate();
    return this.delay({ ...asg });
  }

  getMeStats(): Promise<RefereeStats> {
    const stats: RefereeStats = {
      total_assigned: 24,
      confirmed: 20,
      refused: 4,
      acceptance_rate: 83,
      past_matches: [
        {
          id: "m-past-1",
          home_team: "Raja CA",
          away_team: "FUS Rabat",
          date: "15 Nov 2026",
          division: "1DV",
          status: "confirmed",
          indemnity: 400,
        },
      ],
    };
    return this.delay(stats);
  }

  getAdminStats(): Promise<AdminStats> {
    return this.delay({
      upcoming_matches: 8,
      pending_responses: 5,
      refused_this_month: 2,
    });
  }

  // Receipts
  createReceipt(assignmentId: string): Promise<Receipt> {
    const asg = this.assignments.find((a) => a.id === assignmentId);
    if (!asg) throw new Error("Assignment not found");
    if (asg.status !== "confirmed") throw new Error("Can only create receipts for confirmed assignments");

    const existing = this.receipts.find((r) => r.assignment_id === assignmentId);
    if (existing) return this.delay(existing);

    const year = new Date().getFullYear();
    const seq = String(this.receiptCounter++).padStart(4, "0");
    const num = `${year}-${seq}`;

    const rcpt: Receipt = {
      id: `rcpt-${Date.now()}`,
      assignment_id: assignmentId,
      receipt_number: num,
      issued_at: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      amount: asg.indemnity,
      pdf_url: "#",
    };
    this.receipts.push(rcpt);
    asg.receipt = rcpt;
    return this.delay(rcpt);
  }

  getNotifications(): Promise<Notification[]> {
    return this.delay([...this.notifications]);
  }

  markNotificationAsRead(id: string): Promise<Notification> {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) throw new Error("Notification not found");
    notif.read = true;
    return this.delay(notif);
  }

  markAllNotificationsAsRead(): Promise<Notification[]> {
    this.notifications.forEach((n) => (n.read = true));
    return this.delay([...this.notifications]);
  }
}

export const mockStore = new MockStore();
