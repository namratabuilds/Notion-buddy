import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Sprout, Flower2, Trash2, ExternalLink, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useBloom, mutate, event } from "@/lib/bloom/store";
import { skillProgress, dayKey, type Skill } from "@/lib/bloom/engine";
import { bloomHead } from "@/lib/bloom/meta";
import { Plant } from "@/components/bloom/Plant";
import { toast } from "sonner";
export const Route = createFileRoute("/garden")({
  head: () =>
    bloomHead(
      "Skill Garden",
      "Grow your skills through meaningful learning milestones, one leaf and one flower at a time.",
    ),
  component: Garden,
});
function Garden() {
  const s = useBloom();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [target, setTarget] = useState(dayKey());
  const [hours, setHours] = useState(20);
  const [milestone, setMilestone] = useState("");
  const [major, setMajor] = useState(false);
  const skill = s.skills.find((sk) => sk.id === selected);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await mutate((x) => {
      const id = crypto.randomUUID();
      x.skills.push({
        id,
        name: name.trim(),
        goal,
        target,
        hours,
        notes: "",
        resource: "",
        milestones: [],
      });
      event(x, "skill-created", id);
      setSelected(id);
    });
    setAdding(false);
    setName("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CURIOSITY TAKES ROOT</div>
          <h1>Your skill garden</h1>
          <p>Every skill starts small. Keep tending to what you love.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus />
          Plant a skill
        </Button>
      </div>
      {s.skills.length ? (
        <div className="garden-grid">
          {s.skills.map((sk) => {
            const progress = skillProgress(sk);
            return (
              <Button
                variant="ghost"
                className="skill-card"
                key={sk.id}
                onClick={() => setSelected(sk.id)}
              >
                <Plant
                  compact
                  growth={sk.milestones.filter((m) => m.done).length * 2}
                  health={70}
                  buds={progress < 100 ? sk.milestones.filter((m) => m.done && m.major).length : 0}
                  flowers={progress === 100 ? 1 : 0}
                />
                <h2>{sk.name}</h2>
                <p>{sk.goal || "A new possibility, ready to grow."}</p>
                <div className="skill-progress">
                  <span>
                    {sk.milestones.filter((m) => m.done).length} / {sk.milestones.length} milestones
                  </span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <progress value={progress} max={100} />
                </div>
              </Button>
            );
          })}
        </div>
      ) : (
        <div className="panel empty py-16">
          <Sprout />A garden of possibilities.
          <br />
          Plant your first skill, or load the demo week to explore.
        </div>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="dialog-content">
          <DialogTitle className="dialog-title">Plant a new possibility</DialogTitle>
          <DialogDescription>What would you love to learn?</DialogDescription>
          <form onSubmit={create}>
            <div className="form-grid">
              <label className="form-full">
                Skill name
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Web Development"
                />
              </label>
              <label className="form-full">
                Learning goal
                <input
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What would achieving this look like?"
                />
              </label>
              <label>
                Target date
                <input
                  required
                  type="date"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
              <label>
                Estimated learning hours
                <input
                  required
                  type="number"
                  min="1"
                  max="10000"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="form-actions">
              <Button type="submit">
                <Sprout />
                Plant skill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!skill}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="dialog-content">
          {skill && (
            <>
              <DialogTitle className="dialog-title">{skill.name}</DialogTitle>
              <DialogDescription>{skill.goal}</DialogDescription>
              <div className="flex items-center justify-between">
                <Plant
                  compact
                  growth={skill.milestones.filter((m) => m.done).length * 2}
                  buds={
                    skillProgress(skill) < 100
                      ? skill.milestones.filter((m) => m.done && m.major).length
                      : 0
                  }
                  flowers={skillProgress(skill) === 100 ? 1 : 0}
                />
                <div className="text-right">
                  <strong className="font-display text-3xl">{skillProgress(skill)}%</strong>
                  <p className="text-xs text-muted-foreground mt-2">
                    {s.events
                      .filter((e) => e.type === "focus-completed" && e.entity === skill.id)
                      .reduce((n, e) => n + (e.minutes || 0), 0)
                      .toFixed(1)}{" "}
                    focus minutes
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Goal: {skill.hours} learning hours
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Target: {skill.target}</p>
                </div>
              </div>
              <h3 className="text-sm font-medium">Small steps, meaningful milestones</h3>
              {skill.milestones.map((m) => (
                <div className="milestone-row" key={m.id}>
                  <input
                    type="checkbox"
                    checked={m.done}
                    aria-label={`Complete milestone ${m.title}`}
                    onChange={() =>
                      mutate((x) => {
                        const sk = x.skills.find((z) => z.id === skill.id);
                        const mi = sk?.milestones.find((z) => z.id === m.id);
                        if (!mi) return;
                        mi.done = !mi.done;
                        if (mi.done) {
                          event(
                            x,
                            "milestone-completed",
                            skill.id,
                            undefined,
                            `milestone:${mi.id}`,
                          );
                          toast.success(
                            sk && skillProgress(sk) === 100
                              ? "Your skill is in bloom!"
                              : "A new leaf of progress.",
                          );
                        } else x.events = x.events.filter((e) => e.id !== `milestone:${mi.id}`);
                      })
                    }
                  />
                  <span>{m.title}</span>
                  {m.major ? <Flower2 size={14} /> : <Leaf size={14} />}
                </div>
              ))}
              <form
                className="milestone-add"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!milestone.trim()) return;
                  await mutate((x) => {
                    x.skills
                      .find((z) => z.id === skill.id)
                      ?.milestones.push({
                        id: crypto.randomUUID(),
                        title: milestone.trim(),
                        major,
                        done: false,
                      });
                  });
                  setMilestone("");
                }}
              >
                <input
                  aria-label="New milestone"
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  placeholder="A new milestone…"
                  required
                />
                <Button type="submit" size="icon" aria-label="Add milestone">
                  <Plus />
                </Button>
              </form>
              <label className="flex-row items-center">
                <input
                  type="checkbox"
                  checked={major}
                  onChange={(e) => setMajor(e.target.checked)}
                />
                Major milestone · a bud of progress
              </label>
              <label>
                Learning notes
                <textarea
                  rows={2}
                  value={skill.notes}
                  onChange={(e) =>
                    mutate((x) => {
                      const sk = x.skills.find((z) => z.id === skill.id);
                      if (sk) sk.notes = e.target.value;
                    })
                  }
                />
              </label>
              <label>
                Resource link
                <input
                  type="url"
                  value={skill.resource}
                  onChange={(e) =>
                    mutate((x) => {
                      const sk = x.skills.find((z) => z.id === skill.id);
                      if (sk) sk.resource = e.target.value;
                    })
                  }
                  placeholder="https://"
                />
              </label>
              {/^https?:\/\//.test(skill.resource) && (
                <a className="text-link" href={skill.resource} target="_blank" rel="noreferrer">
                  Open resource
                  <ExternalLink />
                </a>
              )}
              <div className="form-actions">
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Delete skill"
                  title="Delete skill"
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this skill and its milestone records? Focus history will stay.",
                      )
                    )
                      mutate((x) => {
                        x.skills = x.skills.filter((z) => z.id !== skill.id);
                        x.events = x.events.filter(
                          (e) => !(e.entity === skill.id && e.type === "milestone-completed"),
                        );
                        setSelected(null);
                      });
                  }}
                >
                  <Trash2 />
                </Button>
                <Button onClick={() => setSelected(null)}>Done</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
