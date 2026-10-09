import { Logo } from "@/components/Logo";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in — TransferWire" },
      {
        name: "description",
        content:
          "Log in or create an account to register clubs, teams and player profiles on TransferWire.",
      },
      { property: "og:title", content: "Log in — TransferWire" },
      {
        property: "og:description",
        content: "Create an account and start building the football player database.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adult, setAdult] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup" && !adult) {
        toast.error("Confirm that you are 18 or older to create an account");
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() || "New user", adult_confirmed: true },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Check your email and confirm your account to log in.");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error("Google sign-in failed");
    }
    // On success, Supabase redirects the browser to Google and back — nothing more to do here.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pitch pitch-stripes px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lift">
        <Logo boxed />
        <h1 className="mt-3 text-3xl">{mode === "signin" ? "Log in" : "Create account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An account is only needed to add clubs, teams and players. All data is open to read.
        </p>

        {mode === "signup" && (
          <label className="mt-6 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-1" />
            <span>
              I am 18 or older. TransferWire accounts are for adults only for now. I agree to the{" "}
              <Link to="/terms" className="underline">Terms</Link> and{" "}
              <Link to="/privacy" className="underline">Privacy policy</Link>.
            </span>
          </label>
        )}

        <Button
          onClick={handleGoogle}
          variant="pitch"
          className="mt-4 w-full"
          disabled={mode === "signup" && !adult}
        >
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-caps">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Coach, scout or parent"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {mode === "signin" ? "Log in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-primary underline"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
