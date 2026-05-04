import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Your profile — Localhost" }] }),
});

const profileSchema = z.object({
  full_name: z.string().min(1, "Required"),
  bio: z.string().max(280).optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
});

const hostSchema = z.object({
  name: z.string().min(2, "Host name is required"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  bio: z.string().max(500).optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: hosts } = useQuery({
    queryKey: ["my-hosts", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("role, host_id, hosts:hosts!inner(id, name, slug, logo_url)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", bio: "", contact_email: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name ?? "",
        bio: profile.bio ?? "",
        contact_email: profile.contact_email ?? "",
      });
    }
  }, [profile, form]);

  const saveProfile = useMutation({
    mutationFn: async (v: z.infer<typeof profileSchema>) => {
      const { error } = await supabase.from("profiles").update(v).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved.");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onAvatarPick = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", user!.id);
      if (error) throw error;
      toast.success("Avatar updated.");
      qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal info and host organizations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
          <CardDescription>This is how organizers and other attendees see you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                {(profile?.full_name ?? user!.email ?? "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onAvatarPick(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Change avatar"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG or JPG, up to 5MB.</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit((v) => saveProfile.mutate(v))} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" {...form.register("full_name")} />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact email (optional)</Label>
              <Input id="contact_email" type="email" {...form.register("contact_email")} />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} {...form.register("bio")} />
            </div>
            <Button type="submit" disabled={saveProfile.isPending || isLoading}>
              {saveProfile.isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Host organizations</CardTitle>
          <CardDescription>
            Create a host to publish events. You'll automatically be the owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hosts && hosts.length > 0 && (
            <ul className="divide-y rounded-md border">
              {hosts.map((m: any) => (
                <li key={m.host_id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.hosts.logo_url ?? undefined} />
                      <AvatarFallback>{m.hosts.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{m.hosts.name}</div>
                      <div className="text-xs text-muted-foreground">/{m.hosts.slug} · {m.role}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <NewHostForm />
        </CardContent>
      </Card>
    </div>
  );
}

function NewHostForm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const form = useForm<z.infer<typeof hostSchema>>({
    resolver: zodResolver(hostSchema),
    defaultValues: { name: "", slug: "", bio: "", contact_email: "" },
  });

  const createHost = useMutation({
    mutationFn: async (v: z.infer<typeof hostSchema>) => {
      const { data: host, error } = await supabase
        .from("hosts")
        .insert({
          name: v.name,
          slug: v.slug,
          bio: v.bio || null,
          contact_email: v.contact_email || null,
          owner_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase.from("host_members").insert({
        host_id: host.id,
        user_id: user!.id,
        role: "host",
      });
      if (mErr) throw mErr;
      return host;
    },
    onSuccess: () => {
      toast.success("Host created.");
      form.reset();
      qc.invalidateQueries({ queryKey: ["my-hosts"] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const watchName = form.watch("name");
  useEffect(() => {
    if (watchName && !form.getValues("slug")) {
      form.setValue("slug", slugify(watchName));
    }
  }, [watchName, form]);

  return (
    <form
      onSubmit={form.handleSubmit((v) => createHost.mutate(v))}
      className="space-y-4 rounded-lg border bg-muted/30 p-4"
    >
      <h3 className="font-semibold">Create a new host</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="host-name">Name</Label>
          <Input id="host-name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="host-slug">Slug</Label>
          <Input id="host-slug" placeholder="my-host" {...form.register("slug")} />
          {form.formState.errors.slug && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.slug.message}</p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="host-bio">Bio</Label>
        <Textarea id="host-bio" rows={2} {...form.register("bio")} />
      </div>
      <div>
        <Label htmlFor="host-email">Contact email</Label>
        <Input id="host-email" type="email" {...form.register("contact_email")} />
      </div>
      <Button type="submit" disabled={createHost.isPending}>
        {createHost.isPending ? "Creating..." : "Create host"}
      </Button>
    </form>
  );
}
