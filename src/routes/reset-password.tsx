import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Bloom" },
      { name: "description", content: "Set a new password for your Bloom account." },
      { property: "og:title", content: "Choose a new password — Bloom" },
      { property: "og:description", content: "Set a new password for your Bloom account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand"><Sprout />bloom</div>
        <h1 className="dialog-title">Choose a new password</h1>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { error } = await supabase.auth.updateUser({ password });
            setBusy(false);
            if (error) return toast.error(error.message);
            toast.success("Password updated.");
            navigate({ to: "/", replace: true });
          }}
        >
          <label className="form-full">
            New password
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <Button type="submit" className="form-full" disabled={busy}>Save password</Button>
        </form>
      </div>
    </div>
  );
}
