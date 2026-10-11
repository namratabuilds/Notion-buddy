import { addDays, format, startOfWeek } from "date-fns";
export const dayKey = (d = new Date()) => format(d, "yyyy-MM-dd");
export const weekDays = (d = new Date()) =>
  Array.from({ length: 7 }, (_, i) => dayKey(addDays(startOfWeek(d, { weekStartsOn: 1 }), i)));
export type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  date: string;
  time: string;
  deadline: string;
  minutes: number;
  done: boolean;
  demo?: boolean;
};
export type Skill = {
  id: string;
  name: string;
  goal: string;
  target: string;
  hours: number;
  notes: string;
  resource: string;
  milestones: { id: string; title: string; major: boolean; done: boolean }[];
  demo?: boolean;
};
export type Event = {
  id: string;
  type: string;
  at: number;
  entity?: string | undefined;
  minutes?: number | undefined;
  demo?: boolean;
};
export type Timer = {
  id: string;
  mode: string;
  target: number;
  elapsed: number;
  started: number | null;
  entity: string;
};
export type State = {
  id: string;
  tasks: Task[];
  skills: Skill[];
  events: Event[];
  rests: { date: string; start: string; end: string; health: number; demo?: boolean }[];
  name: string;
  intention: string;
  capacity: number;
  focusTarget: number;
  onboarded: boolean;
  timer: Timer | null;
};
export const initial: State = {
  id: "bloom",
  tasks: [],
  skills: [],
  events: [],
  rests: [],
  name: "",
  intention: "Make space for what matters.",
  capacity: 20,
  focusTarget: 60,
  onboarded: false,
  timer: null,
};
export const activeSeconds = (t: Timer, now = Date.now()) =>
  Math.min(t.target, t.elapsed + (t.started === null ? 0 : Math.max(0, (now - t.started) / 1000)));
