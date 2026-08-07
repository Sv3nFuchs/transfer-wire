import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in — Gräsrot FC Data" },
      {
        name: "description",
        content:
          "Logga in eller skapa konto för att registrera klubbar, lag och spelarprofiler i Gräsrot FC Data.",
      },
      { property: "og:title", content: "Logga in — Gräsrot FC Data" },
      {
        property: "og:description",
        content: "Skapa konto och börja bygga gräsrotsfotbollens spelardatabas.",
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
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
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Kolla din e-post och bekräfta kontot för att logga in.");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google-inloggning misslyckades");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pitch pitch-stripes px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lift">
        <Link to="/" className="label-caps">
          ← Gräsrot FC Data
        </Link>
        <h1 className="mt-3 text-3xl">{mode === "signin" ? "Logga in" : "Skapa konto"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Konto behövs bara för att lägga in klubbar, lag och spelare. All data är öppen att läsa.
        </p>

        <Button onClick={handleGoogle} variant="pitch" className="mt-6 w-full">
          Fortsätt med Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-caps">eller</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="displayName">Visningsnamn</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ledare, scout eller förälder"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Lösenord</Label>
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
            {mode === "signin" ? "Logga in" : "Skapa konto"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-primary underline"
        >
          {mode === "signin" ? "Har du inget konto? Registrera dig" : "Har du redan konto? Logga in"}
        </button>
      </div>
    </div>
  );
}
