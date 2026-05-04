# Report

## Tools & Techniques

- **Claude Code** — analysed requirements and generated a comprehensive prompt for Lovable
- **Lovable** — built the application from the prompt, hosted the final result
- **Supabase** — database, auth, storage, and realtime out of the box

## What Worked

- Analysed requirements with Claude Code and created a detailed prompt for Lovable
- Lovable split the work into two main parts and worked autonomously on both
- Clicked around to test, found two bugs, fixed each with a single follow-up prompt
- Improved UI and wording using Lovable's visual edit mode — smooth experience
- Generated seed data with Claude Code, imported it directly via Lovable
- Hosting handled entirely by Lovable with no extra configuration
- Overall a very easy flow with no significant blockers

## What Did Not Work

Nothing notable — the process was straightforward end to end.

## Notable Decisions

- Used a single mega-prompt rather than phased prompts so Lovable could see the full picture at once
- Chose Supabase as the backend for its native Lovable integration (auth, storage, realtime in one)
- Kept seed data in a separate `seed.md` to make it easy to import independently of the main prompt
