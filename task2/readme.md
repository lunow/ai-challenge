# Localhost — Usage Guide

**Localhost** is where every idea starts — a community events platform for organizing real-world gatherings. RSVP in seconds, get a QR ticket, and breeze through check-in.

This guide walks you through the four main flows end-to-end:

1. **Publish** an event
2. **RSVP** as an attendee
3. **Ticket** delivery & your QR code
4. **Check-in** at the door

---

## Before you start

- Create an account from the **Sign in** button in the top nav (`/auth`).
- Verify your email when prompted.
- Once signed in, you can create a host (organization), publish events, RSVP to others' events, and manage tickets.

---

## 1. Publish — Create and publish an event

**Who:** Hosts and host members (any role except `checker`).

### Steps

1. Go to the **Dashboard** (`/dashboard`) from the user menu.
2. If you don't have a host yet, you'll be prompted to create one (name, slug, optional logo and bio). The creator becomes the **owner**.
3. Click **New event** → opens `/dashboard/events/new`.
4. Fill in the event editor:
   - **Title**, **description**, optional **cover image**.
   - **Start / end** date-times and **timezone**.
   - **Venue address** (in-person) and/or **online link**.
   - **Capacity** — once reached, new RSVPs go to the waitlist.
   - **Visibility**:
     - `draft` — only visible to host members.
     - `unlisted` — accessible by direct link, hidden from `/explore`.
     - `public` — listed on the home page and `/explore`, visible to anyone (including logged-out visitors).
5. Save → you're returned to the dashboard, where the event appears with live counters.

> **Tip:** Start as `draft`, get the details right, then flip to `public` when you're ready to share.

### Sharing

- Public events appear on `/` (home) and `/explore`.
- Anyone can copy the event URL: `/events/<event-id>`.
- Use **Add to calendar (.ics)** or **Add to Google Calendar** from the event page to spread the word with calendar invites.

---

## 2. RSVP — Attendees reserve a spot

**Who:** Any signed-in user.

### Steps

1. Open an event page (`/events/<event-id>`) — from home, explore, a host page, or a shared link.
2. Review the date, location, host, and capacity in the right-hand sidebar.
3. Click **RSVP**.
   - If seats remain → status becomes **`confirmed`** and a ticket is generated immediately.
   - If the event is full → status becomes **`waitlisted`** with a queue position (e.g. *Waitlist #3*).
4. Need to back out? Click **Cancel RSVP**. The system best-effort **promotes the next person on the waitlist** to confirmed and issues their ticket.

### Add it to your calendar

From the same sidebar, download the `.ics` file or open the **Add to Google Calendar** link so the event lands in your personal calendar.

---

## 3. Ticket — Your QR code

When your RSVP is `confirmed`, a ticket is created automatically.

### Steps

1. Go to **My Tickets** (`/my-tickets`) from the user menu.
2. Each ticket shows:
   - The event cover, title, date, and location.
   - A **QR code** encoding your unique ticket code (e.g. `AB12CD34`).
   - The **ticket code** in plain text as a fallback.
3. Save the page or screenshot the QR before the event — you'll show it at the door.
4. After being checked in, the ticket displays a **✓ Checked in** badge in real time.

> **Lost the email or page?** Just sign back in and reopen `/my-tickets` — tickets live with your account.

---

## 4. Check-in — Run the door

**Who:** Host owners, host members, and users invited as **checker** staff.

### Inviting check-in staff

1. Open the **Dashboard** (`/dashboard`).
2. Click **Invite check-in staff** → copies an invite link to your clipboard.
3. Send the link to your team. They open `/invite/<token>`, sign in, and are added to your host with the `checker` role.

### Running the door

1. From the event page, organizers see an **Organizer tools** card → click **Check-in**, or go directly to `/events/<event-id>/checkin`.
2. The check-in screen shows:
   - The live **checked-in / total** counter (updates in real time across all devices).
   - An input field focused and ready for input.
3. **Scan the attendee's QR** with any keyboard-wedge scanner, or **type the ticket code** and press Enter.
4. Result feedback:
   - ✅ **Checked in: `AB12CD34`** — they're in.
   - ❌ **Already checked in at 18:42** — duplicate scan, deny entry or verify identity.
   - ❌ **Ticket not found for this event** — wrong event or invalid code.
5. The input auto-clears and refocuses for the next attendee.

> **Multiple staff at the door?** No problem — every device sees the same live count thanks to realtime updates.

---

## Quick reference

| Flow | URL | Who |
|------|-----|-----|
| Browse public events | `/`, `/explore` | Anyone |
| Sign in / sign up | `/auth` | Anyone |
| Event detail & RSVP | `/events/<id>` | Anyone (RSVP requires sign-in) |
| My tickets (QR codes) | `/my-tickets` | Signed-in users |
| Host dashboard | `/dashboard` | Host members |
| Create / edit event | `/dashboard/events/new`, `/dashboard/events/<id>` | Host members |
| Door check-in | `/events/<id>/checkin` | Host members & checkers |
| Accept staff invite | `/invite/<token>` | Invitee (signed in) |

---

## Troubleshooting

- **"Sign in to RSVP"** — you're logged out. Click the button to sign in, then you're returned to the event.
- **RSVP went to waitlist** — the event is at capacity. You'll be auto-promoted if someone cancels.
- **Can't see the Check-in button** — you're not on the host team for that event. Ask the owner to invite you.
- **QR scanner isn't typing** — make sure the cursor is in the input field; it auto-focuses but can lose focus if you click elsewhere.
- **Event not visible when logged out** — check that **visibility** is set to `public` (not `draft` or `unlisted`).

Happy hosting. 🎟️
