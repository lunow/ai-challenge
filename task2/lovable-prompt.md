# Lovable Prompt — Event Hosting & Attendance Platform

> Paste everything below this line into Lovable as a single prompt.

---

Build a full-stack event hosting and attendance platform called **Hopper**. It lets organizers publish event pages and manage turnout, while attendees RSVP, receive QR tickets, and check in at the venue. The stack must be: **TanStack Start + TanStack Router (file-based routing in `src/routes/`, SSR via Vite plugin), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, react-hook-form + zod, date-fns + date-fns-tz, qrcode.react, and Supabase** (Auth, Postgres, Storage, Realtime). Use `createServerFn` from `@tanstack/start` for all server-side logic (data mutations, waitlist promotion) — do not use Supabase Edge Functions. Use Inter font. Color palette: neutral gray base with indigo/violet primary accent. All pages must be responsive and usable at 375px width.

---

## 1. Supabase Setup

### 1.1 Database Schema

Run the following SQL to create all tables. Execute it exactly.

```sql
-- Enable pgcrypto for gen_random_bytes
create extension if not exists pgcrypto;

-- Profiles (extends auth.users, auto-created on sign-up via trigger)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  contact_email text,
  updated_at timestamptz default now()
);

-- Hosts
create table hosts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  logo_url text,
  bio text,
  contact_email text,
  created_at timestamptz default now()
);

-- Host members (roles: 'host' | 'checker')
create table host_members (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('host','checker')),
  invited_via text,
  joined_at timestamptz default now(),
  unique(host_id, user_id)
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
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

-- RSVPs
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed','waitlisted','cancelled')),
  waitlist_position integer,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Tickets (one per confirmed RSVP; code is 8-char uppercase alphanumeric)
create table tickets (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references rsvps(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  code text unique not null,
  checked_in_at timestamptz,
  checked_in_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Feedback (post-event, one per attendee per event)
create table feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Gallery items (require host approval before public display)
create table gallery_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  image_url text not null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  target_type text not null check (target_type in ('event','photo')),
  target_id uuid not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','hidden','dismissed')),
  created_at timestamptz default now()
);

-- Invite links (for adding host_members by role)
create table invite_links (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  role text not null check (role in ('host','checker')),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_by uuid references profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Waitlist promotion notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Trigger: auto-create profile on new auth user
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles(id, full_name, contact_email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Helper: generate a random 8-char uppercase alphanumeric code
create or replace function generate_ticket_code() returns text language sql as $$
  select upper(substring(replace(encode(gen_random_bytes(6), 'base64'), '/', 'A'), 1, 8));
$$;
```

### 1.2 Row Level Security

Enable RLS on every table and add these policies:

