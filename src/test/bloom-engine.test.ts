import { describe, it, expect } from "vitest";
import {
  initial,
  summary,
  rebalance,
  plantState,
  activeSeconds,
  skillProgress,
  type Task,
} from "@/lib/bloom/engine";
const task = (id: string, date = "2026-10-12", minutes = 120): Task => ({
  id,
  title: id,
  date,
  minutes,
  description: "",
  category: "Study Sessions",
  priority: "Medium",
  deadline: "2026-10-25",
  time: "09:00",
  done: false,
});
const state = () => structuredClone(initial);
describe("Bloom critical rules", () => {
  it("detects overload and proposes without mutating original", () => {
    const s = state();
    s.capacity = 4;
    s.tasks = [task("a"), task("b"), task("c")];
    const original = JSON.stringify(s);
    expect(summary(s, ["2026-10-12"]).excess).toBe(2);
    const p = rebalance(s, ["2026-10-12", "2026-10-13"], "2026-10-12");
    expect(p.tasks.find((t) => t.id === "b")?.date).toBe("2026-10-13");
    expect(JSON.stringify(s)).toBe(original);
  });
  it("keeps fixed exams and honors full and partial rest", () => {
    const s = state();
    s.capacity = 8;
    s.tasks = [{ ...task("exam"), category: "Exams" }, task("b")];
    s.rests = [
      { date: "2026-10-13", start: "00:00", end: "23:59", health: 40 },
      { date: "2026-10-12", start: "11:00", end: "15:00", health: 40 },
    ];
    const p = rebalance(s, ["2026-10-12", "2026-10-13"], "2026-10-12");
    expect(p.tasks.find((t) => t.id === "exam")?.time).toBe("09:00");
    expect(p.tasks.find((t) => t.id === "b")?.time).toBe("15:00");
    expect(p.tasks.every((t) => t.date !== "2026-10-13")).toBe(true);
  });
  it("never schedules into the past or beyond deadlines", () => {
    const s = state();
    s.capacity = 1;
    s.tasks = [{ ...task("a", "2026-10-12"), deadline: "2026-10-12" }];
    const p = rebalance(s, ["2026-10-12"], "2026-10-12");
    expect(p.conflicts.length).toBeGreaterThan(0);
    expect(p.tasks[0]?.date).toBe("2026-10-12");
  });
  it("does not double count completion and linked focus", () => {
    const s = state();
    s.tasks = [{ ...task("a"), done: true }];
    s.events = [
      {
        id: "f",
        type: "focus-completed",
        entity: "a",
        minutes: 180,
        at: new Date("2026-10-12T10:00:00").getTime(),
      },
    ];
    expect(summary(s, ["2026-10-12"]).completed).toBe(2);
  });
  it("counts timestamps, excludes pause and caps timer credit", () => {
    const timer = { id: "1", mode: "Focus", target: 1500, elapsed: 30, started: 1000, entity: "" };
    expect(activeSeconds(timer, 11000)).toBe(40);
    expect(activeSeconds({ ...timer, started: null }, 11000)).toBe(30);
    expect(activeSeconds(timer, 5000000)).toBe(1500);
  });
  it("keeps baseline honest and rest health protected", () => {
    const s = state();
    const now = new Date("2026-10-12T12:00:00");
    expect(plantState(s, now).provisional).toBe(true);
    expect(plantState(s, now).health).toBe(40);
    s.rests = [{ date: "2026-10-12", start: "00:00", end: "23:59", health: 85 }];
    expect(plantState(s, now).health).toBe(85);
    expect(plantState(s, now).state).toBe("Resting");
  });
  it("skill flowers require completed milestones", () => {
    const skill = {
      id: "s",
      name: "Python",
      goal: "Learn",
      target: "2026-12-01",
      hours: 20,
      notes: "",
      resource: "",
      milestones: [{ id: "m", title: "Build", done: false, major: true }],
    };
    expect(skillProgress(skill)).toBe(0);
    const m = skill.milestones[0];
    if (m) m.done = true;
    expect(skillProgress(skill)).toBe(100);
  });
});