export function summary(s: State, days = weekDays()) {
  const tasks = s.tasks.filter((t) => days.includes(t.date));
  const focus = s.events
    .filter((e) => e.type === "focus-completed" && days.includes(dayKey(new Date(e.at))))
    .reduce((a, e) => a + (e.minutes || 0), 0);
  const completed = tasks.reduce(
    (a, t) =>
      a +
      Math.min(
        t.minutes,
        t.done
          ? t.minutes
          : s.events
              .filter((e) => e.type === "focus-completed" && e.entity === t.id)
              .reduce((n, e) => n + (e.minutes || 0), 0),
      ),
    0,
  );
  const planned = tasks.reduce((a, t) => a + t.minutes, 0) / 60;
  return {
    planned,
    focus,
    completed: completed / 60,
    remaining: tasks.filter((t) => !t.done).length,
    excess: Math.max(0, planned - s.capacity),
  };
}
export function plantState(s: State, now = new Date()) {
  const today = dayKey(now);
  const progressTypes = ["focus-completed", "task-completed", "milestone-completed"];
  const first =
    [...s.tasks.map((t) => t.date), ...s.events.map((e) => dayKey(new Date(e.at)))].sort()[0] ||
    today;
  const beginning = new Date(first + "T12:00:00");
  const daysCount = Math.min(
    3660,
    Math.max(
      0,
      Math.round((new Date(today + "T12:00:00").getTime() - beginning.getTime()) / 86400000),
    ),
  );
  let health = 40;
  let breakdown = { adherence: 0, focus: 0, consistency: 0, activeCount: 0 };
  function score(date: string, cutoff: number) {
    const keys = Array.from({ length: 7 }, (_, i) =>
      dayKey(addDays(new Date(date + "T12:00:00"), -6 + i)),
    );
    const rests = s.rests
      .filter((r) => r.start === "00:00" && r.end === "23:59")
      .map((r) => r.date);
    const relevant = s.events.filter((e) => e.at <= cutoff && progressTypes.includes(e.type));
    const tasks = s.tasks.filter((t) => keys.includes(t.date) && !rests.includes(t.date));
    const total = tasks.reduce((n, t) => n + t.minutes, 0);
    const credit = tasks.reduce(
      (n, t) =>
        n +
        Math.min(
          t.minutes,
          t.done && relevant.some((e) => e.type === "task-completed" && e.entity === t.id)
            ? t.minutes
            : relevant
                .filter((e) => e.type === "focus-completed" && e.entity === t.id)
                .reduce((a, e) => a + (e.minutes || 0), 0),
        ),
      0,
    );
    const active = keys.filter(
      (d) =>
        !rests.includes(d) &&
        (tasks.some((t) => t.date === d) || relevant.some((e) => dayKey(new Date(e.at)) === d)),
    );
    const adherence = total ? (credit / total) * 100 : 0;
    const focus = Math.min(
      100,
      (relevant
        .filter((e) => e.type === "focus-completed" && active.includes(dayKey(new Date(e.at))))
        .reduce((n, e) => n + (e.minutes || 0), 0) /
        Math.max(1, s.focusTarget * active.length)) *
        100,
    );
    const consistency = active.length
      ? (active.filter((d) => relevant.some((e) => dayKey(new Date(e.at)) === d)).length /
          active.length) *
        100
      : 0;
    return {
      adherence,
      focus,
      consistency,
      activeCount: active.length,
      raw: Math.max(40, Math.round(adherence * 0.4 + focus * 0.3 + consistency * 0.3)),
    };
  }
  for (let i = 0; i <= daysCount; i++) {
    const d = dayKey(addDays(beginning, i));
    const end = new Date(d + "T23:59:59.999").getTime();
    const cutoff = Math.min(end, now.getTime());
    const rest = s.rests.find((r) => r.date === d);
    const current = score(d, cutoff);
    breakdown = current;
    const dailyFloor = Math.max(40, health - 10);
    const peaks = s.events
      .filter(
        (e) => dayKey(new Date(e.at)) === d && e.at <= cutoff && progressTypes.includes(e.type),
      )
      .map((e) => score(d, e.at).raw);
    health = rest
      ? Math.max(health, rest.health, current.raw)
      : Math.max(dailyFloor, current.raw, ...peaks);
  }
  const rest = s.rests.some((r) => r.date === today);
  const growth = s.events.filter((e) => progressTypes.includes(e.type)).length;
  return {
    health,
    adherence: Math.round(breakdown.adherence),
    focus: Math.round(breakdown.focus),
    consistency: Math.round(breakdown.consistency),
    growth,
    provisional: breakdown.activeCount < 3,
    state: rest
      ? "Resting"
      : health >= 75
        ? "Thriving"
        : health >= 50 || breakdown.activeCount < 3
          ? "Growing"
          : "Needs Attention",
  };
}
export function rebalance(
  s: State,
  days = weekDays(),
  today = dayKey(),
): { tasks: Task[]; conflicts: string[] } {
  const result = s.tasks.map((t) => ({ ...t }));
  const conflicts: string[] = [];
  const working = days.filter(
    (d) =>
      d >= today && !s.rests.some((r) => r.date === d && r.start === "00:00" && r.end === "23:59"),
  );
  const historical = result
    .filter((t) => days.includes(t.date) && t.date < today)
    .reduce((n, t) => n + t.minutes, 0);
  const budget = Math.min(
    480,
    Math.max(0, s.capacity * 60 - historical) / Math.max(1, working.length),
  );
  const used: Record<string, number> = {};
  const fixed = result.filter(
    (t) => days.includes(t.date) && t.date >= today && (t.category === "Exams" || t.done),
  );
  for (const t of fixed) {
    used[t.date] = (used[t.date] || 0) + t.minutes;
    if ((used[t.date] || 0) > budget)
      conflicts.push(`${t.title}: fixed work exceeds the daily budget.`);
  }
  const rank: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  const flexible = result
    .filter((t) => days.includes(t.date) && !t.done && t.category !== "Exams")
    .sort(
      (a, b) =>
        (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) ||
        a.deadline.localeCompare(b.deadline) ||
        a.id.localeCompare(b.id),
    );
  for (const t of flexible) {
    const candidates = [t.date, ...working.filter((d) => d !== t.date)].filter(
      (d) => working.includes(d) && (!t.deadline || d <= t.deadline),
    );
    const date = candidates.find((d) => (used[d] || 0) + t.minutes <= budget);
    if (date) {
      t.date = date;
      t.time = "09:00";
      used[date] = (used[date] || 0) + t.minutes;
      continue;
    }
    // Only defer beyond the current week when the hard deadline allows it.
    let deferred = "";
    for (let i = 1; i <= 21; i++) {
      const d = dayKey(addDays(new Date((days.at(-1) || today) + "T12:00:00"), i));
      if (t.deadline && d > t.deadline) break;
      if (s.rests.some((r) => r.date === d)) continue;
      const other = result
        .filter((x) => x.id !== t.id && x.date === d)
        .reduce((n, x) => n + x.minutes, 0);
      const futureBudget = Math.min(480, (s.capacity * 60) / 6);
      const futureWeek = weekDays(new Date(d + "T12:00:00"));
      const weekLoad = result
        .filter((x) => x.id !== t.id && futureWeek.includes(x.date))
        .reduce((n, x) => n + x.minutes, 0);
      if (other + t.minutes <= futureBudget && weekLoad + t.minutes <= s.capacity * 60) {
        deferred = d;
        break;
      }
    }
    if (deferred) {
      t.date = deferred;
      t.time = "09:00";
    } else
      conflicts.push(
        `${t.title}: cannot fit before ${t.deadline || "the planning horizon"}. Shorten or split this task, or increase available hours.`,
      );
  }
  // Allocate non-overlapping times around fixed examinations and partial rest periods.
  for (const d of [...new Set(flexible.map((t) => t.date))]) {
    const locks = result
      .filter((t) => t.date === d && (t.category === "Exams" || t.done))
      .map((t) => ({
        start: Number(t.time.slice(0, 2)) * 60 + Number(t.time.slice(3)),
        end: Number(t.time.slice(0, 2)) * 60 + Number(t.time.slice(3)) + t.minutes,
      }));
    const rests = s.rests
      .filter((r) => r.date === d)
      .map((r) => ({
        start: Number(r.start.slice(0, 2)) * 60 + Number(r.start.slice(3)),
        end: Number(r.end.slice(0, 2)) * 60 + Number(r.end.slice(3)),
      }));
    let cursor = 540;
    for (const t of flexible.filter((t) => t.date === d)) {
      for (let tries = 0; tries < 50; tries++) {
        const block = [...locks, ...rests].find(
          (b) => cursor < b.end && cursor + t.minutes > b.start,
        );
        if (!block) break;
        cursor = block.end;
      }
      if (cursor + t.minutes > 1440) {
        conflicts.push(`${t.title}: no uninterrupted time outside rest periods.`);
        continue;
      }
      t.time = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      cursor += t.minutes;
    }
  }
  return { tasks: result, conflicts };
}
export const skillProgress = (skill: Skill) =>
  skill.milestones.length
    ? Math.round((skill.milestones.filter((m) => m.done).length / skill.milestones.length) * 100)
    : 0;