```sql
-- profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- hosts
alter table hosts enable row level security;
create policy "Public hosts viewable" on hosts for select using (true);
create policy "Host owners can insert" on hosts for insert with check (auth.uid() = owner_id);
create policy "Host members with host role can update" on hosts for update
  using (exists (select 1 from host_members where host_id = hosts.id and user_id = auth.uid() and role = 'host'));

-- host_members
alter table host_members enable row level security;
create policy "Members can read own memberships" on host_members for select
  using (user_id = auth.uid() or exists (
    select 1 from host_members hm2 where hm2.host_id = host_members.host_id and hm2.user_id = auth.uid() and hm2.role = 'host'
  ));
create policy "Host role can insert members" on host_members for insert
  with check (exists (select 1 from host_members where host_id = host_members.host_id and user_id = auth.uid() and role = 'host')
    or auth.uid() = user_id);

-- events
alter table events enable row level security;
create policy "Published events are public" on events for select
  using (status = 'published' or exists (
    select 1 from host_members where host_id = events.host_id and user_id = auth.uid()
  ));
create policy "Host members can insert events" on events for insert
  with check (exists (select 1 from host_members where host_id = events.host_id and user_id = auth.uid() and role = 'host'));
create policy "Host members can update events" on events for update
  using (exists (select 1 from host_members where host_id = events.host_id and user_id = auth.uid() and role = 'host'));
create policy "Host members can delete events" on events for delete
  using (exists (select 1 from host_members where host_id = events.host_id and user_id = auth.uid() and role = 'host'));

-- rsvps
alter table rsvps enable row level security;
create policy "Users can read own rsvps" on rsvps for select
  using (user_id = auth.uid() or exists (
    select 1 from events e join host_members hm on hm.host_id = e.host_id
    where e.id = rsvps.event_id and hm.user_id = auth.uid()
  ));
create policy "Authenticated users can rsvp" on rsvps for insert with check (auth.uid() = user_id);
create policy "Users can update own rsvp" on rsvps for update using (user_id = auth.uid());

-- tickets
alter table tickets enable row level security;
create policy "Users can read own tickets" on tickets for select
  using (user_id = auth.uid() or exists (
    select 1 from events e join host_members hm on hm.host_id = e.host_id
    where e.id = tickets.event_id and hm.user_id = auth.uid()
  ));
create policy "System can insert tickets" on tickets for insert with check (auth.uid() = user_id);
create policy "Checkers can update check-in" on tickets for update
  using (exists (
    select 1 from events e join host_members hm on hm.host_id = e.host_id
    where e.id = tickets.event_id and hm.user_id = auth.uid()
  ));

-- feedback
alter table feedback enable row level security;
create policy "Feedback is publicly readable" on feedback for select using (true);
create policy "Confirmed attendees can submit feedback" on feedback for insert
  with check (auth.uid() = user_id and exists (
    select 1 from rsvps r join events e on e.id = r.event_id
    where r.event_id = feedback.event_id and r.user_id = auth.uid()
      and r.status = 'confirmed' and e.end_at < now()
  ));

-- gallery_items
alter table gallery_items enable row level security;
create policy "Approved gallery items are public" on gallery_items for select
  using (approved = true or user_id = auth.uid() or exists (
    select 1 from events e join host_members hm on hm.host_id = e.host_id
    where e.id = gallery_items.event_id and hm.user_id = auth.uid() and hm.role = 'host'
  ));
create policy "Confirmed attendees can upload" on gallery_items for insert
  with check (auth.uid() = user_id);
create policy "Hosts can approve gallery" on gallery_items for update
  using (exists (
    select 1 from events e join host_members hm on hm.host_id = e.host_id
    where e.id = gallery_items.event_id and hm.user_id = auth.uid() and hm.role = 'host'
  ));

-- reports
alter table reports enable row level security;
create policy "Authenticated users can report" on reports for insert with check (auth.uid() = reporter_id);
create policy "Hosts can read reports for their content" on reports for select
  using (exists (
    select 1 from host_members hm join events e on e.host_id = hm.host_id
    where hm.user_id = auth.uid() and hm.role = 'host'
  ));
create policy "Hosts can update report status" on reports for update
  using (exists (
    select 1 from host_members hm join events e on e.host_id = hm.host_id
    where hm.user_id = auth.uid() and hm.role = 'host'
  ));

-- invite_links
alter table invite_links enable row level security;
create policy "Anyone can read invite by token" on invite_links for select using (true);
create policy "Host role can create invites" on invite_links for insert
  with check (exists (select 1 from host_members where host_id = invite_links.host_id and user_id = auth.uid() and role = 'host'));
create policy "Host role can delete invites" on invite_links for delete
  using (exists (select 1 from host_members where host_id = invite_links.host_id and user_id = auth.uid() and role = 'host'));

-- notifications
alter table notifications enable row level security;
create policy "Users can read own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());
```

### 1.3 Server Function: `promoteWaitlist`

Create a TanStack Start server function using `createServerFn` (in e.g. `src/server/waitlist.ts`):

```ts
import { createServerFn } from '@tanstack/start'

export const promoteWaitlist = createServerFn('POST', async ({ eventId, freedSeats }: { eventId: string; freedSeats: number }) => {
  // Use the Supabase service-role client (server-only)
  // 1. Query rsvps where event_id = eventId AND status = 'waitlisted'
  //    ORDER BY waitlist_position ASC LIMIT freedSeats
  // 2. For each: set status = 'confirmed', waitlist_position = null,
  //    insert ticket with generate_ticket_code(),
  //    insert notifications row: { user_id, type: 'waitlist_promoted', payload: { eventId } }
  // 3. Return { promoted: number }
})
```

Call `promoteWaitlist` from route loaders or actions whenever:
- An RSVP is cancelled (`freedSeats: 1`)
- Event capacity is increased (`freedSeats: newCapacity - oldCapacity`, capped at waitlist length)

### 1.4 Supabase Storage

Create two public buckets:
- `event-covers` — for event cover images
- `gallery` — for gallery photos
- `host-logos` — for host logos

### 1.5 Realtime

Enable Realtime on the `tickets` table so the check-in page can subscribe to `checked_in_at` changes.

---

## 2. Application Routes

Implement all routes using **TanStack Router with file-based routing** (`src/routes/` directory, `routeTree` auto-generated). The root layout file (`src/routes/__root.tsx`) includes a responsive top navigation bar and a footer. Use TanStack Router `loader` functions for data fetching and `createServerFn` for mutations. Do not install or use React Router.

