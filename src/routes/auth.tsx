import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Bloom" },
      { name: "description", content: "Sign in to Bloom to keep your plan, focus history and garden in sync." },
      { property: "og:title", content: "Sign in — Bloom" },
      { property: "og:description", content: "Your student planner that grows with you." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) throw error;
        setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand"><Sprout />bloom</div>
        <h1 className="dialog-title">
          {mode === "in" ? "Welcome back" : mode === "up" ? "Plant your first seed" : "Reset your password"}
        </h1>
        <p className="auth-sub">A little progress. A lot of possibility.</p>
        {sent ? (
          <p className="auth-note">{sent}</p>
        ) : (
          <form onSubmit={submit} className="form-grid">
            {mode === "up" && (
              <label className="form-full">
                Your name
                <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
            <label className="form-full">
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {mode !== "forgot" && (
              <label className="form-full">
                Password
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            <Button type="submit" className="form-full" disabled={busy}>
              {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
            </Button>
          </form>
        )}
        <div className="auth-links">
          {mode !== "in" && <button onClick={() => { setMode("in"); setSent(""); }}>Have an account? Sign in</button>}
          {mode !== "up" && <button onClick={() => { setMode("up"); setSent(""); }}>New here? Create an account</button>}
          {mode === "in" && <button onClick={() => setMode("forgot")}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}
