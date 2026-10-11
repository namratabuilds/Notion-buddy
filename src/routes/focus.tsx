import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Check, Leaf, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBloom, mutate, event, finishTimer } from "@/lib/bloom/store";
import { activeSeconds, dayKey, plantState } from "@/lib/bloom/engine";
import { bloomHead } from "@/lib/bloom/meta";
import { Plant } from "@/components/bloom/Plant";
import { toast } from "sonner";
export const Route = createFileRoute("/focus")({
  head: () =>
    bloomHead(
      "Focus Room",
      "Find your rhythm with a calm focus timer that records active time and gives rest its own space.",
    ),
  component: Focus,
});
function Focus() {
  const s = useBloom();
  const [mode, setMode] = useState("Focus");
  const [duration, setDuration] = useState(25);
  const [shortBreak, setShort] = useState(5);
  const [longBreak, setLong] = useState(15);
  const [entity, setEntity] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);
  const timer = s.timer;
  const target =
    timer?.target ||
    (mode === "Focus" ? duration : mode === "Short break" ? shortBreak : longBreak) * 60;
  const active = timer ? activeSeconds(timer, now) : 0;
  const remaining = Math.max(0, Math.ceil(target - active));
  useEffect(() => {
    if (timer && active >= timer.target) {
      finishTimer().then(() =>
        toast.success(
          timer.mode === "Focus"
            ? "A little focus, a little growth. Session saved."
            : "Break complete. Come back at your own pace.",
        ),
      );
    }
  }, [timer?.id, active >= target]);
  const history = s.events.filter((e) => e.type === "focus-completed").sort((a, b) => b.at - a.at);
  const today = history
    .filter((e) => dayKey(new Date(e.at)) === dayKey())
    .reduce((n, e) => n + (e.minutes || 0), 0);
  const p = plantState(s);
  async function startPause() {
    await mutate((x) => {
      if (!x.timer) {
        x.timer = {
          id: crypto.randomUUID(),
          mode,
          target,
          elapsed: 0,
          started: Date.now(),
          entity,
        };
        event(x, "focus-started", entity);
        return;
      }
      if (x.timer.started !== null) {
        x.timer.elapsed = activeSeconds(x.timer);
        x.timer.started = null;
        event(x, "focus-paused", x.timer.entity);
      } else {
        x.timer.started = Date.now();
        event(x, "focus-resumed", x.timer.entity);
      }
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ONE THING, WITH INTENTION</div>
          <h1>Your focus room</h1>
          <p>Settle in. Take a breath. Begin where you are.</p>
        </div>
        <span className="badge">
          <Leaf />
          {Math.round(today)} / {s.focusTarget} min today
        </span>
      </div>
      <div className="focus-layout">
        <section className="panel focus-main">
          <div className="focus-modes">
            {["Focus", "Short break", "Long break"].map((x) => (
              <Button
                key={x}
                variant={(timer?.mode || mode) === x ? "secondary" : "ghost"}
                size="sm"
                disabled={!!timer}
                onClick={() => setMode(x)}
              >
                {x}
              </Button>
            ))}
          </div>
          <div className="focus-selection">
            <label>
              What are you tending to?
              <select
                disabled={!!timer}
                value={timer?.entity || entity}
                onChange={(e) => setEntity(e.target.value)}
              >
                <option value="">Open focus · no task</option>
                <optgroup label="Tasks">
                  {s.tasks
                    .filter((t) => !t.done)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Skills">
                  {s.skills.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <div className="timer-ring">
            <svg viewBox="0 0 280 280" aria-label="Focus timer progress">
              <circle cx="140" cy="140" r="131" />
              <circle
                cx="140"
                cy="140"
                r="131"
                strokeDasharray={`${Math.max(0, active / target) * 823} 823`}
              />
            </svg>
            <div className="timer-text">
              <strong>
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
              <span>
                {timer
                  ? timer.started === null
                    ? "A little pause. No rush."
                    : "One small step at a time."
                  : "A quiet moment to begin."}
              </span>
            </div>
          </div>
          <div className="focus-controls">
            <Button
              size="icon"
              variant="outline"
              aria-label="Reset timer"
              title="Reset timer"
              onClick={() => {
                if (!timer) return;
                if (confirm("Reset this timer? Unsaved active time will be discarded."))
                  mutate((x) => {
                    x.timer = null;
                  });
              }}
            >
              <RotateCcw />
            </Button>
            <Button size="lg" onClick={startPause}>
              {timer?.started ? <Pause /> : <Play />}
              {timer ? (timer.started === null ? "Resume" : "Pause") : "Start focus"}
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={!timer}
              aria-label="Finish session"
              title="Finish and save active time"
              onClick={() =>
                finishTimer().then(() => toast.success("Your active focus time is saved."))
              }
            >
              <Check />
            </Button>
          </div>
          <div className="focus-settings">
            <label>
              Focus duration · minutes
              <input
                type="number"
                min="1"
                max="180"
                disabled={!!timer}
                value={duration}
                onChange={(e) => setDuration(Math.min(180, Math.max(1, Number(e.target.value))))}
              />
            </label>
            <label>
              Daily focus target · minutes
              <input
                type="number"
                min="1"
                max="480"
                value={s.focusTarget}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 1 && value <= 480)
                    mutate((x) => {
                      x.focusTarget = value;
                    });
                }}
              />
            </label>
            <label>
              Short break · minutes
              <input
                type="number"
                min="1"
                max="60"
                disabled={!!timer}
                value={shortBreak}
                onChange={(e) => setShort(Math.min(60, Math.max(1, Number(e.target.value))))}
              />
            </label>
            <label>
              Long break · minutes
              <input
                type="number"
                min="1"
                max="120"
                disabled={!!timer}
                value={longBreak}
                onChange={(e) => setLong(Math.min(120, Math.max(1, Number(e.target.value))))}
              />
            </label>
          </div>
        </section>
        <div>
          <section className="plant-panel">
            <div className="panel-title">
              <h2>Quietly growing</h2>
              <span className="badge">{p.state}</span>
            </div>
            <div className="plant-visual">
              <Plant
                growth={p.growth}
                health={p.health}
                flowers={
                  s.skills.filter(
                    (sk) => sk.milestones.length && sk.milestones.every((m) => m.done),
                  ).length
                }
              />
            </div>
            <p className="plant-message">Your attention is a little act of care.</p>
            <div className="plant-metrics">
              <div>
                <strong>{p.health}</strong>
                <span>Plant health</span>
              </div>
              <div>
                <strong>{Math.round(today)} min</strong>
                <span>Today’s focus</span>
              </div>
              <div>
                <strong>{history.length}</strong>
                <span>Saved sessions</span>
              </div>
            </div>
          </section>
          <section className="focus-history">
            <div className="section-heading">
              <h2>Moments of focus</h2>
              <Clock size={16} />
            </div>
            <div className="panel">
              {history.length ? (
                history.slice(0, 8).map((e) => (
                  <div className="history-row" key={e.id}>
                    <div>
                      {s.tasks.find((t) => t.id === e.entity)?.title ||
                        s.skills.find((t) => t.id === e.entity)?.name ||
                        "Open focus"}
                      <span>
                        {new Date(e.at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {e.demo ? " · Demo" : ""}
                      </span>
                    </div>
                    <strong>{(e.minutes || 0).toFixed(1)} min</strong>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <Leaf />
                  Your first moment of focus is waiting.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