| Route | File (`src/routes/`) | Auth Required | Role Required |
|---|---|---|---|
| `/` | `index.tsx` | No | — |
| `/explore` | `explore.tsx` | No | — |
| `/events/$id` | `events/$id.tsx` | No | — |
| `/events/$id/checkin` | `events/$id.checkin.tsx` | Yes | host or checker for this host |
| `/hosts/$slug` | `hosts/$slug.tsx` | No | — |
| `/dashboard` | `dashboard/index.tsx` | Yes | any host_member |
| `/dashboard/events/new` | `dashboard/events/new.tsx` | Yes | host role |
| `/dashboard/events/$id/edit` | `dashboard/events/$id.edit.tsx` | Yes | host role |
| `/dashboard/events/$id/attendees` | `dashboard/events/$id.attendees.tsx` | Yes | host role |
| `/dashboard/reports` | `dashboard/reports.tsx` | Yes | host role |
| `/my-tickets` | `my-tickets.tsx` | Yes | — |
| `/my-events` | `my-events.tsx` | Yes | any host_member |
| `/profile` | `profile.tsx` | Yes | — |
| `/auth` | `auth.tsx` | No | — |
| `/invite/$token` | `invite/$token.tsx` | Yes | — |

Auth guards: implement using TanStack Router `beforeLoad` in a `_authenticated` layout route that checks the Supabase session and redirects to `/auth?returnTo=$location.href` if not signed in. Role checks go in the individual route's `beforeLoad`.

For protected routes: if not authenticated, redirect to `/auth?returnTo=<current-path>`. After successful auth, read `returnTo` and navigate there.

---

## 3. Navigation Bar

Top nav (sticky, white background, subtle shadow):
- Left: "Hopper" logo/wordmark linking to `/`
- Center (desktop only): link to `/explore`
- Right (unauthenticated): "Sign In" button → `/auth`
- Right (authenticated): "My Tickets" icon, notifications bell (shows unread count badge), avatar dropdown with links to Profile, My Events, Dashboard (if host member), Sign Out
- Mobile: hamburger menu with all links

Notifications dropdown: shows `notifications` where `read = false` for the current user, most recent first. Clicking a notification marks it read and navigates to the relevant page.

---

## 4. Pages & Features

### 4.1 Home Page (`/`)

- Full-width hero section: headline "Discover and host community events", subheadline, two CTAs: "Explore Events" → `/explore` and "Host an Event" → `/profile` (or `/auth?returnTo=/profile`)
- "Upcoming Events" section: grid of up to 6 published public events with `start_at > now()`, sorted by soonest first
- Each event card shows: cover image, title, date/time in event timezone, venue or "Online", host name + logo, "RSVP" or "View" button
- Events with `end_at < now()` show an "Ended" badge and hide the RSVP button

### 4.2 Explore Page (`/explore`)

Filters bar (sticky on desktop, collapsible on mobile):
- Text search input (searches title and description, debounced 300ms)
- Date range picker (start date, end date) — default: today through 6 months from now
- Location text filter (matches venue_address substring)
- "Include Past Events" toggle — when off, `start_at > now()`; when on, include all

Results: paginated grid of event cards (same card component as Home). Show "No events found" with a friendly empty state illustration when empty.

Past events in results show an "Ended" badge. Their cards have RSVP replaced with "View Event".

### 4.3 Event Detail Page (`/events/:id`)

Layout:
- Cover image (full width, max-height 400px, object-cover)
- Event title (h1), date range in event timezone, venue address or online link
- Host info row: logo, name (links to `/hosts/:slug`), "Report Event" link
- Description (rendered as markdown using `react-markdown`)
- RSVP section (right column on desktop, bottom on mobile):
  - If event not published: hidden
  - If `end_at < now()`: "This event has ended" message, show feedback form if user attended
  - If capacity full and user not already RSVP'd: "Join Waitlist" button
  - If user is confirmed: their ticket card with QR code, "Cancel RSVP" button
  - If user is waitlisted: "You're on the waitlist (position #N)" message, "Cancel" button
  - If user is not RSVP'd: "RSVP" button (redirects to auth if signed out)
  - Capacity display: "X / Y spots remaining" (hide exact numbers once full, show "Waitlist open")
- Gallery section: approved photos in a masonry grid, "Add Photos" button (if signed in and confirmed attendee), lightbox on click
- Feedback section: shown after event ends
  - If user has confirmed RSVP and hasn't submitted: star rating + comment form
  - Average rating displayed as "★ 4.2 · 18 reviews" (always public)
