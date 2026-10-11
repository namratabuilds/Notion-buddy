import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { dayKey, type Task } from "@/lib/bloom/engine";
import { mutate, event } from "@/lib/bloom/store";
export function TaskEditor({
  task,
  date,
  onClose,
}: {
  task?: Task;
  date?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Task>(
    task || {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      category: "Assignments",
      priority: "Medium",
      date: date || dayKey(),
      time: "09:00",
      deadline: "",
      minutes: 60,
      done: false,
    },
  );
  const [error, setError] = useState("");
  const field = (key: keyof Task, value: string | number) => setForm({ ...form, [key]: value });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || form.minutes <= 0 || form.minutes > 1440) {
      setError("Add a title and a duration between 1 and 1440 minutes.");
      return;
    }
    if (form.deadline && form.date > form.deadline) {
      setError("The scheduled day must be on or before the deadline.");
      return;
    }
    await mutate((s) => {
      s.tasks = s.tasks.filter((t) => t.id !== form.id);
      s.tasks.push({ ...form, title: form.title.trim() });
      event(s, task ? "task-edited" : "task-created", form.id);
    });
    onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="dialog-content">
        <DialogTitle className="dialog-title">
          {task ? "Tend to your task" : "Plant a small intention"}
        </DialogTitle>
        <DialogDescription>One manageable step at a time.</DialogDescription>
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="form-full">
              Task title
              <input
                required
                autoFocus
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="What would you like to work on?"
              />
            </label>
            <label>
              Category
              <select value={form.category} onChange={(e) => field("category", e.target.value)}>
                {["Assignments", "Exams", "Projects", "Study Sessions", "Skill Learning"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => field("priority", e.target.value)}>
                {["Low", "Medium", "High", "Urgent"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Scheduled date
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => field("date", e.target.value)}
              />
            </label>
            <label>
              Scheduled time
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => field("time", e.target.value)}
              />
            </label>
            <label>
              Estimated minutes
              <input
                type="number"
                min="1"
                max="1440"
                required
                value={form.minutes}
                onChange={(e) => field("minutes", Number(e.target.value))}
              />
            </label>
            <label>
              Hard deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => field("deadline", e.target.value)}
              />
            </label>
            <label className="form-full">
              Notes
              <textarea
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                rows={3}
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            {task && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Delete task"
                title="Delete task"
                onClick={async () => {
                  if (
                    !confirm("Delete this task and its completion record? Focus history will stay.")
                  )
                    return;
                  await mutate((s) => {
                    s.tasks = s.tasks.filter((t) => t.id !== task.id);
                    s.events = s.events.filter((e) => e.id !== `task-completed:${task.id}`);
                    event(s, "task-deleted", task.id);
                  });
                  onClose();
                }}
              >
                <Trash2 />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{task ? "Save changes" : "Add task"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
