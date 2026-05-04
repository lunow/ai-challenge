import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Sign in to Localhost" }, { name: "description", content: "Sign in or create your Localhost account." }],
  }),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, "Please enter your name"),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: returnTo ?? "/", replace: true });
  }, [user, loading, navigate, returnTo]);

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-md">
      <Card className="shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Localhost</CardTitle>
          <CardDescription>
            {forgotMode ? "We'll email you a reset link." : "Sign in or create an account to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forgotMode ? (
            <ForgotPasswordForm onBack={() => setForgotMode(false)} />
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm onForgot={() => setForgotMode(true)} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (v: z.infer<typeof signInSchema>) => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(v);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button type="button" onClick={onForgot} className="text-xs text-primary hover:underline">
            Forgot?
          </button>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (v: z.infer<typeof signUpSchema>) => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: v.fullName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created! You're signed in.");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" {...form.register("fullName")} />
        {form.formState.errors.fullName && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.fullName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email-up">Email</Label>
        <Input id="email-up" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="password-up">Password</Label>
        <Input id="password-up" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending..." : "Send reset link"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Back to sign in
      </Button>
    </form>
  );
}