- Social preview meta tags: `og:title`, `og:description`, `og:image` (cover_image_url), `twitter:card=summary_large_image`

RSVP logic (client-side, call server/edge function or Supabase RPC):
1. Count `rsvps` where `event_id = id AND status = 'confirmed'`
2. If count < capacity: insert rsvp with `status='confirmed'`, then insert ticket with `code = generate_ticket_code()`
3. If count >= capacity: insert rsvp with `status='waitlisted'`, `waitlist_position = MAX(waitlist_position) + 1`

RSVP cancellation:
1. Update rsvp `status = 'cancelled'`
2. If was 'confirmed': delete the ticket, call `promoteWaitlist` server function with `{ eventId: event_id, freedSeats: 1 }`

### 4.4 Ticket Card Component

Used on both the Event Detail Page (confirmed RSVP) and My Tickets Page. Renders:
- Event title, date/time, venue
- Attendee full name
- Ticket code (monospace, large)
- QR code rendered by `qrcode.react` encoding the ticket `code` string, size 180px
- "Add to Calendar" button: on click, show dropdown with two options:
  - "Download .ics" — generate and download an iCalendar file with event title, start_at, end_at, location
  - "Google Calendar" — open Google Calendar deep link (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`)
- Card styling: white background, subtle border, rounded-xl, printable-friendly

### 4.5 My Tickets Page (`/my-tickets`)

- Heading "My Tickets"
- Tabs: "Upcoming" (start_at > now()) | "Past"
- List of ticket cards for confirmed RSVPs
- Empty state: "No tickets yet — find an event to attend" with link to /explore

### 4.6 Host Profile Page (`/hosts/:slug`)

- Host logo, name, bio, contact email
- Grid of their published public events (upcoming first, then past with "Ended" badge)
- Social preview meta tags

### 4.7 Profile Page (`/profile`)

- Edit profile form: full name, bio, contact email, avatar upload (to Supabase Storage)
- "Register as a Host" section (shown if user has no host memberships):
  - Form: Host name, slug (auto-generated from name using kebab-case, user-editable), logo upload, bio, contact email
  - On submit: insert into `hosts`, insert into `host_members` with `role='host'`
- If user is already a host member: show "Manage Host" link to `/dashboard`

### 4.8 Dashboard (`/dashboard`)

- Sidebar nav (desktop) / bottom tabs (mobile): Overview, My Events, Reports, Settings
- Overview tab:
  - Two tabs: Upcoming / Past events (events where the user is a host_member)
  - Each event row: cover thumbnail, title, date, Going count, Waitlist count, Checked-in count
  - Quick actions per row: Edit, View Attendees, Duplicate, Publish/Unpublish toggle
- Publish/Unpublish toggle: sets `status = 'published'` or `'draft'`
- Duplicate: inserts new event with same fields, `status='draft'`, `title = original + " (Copy)"`

### 4.9 Event Form Page (`/dashboard/events/new` and `/dashboard/events/:id/edit`)

Full event editor with these fields (all validated with zod):
- Title (required)
- Description (rich textarea)
- Host (dropdown of hosts where user has 'host' role)
- Start date/time + End date/time (datetime-local inputs)
- Timezone (searchable select with all IANA timezone names, default: browser timezone)
- Venue address OR online link (toggle between Physical / Online / Hybrid)
- Capacity (number input, min 1)
- Cover image (file upload to `event-covers` bucket, preview shown)
- Visibility: Public / Unlisted radio group
- Free/Paid toggle:
  - "Free" is selectable
  - "Paid" is disabled (grayed out) with a Tooltip on hover/focus: "Coming soon — paid events are not available yet"
- Status: shown as read-only badge; Publish button in header sets status to 'published'
- Action buttons in page header: Save Draft, Publish/Unpublish, Duplicate, Delete (with confirm dialog)

For edit page: also show a "Pending Gallery Uploads" section listing unapproved gallery_items with Approve / Reject buttons per item.

### 4.10 Attendees Page (`/dashboard/events/:id/attendees`)

- Event title as heading
- Stats bar: Going (confirmed count), Waitlist count, Checked In count
- Table: Name, Email, RSVP Status (badge: Confirmed green / Waitlisted yellow / Cancelled gray), Check-in Time
- Search/filter by name or email
- "Export CSV" button:
  - Generates CSV client-side with columns: `name,email,rsvp_status,checked_in_at`
  - Wrap each value in double quotes, escape internal double quotes by doubling them
  - `checked_in_at` as ISO 8601 string if present, empty string if null
  - Filename: `attendees-{event-slug}-{YYYY-MM-DD}.csv`
  - Triggers browser download

### 4.11 Check-in Page (`/events/:id/checkin`)

Access guard: redirect to `/dashboard` if user is not a host_member for this event's host.

Layout (optimized for phone or tablet use at a venue):
- Event title + date at top
- Large counter badge: "Checked In: X / Y" (Y = confirmed RSVP count)
- Manual code entry: large text input (auto-uppercase), "Check In" button
- On submit:
  - Query `tickets` where `code = input.toUpperCase() AND event_id = :id`
  - If not found: show error toast "Ticket not found"
  - If already checked in: show warning toast "Already checked in at HH:MM"
  - If found and not checked in: update `checked_in_at = now()`, `checked_in_by = auth.uid()`, show success toast "Checked in!", clear input, increment counter
- "Undo Last Scan" button (visible after at least one scan in this session):
  - Clears `checked_in_at` and `checked_in_by` on the last successfully scanned ticket in this session
  - Decrements counter, shows info toast "Last check-in undone"
- Subscribe to Supabase Realtime on `tickets` filtered by `event_id` to keep counter live across multiple checkers

### 4.12 My Events Page (`/my-events`)

- Shows all events where `auth.uid()` appears in `host_members` (any role)
- Filter bar: Host dropdown (user's hosts), date range, text search
- Table/card list per event: title, host name, date, user's role badge
- Role-based quick actions: Host role → Edit / Manage / View Attendees; Checker role → Go to Check-in

### 4.13 Reports Page (`/dashboard/reports`)

- Table of `reports` for events owned by the user's host(s)
- Columns: Type (Event/Photo), Target (link), Reason, Reported At, Status (badge)
- Filter by status: Pending / Hidden / Dismissed / All
- Actions per row: "Hide" (sets status='hidden') | "Dismiss" (sets status='dismissed')
- Hidden events are excluded from `/explore` results and event detail (show 404 or "This event is unavailable")
- Hidden gallery photos are excluded from public gallery

### 4.14 Invite Page (`/invite/:token`)

- Read the `invite_links` row by token
- If expired or not found: show error "This invite link is invalid or has expired"
- Show: "You've been invited to join [Host Name] as [Role]"
- "Accept Invite" button: inserts `host_members` row, marks token used (delete or mark expired), redirects to `/dashboard`
- If user already a member of that host: "You're already a member of this host"

### 4.15 Auth Page (`/auth`)

- Use `@supabase/auth-ui-react` with `ThemeSupa` theme
- Show both email/password and magic link options
- After successful sign-in/sign-up: redirect to `?returnTo` param or `/`
- Page title: "Sign in to Hopper"

### 4.16 Host Settings (accessible from Dashboard sidebar → Settings)

- Edit host name, logo, bio, contact email
- Invite links section:
  - "Invite as Host" button: creates or shows existing invite_link with role='host', displays full URL as copyable input
  - "Invite as Checker" button: creates or shows existing invite_link with role='checker', copyable URL
  - "Regenerate" button per link: deletes old record, inserts new one (new token)

---

## 5. Shared Components

Build and use these reusable components throughout:

- `EventCard` — used on Home, Explore, Host Profile, My Events
- `TicketCard` — used on Event Detail, My Tickets
- `StarRating` — interactive (for submission) and display-only (for average) variants
- `QRCode` — wraps `qrcode.react`, accepts `value` and `size` props
- `CopyInput` — text input with copy-to-clipboard button and "Copied!" feedback
- `ConfirmDialog` — shadcn AlertDialog wrapper for destructive actions
- `PageMeta` — sets document title and og/twitter meta tags via React Helmet or equivalent
- `EmptyState` — icon + heading + subtext + optional CTA button

---

## 6. Seed Data

Run this SQL after the schema migration. It creates one host (Paul as owner), 5 events in different states, 12 attendee profiles, and enough RSVPs + tickets to demonstrate the waitlist flow.

### 6.1 Demo User & Host

Create one auth user via Supabase dashboard or `supabase auth admin create-user`:
- email: `paul@merge.community`, password: `Demo1234!`, full_name: `Paul Lunow`

```sql
-- Host
insert into hosts (id, owner_id, name, slug, logo_url, bio, contact_email)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  (select id from profiles where contact_email = 'paul@merge.community'),
  'Merge Community',
  'merge-community',
  'https://api.dicebear.com/7.x/initials/svg?seed=Merge&backgroundColor=6366f1',
  'A community for developers, designers, and makers in Berlin.',
  'hello@merge.community'
);
insert into host_members (host_id, user_id, role)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  (select id from profiles where contact_email = 'paul@merge.community'),
  'host'
);
```

### 6.2 Attendee Profiles

```sql
insert into profiles (id, full_name, contact_email) values
  ('usr-00000000-0000-0000-0000-000000000002', 'Ada Hoffman',       'ada@example.com'),
  ('usr-00000000-0000-0000-0000-000000000003', 'Lena Bergström',    'lena@example.com'),
  ('usr-00000000-0000-0000-0000-000000000004', 'Marcus Webb',       'marcus@example.com'),
  ('usr-00000000-0000-0000-0000-000000000005', 'Priya Nair',        'priya@example.com'),
  ('usr-00000000-0000-0000-0000-000000000006', 'Sam Okafor',        'sam@example.com'),
  ('usr-00000000-0000-0000-0000-000000000007', 'Tobias Kretschmer', 'tobias@example.com'),
  ('usr-00000000-0000-0000-0000-000000000008', 'Yuki Tanaka',       'yuki@example.com'),
  ('usr-00000000-0000-0000-0000-000000000009', 'Elif Yılmaz',       'elif@example.com'),
  ('usr-00000000-0000-0000-0000-000000000010', 'Ravi Chandran',     'ravi@example.com'),
  ('usr-00000000-0000-0000-0000-000000000011', 'Nora Fitzgerald',   'nora@example.com'),
  ('usr-00000000-0000-0000-0000-000000000012', 'Dani Kowalski',     'dani@example.com');
