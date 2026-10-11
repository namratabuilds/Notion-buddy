import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sun, ArrowRight, Check, Scale, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBloom, mutate, event } from "@/lib/bloom/store";
import { summary, rebalance, validateProposal, weekDays, type Task } from "@/lib/bloom/engine";
import { bloomHead } from "@/lib/bloom/meta";
import { useBloomUI } from "@/components/bloom/Shell";
import { toast } from "sonner";
export const Route = createFileRoute("/capacity")({
  head: () =>
    bloomHead(
      "Capacity Check",
      "Compare your planned work with your real study capacity and review a gentler schedule.",
    ),
  component: Capacity,
});
function Capacity() {
  const s = useBloom();
  const ui = useBloomUI();
  const stats = summary(s);
  const [proposal, setProposal] = useState<{ tasks: Task[]; conflicts: string[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const changes =
    proposal?.tasks.filter((t) => {
      const old = s.tasks.find((x) => x.id === t.id);
      return old && (old.date !== t.date || old.time !== t.time);
    }) || [];
  const after = proposal ? summary({ ...s, tasks: proposal.tasks }) : null;
  const overloaded = weekDays().filter(
    (d) =>
      s.tasks.filter((t) => t.date === d).reduce((n, t) => n + t.minutes, 0) / 60 >
      s.capacity /
        Math.max(
          1,
          7 - s.rests.filter((r) => weekDays().includes(r.date) && r.start === "00:00").length,
        ),
  );
  async function accept() {
    if (!proposal) return;
    const check = validateProposal(s, proposal.tasks);
    if (check.length) {
      toast.error(
        "The edited proposal has a deadline or capacity conflict. Adjust it before accepting.",
      );
      return;
    }
    await mutate((x) => {
      for (const t of proposal.tasks) {
        const old = x.tasks.find((z) => z.id === t.id);
        if (old) {
          old.date = t.date;
          old.time = t.time;
        }
      }
      event(x, "plan-accepted");
    });
    setProposal(null);
    toast.success("A gentler plan is planted in your calendar.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AMBITIOUS, NOT OVERWHELMED</div>
          <h1>A little breathing room</h1>
          <p>Your time is finite. Your potential isn’t.</p>
        </div>
        <Button variant="outline" onClick={ui.settings}>
          <Settings />
          My available hours
        </Button>
      </div>
      <div className="stat-grid">
        <div className="panel">
          <span>Available this week</span>
          <strong>
            {s.capacity} <small className="text-sm">hrs</small>
          </strong>
          <p>The pace you chose</p>
        </div>
        <div className="panel">
          <span>Planned work</span>
          <strong>
            {stats.planned.toFixed(1)} <small className="text-sm">hrs</small>
          </strong>
          <p>Estimated task time</p>
        </div>
        <div className="panel">
          <span>{stats.excess ? "Over capacity" : "Room to breathe"}</span>
          <strong>
            {(stats.excess || s.capacity - stats.planned).toFixed(1)}{" "}
            <small className="text-sm">hrs</small>
          </strong>
          <p>{stats.remaining} remaining tasks</p>
        </div>
      </div>
      <div className="capacity-banner">
        <Sun />
        <div>
          <h2>
            {stats.excess ? "Let’s make your week feel lighter." : "Your week has room to grow."}
          </h2>
          <p>
            {stats.excess
              ? `You’ve planned ${stats.excess.toFixed(1)} hours beyond your capacity. ${overloaded.length} day${overloaded.length === 1 ? "" : "s"} exceed the daily study budget. We can move flexible work while keeping exams and hard deadlines safe.`
              : "Your scheduled work fits your available time. Rest and unexpected moments belong in your plan, too."}
          </p>
        </div>
      </div>
      {!proposal ? (
        <Button
          onClick={() => {
            setProposal(rebalance(s));
            setEditing(false);
          }}
        >
          <Scale />
          Review a balanced plan
          <ArrowRight />
        </Button>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Your proposed plan</h2>
            <span className="badge">Not applied yet</span>
          </div>
          <p className="text-xs text-muted-foreground">
            This week: {stats.planned.toFixed(1)} hrs → {after?.planned.toFixed(1)} hrs. Fixed exams
            stay put; flexible work moves only within its deadline.
          </p>
          {proposal.conflicts.map((c) => (
            <div className="conflict" key={c}>
              {c}
            </div>
          ))}
          <div className="overflow-x-auto">
            <table className="proposal-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((t) => {
                  const old = s.tasks.find((x) => x.id === t.id);
                  return (
                    <tr key={t.id}>
                      <td>
                        {t.title}
                        <span className="block text-xs text-muted-foreground mt-1">
                          {t.priority} · {t.minutes} min
                        </span>
                      </td>
                      <td>
                        {old?.date.slice(5)}
                        <br />
                        {old?.time}
                      </td>
                      <td>
                        {editing ? (
                          <input
                            type="date"
                            aria-label={`Proposed date for ${t.title}`}
                            value={t.date}
                            max={t.deadline || undefined}
                            onChange={(e) =>
                              setProposal({
                                ...proposal,
                                tasks: proposal.tasks.map((x) =>
                                  x.id === t.id ? { ...x, date: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        ) : (
                          <>
                            {t.date.slice(5)}
                            <br />
                            {t.time}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!changes.length && (
            <div className="empty">
              <Check />
              No changes needed. Your current plan fits.
            </div>
          )}
          <div className="proposal-actions">
            <Button onClick={accept} disabled={proposal.conflicts.length > 0 || !!after?.excess}>
              <Check />
              Accept Plan
            </Button>
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? "Finish editing" : "Edit Proposal"}
            </Button>
            <Button variant="ghost" onClick={() => setProposal(null)}>
              Keep My Original Plan
            </Button>
          </div>
          {proposal.conflicts.length > 0 && (
            <Button variant="link" onClick={ui.settings}>
              Adjust available hours to resolve conflicts
            </Button>
          )}
        </section>
      )}
    </>
  );
}
