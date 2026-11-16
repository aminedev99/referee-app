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
} from "./types";

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
    phone: "06 61 23 45 67",
    license_number: "1104",
    category: "National Referee",
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
    phone: "06 62 34 56 78",
    license_number: "1088",
    category: "Regional Referee",
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
    phone: "06 63 45 67 89",
    license_number: "1104",
    category: "National Referee",
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
    phone: "06 64 56 78 90",
    license_number: "1120",
    category: "Regional Referee",
    matches_count: 12,
    acceptance_rate: 75,
    assigned_count: 12,
    confirmed_count: 9,
    refused_count: 3,
  },
];

export const initialReceipts: Receipt[] = [
  {
    id: "rcpt-1",
    assignment_id: "asg-past-1",
    receipt_number: "2026-0148",
    issued_at: "16 Nov 2026",
    amount: 400,
    pdf_url: "#",
  },
  {
    id: "rcpt-2",
    assignment_id: "asg-past-2",
    receipt_number: "2026-0132",
    issued_at: "09 Nov 2026",
    amount: 350,
    pdf_url: "#",
  },
];

export const initialMatches: Match[] = [
  {
    id: "match-1",
    match_number: "2026-88",
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
    id: "match-past-1",
    match_number: "2026-75",
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
  {
    id: "match-past-2",
    match_number: "2026-70",
    home_team_id: "team-4",
    away_team_id: "team-5",
    home_team: initialTeams[3],
    away_team: initialTeams[4],
    date: "2026-11-08",
    time: "18:00",
    city: "Salé",
    venue: "Salle Fathallah El Bouazzaoui",
    division: "1DV",
    category: "Men",
    assignments: [],
  },
  {
    id: "match-past-3",
    match_number: "2026-64",
    home_team_id: "team-6",
    away_team_id: "team-1",
    home_team: initialTeams[5],
    away_team: initialTeams[0],
    date: "2026-11-01",
    time: "16:30",
    city: "Kénitra",
    venue: "Salle Al Wahda",
    division: "2DV",
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
    id: "asg-5",
    match_id: "match-3",
    referee_id: "ref-1",
    referee_function: "Main referee",
    indemnity: 400,
    paying_team_id: "team-5",
    status: "confirmed",
  },
  {
    id: "asg-6",
    match_id: "match-3",
    referee_id: "ref-2",
    referee_function: "Second referee",
    indemnity: 350,
    paying_team_id: "team-6",
    status: "refused",
    refusal_reason: "unavailable that weekend",
  },
  {
    id: "asg-7",
    match_id: "match-1",
    referee_id: "ref-3",
    referee_function: "Scorer",
    indemnity: 200,
    paying_team_id: "team-1",
    status: "confirmed",
  },
  {
    id: "asg-8",
    match_id: "match-2",
    referee_id: "ref-4",
    referee_function: "Timekeeper",
    indemnity: 200,
    paying_team_id: "team-3",
    status: "pending",
  },
  {
    id: "asg-9",
    match_id: "match-3",
    referee_id: "ref-3",
    referee_function: "24s operator",
    indemnity: 200,
    paying_team_id: "team-5",
    status: "pending",
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
  {
    id: "asg-past-2",
    match_id: "match-past-2",
    referee_id: "ref-1",
    referee_function: "Main referee",
    indemnity: 350,
    paying_team_id: "team-4",
    status: "confirmed",
    receipt: initialReceipts[1],
  },
  {
    id: "asg-past-3",
    match_id: "match-past-3",
    referee_id: "ref-1",
    referee_function: "Second referee",
    indemnity: 300,
    paying_team_id: "team-6",
    status: "refused",
    refusal_reason: "Family emergency",
  },
];

export const initialNotifications: Notification[] = [
  {
    id: "notif-1",
    title: "Youssef El Amrani confirmed",
    description: "Wydad AC vs Raja CA",
    read: false,
    created_at: "2 h ago",
    type: "confirmed",
  },
  {
    id: "notif-2",
    title: "Karim Benali refused",
    description: "FUS Rabat vs AS Salé",
    read: false,
    created_at: "5 h ago",
    type: "refused",
  },
  {
    id: "notif-3",
    title: "New assignment",
    description: "IR Tanger vs KAC Kénitra",
    read: true,
    created_at: "Yesterday",
    type: "assignment",
  },
  {
    id: "notif-4",
    title: "Receipt available",
    description: "Raja CA vs FUS Rabat",
    read: true,
    created_at: "Yesterday",
    type: "receipt",
  },
];

// In-memory state
class MockStore {
  teams: Team[] = [...initialTeams];
  referees: Referee[] = [...initialReferees];
  matches: Match[] = [...initialMatches];
  assignments: Assignment[] = [...initialAssignments];
  notifications: Notification[] = [...initialNotifications];
  receipts: Receipt[] = [...initialReceipts];

  constructor() {
    this.hydrate();
  }

  // Hydrate data without creating circular references
  private hydrate() {
    // 1. Ensure matches have team references
    this.matches.forEach((m) => {
      m.home_team = this.teams.find((t) => t.id === m.home_team_id) || m.home_team;
      m.away_team = this.teams.find((t) => t.id === m.away_team_id) || m.away_team;
    });

    // 2. Hydrate assignments with referee, paying team, and match (without match.assignments back-link)
    this.assignments.forEach((asg) => {
      const match = this.matches.find((m) => m.id === asg.match_id);
      const ref = this.referees.find((r) => r.id === asg.referee_id);
      const paying = this.teams.find((t) => t.id === asg.paying_team_id);
      const rcpt = this.receipts.find((r) => r.assignment_id === asg.id);

      if (ref) asg.referee = { ...ref };
      if (paying) asg.paying_team = { ...paying };
      if (rcpt) asg.receipt = { ...rcpt };

      if (match) {
        // Attach match without circular assignment back-link
        asg.match = {
          id: match.id,
          match_number: match.match_number,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_team: match.home_team,
          away_team: match.away_team,
          date: match.date,
          time: match.time,
          city: match.city,
          venue: match.venue,
          division: match.division,
          category: match.category,
          assignments: [],
        };
      }
    });

    // 3. Attach assignments to matches (without circular match back-link inside each assignment)
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

  async delay<T>(data: T, ms = 300): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return data;
  }

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

  getReferees(q?: string): Promise<Referee[]> {
    let result = this.referees;
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
    const newRef: Referee = {
      id: `ref-${Date.now()}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      license_number: input.license_number,
      category: "National Referee",
      matches_count: 0,
      acceptance_rate: 100,
      assigned_count: 0,
      confirmed_count: 0,
      refused_count: 0,
    };
    this.referees.unshift(newRef);
    return this.delay({ ...newRef });
  }

  getMatches(): Promise<Match[]> {
    this.hydrate();
    return this.delay([...this.matches]);
  }

  getMatchById(id: string): Promise<Match> {
    this.hydrate();
    const match = this.matches.find((m) => m.id === id);
    if (!match) throw new Error("Match not found");
    return this.delay({ ...match });
  }

  createMatch(input: CreateMatchInput): Promise<Match> {
    const home = this.teams.find((t) => t.id === input.home_team_id);
    const away = this.teams.find((t) => t.id === input.away_team_id);
    if (!home || !away) throw new Error("Invalid teams selected");

    const matchId = `match-${Date.now()}`;
    const newMatch: Match = {
      id: matchId,
      match_number: `2026-${Math.floor(Math.random() * 90) + 10}`,
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

    if (input.date) match.date = input.date;
    if (input.time) match.time = input.time;
    if (input.city) match.city = input.city;
    if (input.venue) match.venue = input.venue;
    if (input.division) match.division = input.division;
    if (input.category) match.category = input.category;
    if (input.home_team_id) {
      match.home_team_id = input.home_team_id;
      match.home_team = this.teams.find((t) => t.id === input.home_team_id) || match.home_team;
    }
    if (input.away_team_id) {
      match.away_team_id = input.away_team_id;
      match.away_team = this.teams.find((t) => t.id === input.away_team_id) || match.away_team;
    }

    if (input.assignments) {
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
    }

    this.hydrate();
    return this.delay(match);
  }

  getAssignments(status?: string): Promise<Assignment[]> {
    this.hydrate();
    let result = this.assignments;
    if (status && status !== "all") {
      result = result.filter((a) => a.status === status);
    }
    return this.delay([...result]);
  }

  getMeAssignments(): Promise<Assignment[]> {
    this.hydrate();
    // Default mock referee is ref-1 (Youssef El Amrani)
    const result = this.assignments.filter((a) => a.referee_id === "ref-1");
    return this.delay([...result]);
  }

  confirmAssignment(id: string): Promise<Assignment> {
    const asg = this.assignments.find((a) => a.id === id);
    if (!asg) throw new Error("Assignment not found");
    asg.status = "confirmed";
    asg.refusal_reason = undefined;

    // Create a receipt
    const receipt: Receipt = {
      id: `rcpt-${Date.now()}`,
      assignment_id: asg.id,
      receipt_number: `2026-0${Math.floor(Math.random() * 800) + 100}`,
      issued_at: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      amount: asg.indemnity,
      pdf_url: "#",
    };
    this.receipts.push(receipt);
    asg.receipt = receipt;

    // Add notification
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
        {
          id: "m-past-2",
          home_team: "AS Salé",
          away_team: "IR Tanger",
          date: "08 Nov 2026",
          division: "1DV",
          status: "confirmed",
          indemnity: 350,
        },
        {
          id: "m-past-3",
          home_team: "KAC Kénitra",
          away_team: "Wydad AC",
          date: "01 Nov 2026",
          division: "2DV",
          status: "refused",
          indemnity: 300,
        },
        {
          id: "m-past-4",
          home_team: "FUS Rabat",
          away_team: "AS Salé",
          date: "25 Oct 2026",
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

  createReceipt(assignmentId: string): Promise<Receipt> {
    const asg = this.assignments.find((a) => a.id === assignmentId);
    if (!asg) throw new Error("Assignment not found");
    const rcpt: Receipt = {
      id: `rcpt-${Date.now()}`,
      assignment_id: assignmentId,
      receipt_number: `2026-0${Math.floor(Math.random() * 800) + 100}`,
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