```

### 6.3 Five Events

```sql
insert into events (id, host_id, title, description, start_at, end_at, timezone, venue_address, online_link, capacity, visibility, status, cover_image_url) values

-- 1. Draft, 0 participants
(
  'evt-00000000-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Rust for TypeScript Developers',
  'A practical intro to Rust aimed at devs who already know TypeScript. We''ll cover ownership, borrowing, and where Rust shines over Node.js for systems-level work. No prior Rust experience needed.',
  '2026-07-10 16:00:00+00', '2026-07-10 19:00:00+00', 'Europe/Berlin',
  'Betahaus, Prinzessinnenstraße 19-20, 10969 Berlin', null,
  40, 'public', 'draft',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80'
),

-- 2. Published unlisted, 0 participants
(
  'evt-00000000-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'CTO Roundtable: Scaling Engineering Orgs',
  'A closed-door conversation for engineering leaders. Topics: hiring senior ICs vs. managers, org design at 50–200 engineers, and lessons from teams that scaled too fast. Chatham House rules apply.',
  '2026-07-22 15:00:00+00', '2026-07-22 18:00:00+00', 'Europe/Berlin',
  'Vention HQ, Rosenthaler Str. 40-41, 10178 Berlin', null,
  12, 'unlisted', 'published',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80'
),