export function validateProposal(s: State, tasks: Task[], today = dayKey()) {
  const conflicts: string[] = [];
  for (const t of tasks) {
    const old = s.tasks.find((x) => x.id === t.id);
    if (!old) continue;
    const changed = old.date !== t.date || old.time !== t.time;
    if (!changed) continue;
    if (old.category === "Exams" || old.done) conflicts.push(`${t.title}: fixed work cannot move.`);
    if (t.date < today || (t.deadline && t.date > t.deadline))
      conflicts.push(`${t.title}: proposed date is outside its allowed range.`);
    const start = Number(t.time.slice(0, 2)) * 60 + Number(t.time.slice(3));
    const end = start + t.minutes;
    if (
      s.rests.some(
        (r) =>
          r.date === t.date &&
          start < Number(r.end.slice(0, 2)) * 60 + Number(r.end.slice(3)) &&
          end > Number(r.start.slice(0, 2)) * 60 + Number(r.start.slice(3)),
      )
    )
      conflicts.push(`${t.title}: overlaps a rest period.`);
    if (
      tasks.some((other) => {
        if (other.id === t.id || other.date !== t.date) return false;
        const a = Number(other.time.slice(0, 2)) * 60 + Number(other.time.slice(3));
        return start < a + other.minutes && end > a;
      })
    )
      conflicts.push(`${t.title}: overlaps another task.`);
  }
  for (const week of new Set(
    tasks.map((t) => weekDays(new Date(t.date + "T12:00:00"))[0] || t.date),
  )) {
    if (summary({ ...s, tasks }, weekDays(new Date(week + "T12:00:00"))).excess > 0)
      conflicts.push("A proposed week still exceeds your available hours.");
  }
  return conflicts;
}
