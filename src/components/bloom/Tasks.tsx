import { useState } from "react";
import { Clock, MoreHorizontal, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayKey, type Task } from "@/lib/bloom/engine";
import { toggleTask } from "@/lib/bloom/store";
import { TaskEditor } from "./TaskEditor";
export function Tasks({ tasks, filters = true }: { tasks: Task[]; filters?: boolean }) {
  const [filter, setFilter] = useState("All");
  const [edit, setEdit] = useState<Task>();
  const shown = tasks
    .filter(
      (t) =>
        filter === "All" ||
        (filter === "Completed" && t.done) ||
        (filter === "Pending" && !t.done) ||
        (filter === "Overdue" && !t.done && !!t.deadline && t.deadline < dayKey()),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      {filters && (
        <div className="filter-tabs">
          {["All", "Pending", "Completed", "Overdue"].map((x) => (
            <Button
              key={x}
              size="sm"
              variant={filter === x ? "secondary" : "ghost"}
              onClick={() => setFilter(x)}
            >
              {x}
              {x === "All" ? ` · ${tasks.length}` : ""}
            </Button>
          ))}
        </div>
      )}
      <div className="task-list">
        {shown.length ? (
          shown.map((t) => (
            <div className={`task-row ${t.done ? "task-done" : ""}`} key={t.id}>
              <input
                type="checkbox"
                aria-label={`Complete ${t.title}`}
                checked={t.done}
                onChange={() => toggleTask(t)}
              />
              <div className="task-copy">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className="category-tag" data-category={t.category}>
                    {t.category}
                  </span>
                  <Clock />
                  <span>
                    {t.time} · {t.minutes} min
                  </span>
                  {t.deadline && (
                    <span>
                      {t.deadline < dayKey() && !t.done ? "Overdue" : "Due"} {t.deadline.slice(5)}
                    </span>
                  )}
                </div>
              </div>
              <span className="task-priority" data-priority={t.priority}>
                {t.priority}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="task-edit"
                title="Edit or reschedule task"
                aria-label={`Edit ${t.title}`}
                onClick={() => setEdit(t)}
              >
                <MoreHorizontal />
              </Button>
            </div>
          ))
        ) : (
          <div className="empty">
            <Leaf />
            Nothing here yet. A little room to grow.
          </div>
        )}
      </div>
      {edit && <TaskEditor task={edit} onClose={() => setEdit(undefined)} />}
    </>
  );
}