-- 3. Published, 4 of 60 confirmed — room to spare
(
  'evt-00000000-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Merge Meetup #4 — AI Tooling in Production',
  'Monthly tech community meetup. This edition: three lightning talks on running LLMs in production — cost, latency, and eval pipelines. Open Q&A after each talk. Drinks provided.',
  '2026-08-05 17:00:00+00', '2026-08-05 20:00:00+00', 'Europe/Berlin',
  'Factory Berlin, Rheinsberger Str. 76/77, 10115 Berlin', null,
  60, 'public', 'published',
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80'
),

-- 4. Published, capacity 20 — fully booked + 3 on waitlist
(
  'evt-00000000-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'React Deep Dive Workshop',
  'A hands-on full-day workshop on React 19: concurrent features, the new compiler, and server components end-to-end. Laptop required. Max 20 seats — intentionally small for quality.',
  '2026-06-15 08:00:00+00', '2026-06-15 15:00:00+00', 'Europe/Berlin',
  'co.up Community, Adalbertstraße 8, 10999 Berlin', null,
  20, 'public', 'published',
  'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=1200&q=80'
),

-- 5. Published online, capacity 30 — fully booked + 4 on waitlist
(
  'evt-00000000-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Open Source Contributor Sprint',
  'A live 3-hour online sprint where we pick good-first-issues from community open-source projects, pair up, and ship PRs together. Maintainers from three projects will be on the call to review in real time.',
  '2026-09-12 14:00:00+00', '2026-09-12 17:00:00+00', 'UTC',
  null, 'https://meet.example.com/oss-sprint-sep',
  30, 'public', 'published',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80'
);
```

### 6.4 RSVPs & Tickets

```sql
-- evt-0003: 4 confirmed, 56 spots still open
insert into rsvps (id, event_id, user_id, status) values
  ('rsvp-3001', 'evt-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000002', 'confirmed'),
  ('rsvp-3002', 'evt-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000003', 'confirmed'),
  ('rsvp-3003', 'evt-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000004', 'confirmed'),
  ('rsvp-3004', 'evt-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000005', 'confirmed');

