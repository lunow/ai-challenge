create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  contact_email text,
  updated_at timestamptz default now()
);

create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  logo_url text,
  bio text,
  contact_email text,
  created_at timestamptz default now()
);

create table public.host_members (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('host','checker')),
  invited_via text,
  joined_at timestamptz default now(),
  unique(host_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'UTC',
  venue_address text,
  online_link text,
  capacity integer not null default 100,
  cover_image_url text,
  visibility text not null default 'public' check (visibility in ('public','unlisted')),
  status text not null default 'draft' check (status in ('draft','published')),
  is_paid boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed','waitlisted','cancelled')),
  waitlist_position integer,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text unique not null,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('event','photo')),
  target_id uuid not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','hidden','dismissed')),
  created_at timestamptz default now()
);

create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  role text not null check (role in ('host','checker')),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Trigger to auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, contact_email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ticket code generator
create or replace function public.generate_ticket_code() returns text language sql as $$
  select upper(substring(replace(replace(encode(gen_random_bytes(8), 'base64'), '/', 'A'), '+', 'B'), 1, 8));
$$;

-- Helper: is user a host_member of given host with optional role
create or replace function public.is_host_member(_host_id uuid, _user_id uuid, _role text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.host_members
    where host_id = _host_id and user_id = _user_id
      and (_role is null or role = _role)
  );
$$;

create or replace function public.is_event_team(_event_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = _event_id and hm.user_id = _user_id
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.hosts enable row level security;
alter table public.host_members enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.tickets enable row level security;
alter table public.feedback enable row level security;
alter table public.gallery_items enable row level security;
alter table public.reports enable row level security;
alter table public.invite_links enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "Profiles public read" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- hosts
create policy "Hosts public read" on public.hosts for select using (true);
create policy "Owner inserts host" on public.hosts for insert with check (auth.uid() = owner_id);
create policy "Host role updates host" on public.hosts for update
  using (public.is_host_member(id, auth.uid(), 'host'));

-- host_members
create policy "Members read memberships" on public.host_members for select
  using (user_id = auth.uid() or public.is_host_member(host_id, auth.uid(), 'host'));
create policy "Self-insert membership" on public.host_members for insert
  with check (auth.uid() = user_id or public.is_host_member(host_id, auth.uid(), 'host'));
create policy "Host removes member" on public.host_members for delete
  using (public.is_host_member(host_id, auth.uid(), 'host') or user_id = auth.uid());

-- events
create policy "Published or team can read events" on public.events for select
  using (status = 'published' or public.is_host_member(host_id, auth.uid()));
create policy "Host inserts events" on public.events for insert
  with check (public.is_host_member(host_id, auth.uid(), 'host'));
create policy "Host updates events" on public.events for update
  using (public.is_host_member(host_id, auth.uid(), 'host'));
create policy "Host deletes events" on public.events for delete
  using (public.is_host_member(host_id, auth.uid(), 'host'));

-- rsvps
create policy "Read own rsvps or team" on public.rsvps for select
  using (user_id = auth.uid() or public.is_event_team(event_id, auth.uid()));
create policy "Auth user rsvps" on public.rsvps for insert with check (auth.uid() = user_id);
create policy "User updates own rsvp" on public.rsvps for update using (user_id = auth.uid());
create policy "User deletes own rsvp" on public.rsvps for delete using (user_id = auth.uid());

-- tickets
create policy "Read own tickets or team" on public.tickets for select
  using (user_id = auth.uid() or public.is_event_team(event_id, auth.uid()));
create policy "Insert own ticket" on public.tickets for insert with check (auth.uid() = user_id);
create policy "Team updates check-in" on public.tickets for update
  using (public.is_event_team(event_id, auth.uid()));
create policy "User deletes own ticket" on public.tickets for delete using (user_id = auth.uid());

-- feedback
create policy "Feedback public read" on public.feedback for select using (true);
create policy "Confirmed attendees insert feedback" on public.feedback for insert
  with check (auth.uid() = user_id and exists (
    select 1 from public.rsvps r join public.events e on e.id = r.event_id
    where r.event_id = feedback.event_id and r.user_id = auth.uid()
      and r.status = 'confirmed' and e.end_at < now()
  ));

-- gallery_items
create policy "Approved or owner or host read gallery" on public.gallery_items for select
  using (approved = true or user_id = auth.uid() or
    exists (select 1 from public.events e where e.id = event_id and public.is_host_member(e.host_id, auth.uid(), 'host')));
create policy "Auth user uploads gallery" on public.gallery_items for insert
  with check (auth.uid() = user_id);
create policy "Host approves gallery" on public.gallery_items for update
  using (exists (select 1 from public.events e where e.id = event_id and public.is_host_member(e.host_id, auth.uid(), 'host')));
create policy "Host deletes gallery" on public.gallery_items for delete
  using (user_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and public.is_host_member(e.host_id, auth.uid(), 'host')));

-- reports
create policy "Auth user reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "Host reads relevant reports" on public.reports for select
  using (exists (select 1 from public.host_members hm where hm.user_id = auth.uid() and hm.role = 'host'));
create policy "Host updates reports" on public.reports for update
  using (exists (select 1 from public.host_members hm where hm.user_id = auth.uid() and hm.role = 'host'));

-- invite_links
create policy "Anyone reads invite by token" on public.invite_links for select using (true);
create policy "Host creates invites" on public.invite_links for insert
  with check (public.is_host_member(host_id, auth.uid(), 'host'));
create policy "Host deletes invites" on public.invite_links for delete
  using (public.is_host_member(host_id, auth.uid(), 'host'));

-- notifications
create policy "User reads own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "User updates own notifications" on public.notifications for update using (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.tickets;

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('event-covers', 'event-covers', true),
  ('gallery', 'gallery', true),
  ('host-logos', 'host-logos', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Public read event covers" on storage.objects for select using (bucket_id = 'event-covers');
create policy "Auth upload event covers" on storage.objects for insert with check (bucket_id = 'event-covers' and auth.uid() is not null);
create policy "Owner manages event covers" on storage.objects for update using (bucket_id = 'event-covers' and auth.uid() = owner) with check (bucket_id = 'event-covers' and auth.uid() = owner);
create policy "Owner deletes event covers" on storage.objects for delete using (bucket_id = 'event-covers' and auth.uid() = owner);

create policy "Public read gallery" on storage.objects for select using (bucket_id = 'gallery');
create policy "Auth upload gallery" on storage.objects for insert with check (bucket_id = 'gallery' and auth.uid() is not null);
create policy "Owner deletes gallery" on storage.objects for delete using (bucket_id = 'gallery' and auth.uid() = owner);

create policy "Public read host logos" on storage.objects for select using (bucket_id = 'host-logos');
create policy "Auth upload host logos" on storage.objects for insert with check (bucket_id = 'host-logos' and auth.uid() is not null);
create policy "Owner manages host logos" on storage.objects for update using (bucket_id = 'host-logos' and auth.uid() = owner) with check (bucket_id = 'host-logos' and auth.uid() = owner);
create policy "Owner deletes host logos" on storage.objects for delete using (bucket_id = 'host-logos' and auth.uid() = owner);

create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
create policy "Owner manages avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner) with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Owner deletes avatars" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid() = owner);