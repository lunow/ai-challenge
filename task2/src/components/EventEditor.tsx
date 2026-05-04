import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

const COMMON_TZS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const schema = z
  .object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional().or(z.literal("")),
    start_at: z.string().min(1, "Start time is required"),
    end_at: z.string().min(1, "End time is required"),
    timezone: z.string().min(1),
    venue_address: z.string().optional().or(z.literal("")),
    online_link: z.string().url().optional().or(z.literal("")),
    capacity: z.coerce.number().int().min(1).max(100000),
    visibility: z.enum(["public", "private"]),
    status: z.enum(["draft", "published"]),
    cover_image_url: z.string().optional().or(z.literal("")),
  })
  .refine((v) => new Date(v.end_at) > new Date(v.start_at), {
    path: ["end_at"],
    message: "End time must be after start time",
  });

type FormValues = z.infer<typeof schema>;

type Props =
  | { mode: "create"; hostId?: string; eventId?: undefined }
  | { mode: "edit"; eventId: string; hostId?: undefined };

export function EventEditor(props: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isEdit = props.mode === "edit";

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["event-edit", props.eventId],
    enabled: isEdit,
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", props.eventId!).maybeSingle();
      return data;
    },
  });

  const { data: memberships } = useQuery({
    queryKey: ["editor-memberships", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("host_id, role, hosts:hosts!inner(id, name)")
        .eq("user_id", user!.id)
        .eq("role", "host");
      return data ?? [];
    },
  });

  const [hostId, setHostId] = useState<string | undefined>(props.hostId);
  useEffect(() => {
    if (existing) setHostId(existing.host_id);
  }, [existing]);
  useEffect(() => {
    if (!hostId && !isEdit && memberships && memberships.length > 0) {
      setHostId((memberships[0] as any).host_id);
    }
  }, [memberships, hostId, isEdit]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      start_at: "",
      end_at: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      venue_address: "",
      online_link: "",
      capacity: 100,
      visibility: "public",
      status: "draft",
      cover_image_url: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        title: existing.title,
        description: existing.description ?? "",
        start_at: toLocalInput(existing.start_at),
        end_at: toLocalInput(existing.end_at),
        timezone: existing.timezone,
        venue_address: existing.venue_address ?? "",
        online_link: existing.online_link ?? "",
        capacity: existing.capacity,
        visibility: existing.visibility as "public" | "private",
        status: existing.status as "draft" | "published",
        cover_image_url: existing.cover_image_url ?? "",
      });
    }
  }, [existing, form]);

  const onCoverPick = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-covers").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("event-covers").getPublicUrl(path);
      form.setValue("cover_image_url", pub.publicUrl, { shouldDirty: true });
      toast.success("Cover uploaded.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      if (!hostId) throw new Error("Pick a host");
      const payload = {
        title: v.title,
        description: v.description || null,
        start_at: new Date(v.start_at).toISOString(),
        end_at: new Date(v.end_at).toISOString(),
        timezone: v.timezone,
        venue_address: v.venue_address || null,
        online_link: v.online_link || null,
        capacity: v.capacity,
        visibility: v.visibility,
        status: v.status,
        cover_image_url: v.cover_image_url || null,
      };
      if (isEdit) {
        const { data, error } = await supabase.from("events").update(payload).eq("id", props.eventId!).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...payload, host_id: hostId, is_paid: false })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (e) => {
      toast.success(isEdit ? "Event saved." : "Event created.");
      qc.invalidateQueries({ queryKey: ["dash-events"] });
      navigate({ to: "/events/$id", params: { id: e.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isEdit && loadingExisting) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (memberships && memberships.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          You need to be a host to create events.
        </CardContent>
      </Card>
    );
  }

  const cover = form.watch("cover_image_url");

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          {!isEdit && memberships && memberships.length > 1 && (
            <div>
              <Label>Host</Label>
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {memberships.map((m: any) => (
                    <SelectItem key={m.host_id} value={m.host_id}>{m.hosts.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label>Cover image</Label>
            <div className="flex items-center gap-4 mt-1">
              <div className="h-24 w-40 rounded-md bg-muted overflow-hidden border">
                {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-hero" />}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onCoverPick(e.target.files[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : cover ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} {...form.register("description")} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_at">Start</Label>
              <Input id="start_at" type="datetime-local" {...form.register("start_at")} />
              {form.formState.errors.start_at && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.start_at.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="end_at">End</Label>
              <Input id="end_at" type="datetime-local" {...form.register("end_at")} />
              {form.formState.errors.end_at && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.end_at.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Timezone</Label>
            <Select value={form.watch("timezone")} onValueChange={(v) => form.setValue("timezone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_TZS.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venue_address">Venue address</Label>
              <Input id="venue_address" {...form.register("venue_address")} />
            </div>
            <div>
              <Label htmlFor="online_link">Online link</Label>
              <Input id="online_link" type="url" placeholder="https://..." {...form.register("online_link")} />
              {form.formState.errors.online_link && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.online_link.message}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={1} {...form.register("capacity")} />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={form.watch("visibility")} onValueChange={(v: any) => form.setValue("visibility", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v: any) => form.setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-muted/30 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                Paid event
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Paid ticketing isn't available yet.</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Coming soon.</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Switch checked={false} disabled />
                </span>
              </TooltipTrigger>
              <TooltipContent>Paid ticketing isn't available yet.</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : isEdit ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