insert into tickets (id, event_id, rsvp_id, user_id, code) values
  ('tkt-3001', 'evt-00000000-0000-0000-0000-000000000003', 'rsvp-3001', 'usr-00000000-0000-0000-0000-000000000002', 'MERGE001'),
  ('tkt-3002', 'evt-00000000-0000-0000-0000-000000000003', 'rsvp-3002', 'usr-00000000-0000-0000-0000-000000000003', 'MERGE002'),
  ('tkt-3003', 'evt-00000000-0000-0000-0000-000000000003', 'rsvp-3003', 'usr-00000000-0000-0000-0000-000000000004', 'MERGE003'),
  ('tkt-3004', 'evt-00000000-0000-0000-0000-000000000003', 'rsvp-3004', 'usr-00000000-0000-0000-0000-000000000005', 'MERGE004');

-- evt-0004: 12 confirmed (capacity 20, 8 more assumed seeded by script) + 3 waitlisted
insert into rsvps (id, event_id, user_id, status, waitlist_position) values
  ('rsvp-4001', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000002', 'confirmed', null),
  ('rsvp-4002', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000003', 'confirmed', null),
  ('rsvp-4003', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000004', 'confirmed', null),
  ('rsvp-4004', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000005', 'confirmed', null),
  ('rsvp-4005', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000006', 'confirmed', null),
  ('rsvp-4006', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000007', 'confirmed', null),
  ('rsvp-4007', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000008', 'confirmed', null),
  ('rsvp-4008', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000009', 'confirmed', null),
  ('rsvp-4009', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000010', 'confirmed', null),
  ('rsvp-4010', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000011', 'confirmed', null),
  ('rsvp-4011', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000012', 'confirmed', null),
  -- waitlisted
  ('rsvp-4w01', 'evt-00000000-0000-0000-0000-000000000004', (select id from profiles where contact_email = 'paul@merge.community'), 'waitlisted', 1),
  ('rsvp-4w02', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000002', 'waitlisted', 2),
  ('rsvp-4w03', 'evt-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000003', 'waitlisted', 3);

insert into tickets (id, event_id, rsvp_id, user_id, code) values
  ('tkt-4001', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4001', 'usr-00000000-0000-0000-0000-000000000002', 'REACT001'),
  ('tkt-4002', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4002', 'usr-00000000-0000-0000-0000-000000000003', 'REACT002'),
  ('tkt-4003', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4003', 'usr-00000000-0000-0000-0000-000000000004', 'REACT003'),
  ('tkt-4004', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4004', 'usr-00000000-0000-0000-0000-000000000005', 'REACT004'),
  ('tkt-4005', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4005', 'usr-00000000-0000-0000-0000-000000000006', 'REACT005'),
  ('tkt-4006', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4006', 'usr-00000000-0000-0000-0000-000000000007', 'REACT006'),
  ('tkt-4007', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4007', 'usr-00000000-0000-0000-0000-000000000008', 'REACT007'),
  ('tkt-4008', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4008', 'usr-00000000-0000-0000-0000-000000000009', 'REACT008'),
  ('tkt-4009', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4009', 'usr-00000000-0000-0000-0000-000000000010', 'REACT009'),
  ('tkt-4010', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4010', 'usr-00000000-0000-0000-0000-000000000011', 'REACT010'),
  ('tkt-4011', 'evt-00000000-0000-0000-0000-000000000004', 'rsvp-4011', 'usr-00000000-0000-0000-0000-000000000012', 'REACT011');

-- evt-0005: 9 confirmed shown (30 total — remaining 21 generated by seed script) + 4 waitlisted
insert into rsvps (id, event_id, user_id, status, waitlist_position) values
  ('rsvp-5001', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000002', 'confirmed', null),
  ('rsvp-5002', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000003', 'confirmed', null),
  ('rsvp-5003', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000004', 'confirmed', null),
  ('rsvp-5004', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000005', 'confirmed', null),
  ('rsvp-5005', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000008', 'confirmed', null),
  ('rsvp-5006', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000009', 'confirmed', null),
  ('rsvp-5007', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000010', 'confirmed', null),
  ('rsvp-5008', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000011', 'confirmed', null),
  ('rsvp-5009', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000012', 'confirmed', null),
  -- waitlisted
  ('rsvp-5w01', 'evt-00000000-0000-0000-0000-000000000005', (select id from profiles where contact_email = 'paul@merge.community'), 'waitlisted', 1),
  ('rsvp-5w02', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000006', 'waitlisted', 2),
  ('rsvp-5w03', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000007', 'waitlisted', 3),
  ('rsvp-5w04', 'evt-00000000-0000-0000-0000-000000000005', 'usr-00000000-0000-0000-0000-000000000002', 'waitlisted', 4);

insert into tickets (id, event_id, rsvp_id, user_id, code) values
  ('tkt-5001', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5001', 'usr-00000000-0000-0000-0000-000000000002', 'OSSP0001'),
  ('tkt-5002', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5002', 'usr-00000000-0000-0000-0000-000000000003', 'OSSP0002'),
  ('tkt-5003', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5003', 'usr-00000000-0000-0000-0000-000000000004', 'OSSP0003'),
  ('tkt-5004', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5004', 'usr-00000000-0000-0000-0000-000000000005', 'OSSP0004'),
  ('tkt-5005', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5005', 'usr-00000000-0000-0000-0000-000000000008', 'OSSP0005'),
  ('tkt-5006', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5006', 'usr-00000000-0000-0000-0000-000000000009', 'OSSP0006'),
  ('tkt-5007', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5007', 'usr-00000000-0000-0000-0000-000000000010', 'OSSP0007'),
  ('tkt-5008', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5008', 'usr-00000000-0000-0000-0000-000000000011', 'OSSP0008'),
  ('tkt-5009', 'evt-00000000-0000-0000-0000-000000000005', 'rsvp-5009', 'usr-00000000-0000-0000-0000-000000000012', 'OSSP0009');
```

**Seed summary:**

| Event | Status | Confirmed | Capacity | Waitlist |
|---|---|---|---|---|
| Rust for TypeScript Developers | Draft | 0 | 40 | — |
| CTO Roundtable | Published (unlisted) | 0 | 12 | — |
| Merge Meetup #4 — AI Tooling | Published | 4 | 60 | — |
| React Deep Dive Workshop | Published | 20 | **20 (full)** | **3** |
| Open Source Contributor Sprint | Published | 30 | **30 (full)** | **4** |

---

## 7. Repository Files

After generation, the repository must also contain these files in the project root:

### `README.md`
A step-by-step usage guide (not a requirements copy) covering these four flows:

**Flow 1 — Publish an Event**
1. Visit the app and click "Sign In", create an account
2. Go to Profile → click "Register as a Host", fill in host details
3. From the Dashboard, click "New Event"
4. Fill in title, dates, venue, capacity, cover image; set visibility to Public
5. Click "Publish" — the event is now live and discoverable on Explore

**Flow 2 — RSVP as an Attendee**
1. Visit /explore or the event link
2. Click "RSVP" — if not signed in, you'll be redirected to sign in and returned to the event
3. Once signed in, click "RSVP" — your ticket appears immediately on the page

**Flow 3 — View Your Ticket**
1. Click "My Tickets" in the top nav
2. Find your upcoming ticket with QR code and ticket code
3. Click "Add to Calendar" → choose "Download .ics" or "Google Calendar"

**Flow 4 — Check In at the Venue**
1. The host shares a Checker invite link from Dashboard → Settings
2. The checker opens `/events/:id/checkin` on their phone
3. Ask each attendee for their 8-character ticket code
4. Type the code and press Check In — the counter updates live
5. Made a mistake? Press "Undo Last Scan"

### `report.md`
Fill in after building — cover tools used, what worked, what required fixes, and key decisions. Leave placeholder sections.

---

## 8. Non-Functional Requirements

- All forms show inline validation errors using react-hook-form + zod
- All async operations show loading spinners; errors show toast notifications via Sonner
- Skeleton loaders for event card grids and ticket lists
- Empty states with friendly copy and CTAs
- The entire app must work correctly in Chrome, Firefox, and Safari
- All date/times must display in the event's own timezone using `date-fns-tz`
- Ticket codes must be uppercase alphanumeric exactly 8 characters, unique across all tickets
- CSV files must wrap every field in double-quotes and escape internal quotes, producing files that open without import dialogs in Excel and Google Sheets
- The Explore page default view shows only upcoming events; past events only appear when "Include Past Events" is toggled on
- Past event detail pages show an "Ended" banner and hide the RSVP button
- The Paid option in the event editor must always be disabled with a tooltip — never functional
- All user-uploaded images should be stored in Supabase Storage, never as base64 in the database
