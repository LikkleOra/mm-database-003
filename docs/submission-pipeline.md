# Submission Pipeline - Backend Audit

Date audited: 2026-05-26

## Executive Summary

The app compiles and the core Convex/Clerk wiring is structurally sound. `npm.cmd run lint` passes with `tsc --noEmit`.

The main submission risk is not TypeScript or Convex connectivity. It is data contract drift between the five ingestion paths. The dashboard review queue reads from `submissions`, while the Discord bot writes to `videos`. Campaign is also inconsistently attached across paths, and creator lookup is much stricter than the current documentation implied.

The optimal path to success is:

1. Standardize `submissions` as the canonical review queue.
2. Ensure every real submission path writes `campaign: "Afina" | "Sigma"`.
3. Normalize Discord handles at every boundary.
4. Keep `videos` for performance/analytics only, or intentionally create it after approval.
5. Document and verify required Convex/Clerk/bot environment variables.

---

## Submission Pathways

| Path | Entry point | Table written | Campaign set? | Visible in Submissions dashboard? | Current state |
|---|---|---:|---:|---:|---|
| Admin/manual modal | `src/components/dashboard/SubmissionsView.tsx` -> `api.submissions.create` | `submissions` | Yes, but free text | Yes, if creator is in active campaign | Works, but campaign should not be free text |
| Creator submit form | `src/components/dashboard/SubmitLinkView.tsx` -> `api.submissions.create` | `submissions` | No | Yes, if creator is in active campaign | Mostly works, missing campaign propagation |
| Google Forms / Apps Script | `convex/http.ts` `/api/forms/submit` -> `internal.submissions.createInternal` | `submissions` | No | Yes, if creator lookup succeeds and creator is in active campaign | Works only with exact handle match; missing campaign |
| CSV bulk import | `src/components/dashboard/ImportView.tsx` -> `api.submissions.bulkImport` | `submissions` | Yes, from active campaign | Yes, if creator is in active campaign | Best-aligned path today |
| Discord bot | `discord-bot/src/index.js` -> `convex/http.ts` `/api/discord/submit` -> `api.discord.processVideoSubmission` | `videos` + `discord_events` | No | No | Tracks events, but bypasses submission review queue |

---

## Critical Findings

### 1. Discord submissions bypass the review queue

Files:

- `discord-bot/src/index.js`
- `convex/http.ts`
- `convex/discord.ts`
- `src/components/dashboard/SubmissionsView.tsx`

The bot posts to `/api/discord/submit`, which calls `api.discord.processVideoSubmission`. That mutation inserts matched content into the `videos` table, not `submissions`.

`SubmissionsView` only reads `api.submissions.list`, which queries the `submissions` table. So Discord-captured links are visible in Discord Tracking and Content Explorer, but they will never enter the approve/reject submission workflow.

Recommended decision:

Make `submissions` the canonical intake/review table. Discord should insert into `submissions` with `status: "pending"`, `discordUserId`, `contentUrl`, `platform`, `campaign`, and event metadata. Only create a `videos` record after approval, or keep the current `videos` behavior explicitly separate from the review pipeline.

Why this matters:

The word "submission" currently means two different things: reviewable content in `submissions`, and raw tracked content in `videos`. That split will confuse operators and make reporting inconsistent.

### 2. Campaign is missing from creator form and Google Forms

Files:

- `src/components/dashboard/SubmitLinkView.tsx`
- `convex/http.ts`
- `convex/submissions.ts`

`SubmitLinkView` receives the active campaign prop, but `handleSubmit` does not pass it to `createSubmission`.

`/api/forms/submit` accepts `discordHandle`, `contentUrl`, `platform`, `datePosted`, `driveLink`, and `notes`, but does not read or forward `body.campaign`.

Recommended decision:

Every path that creates a `submissions` row should set campaign from a trusted source:

- Dashboard/manual: active campaign selector, not a free text input.
- Creator submit form: the component's `campaign` prop.
- Google Forms: fixed per form or explicit validated form field.
- CSV import: already uses the active campaign.
- Discord: infer from matched creator's campaign unless a campaign-specific channel is introduced.

### 3. Campaign validators are inconsistent

Files:

- `convex/schema.ts`
- `convex/submissions.ts`

The `creators` table restricts campaign to `"Afina" | "Sigma"`, but the `submissions` table allows `campaign: v.optional(v.string())`.

`submissions.bulkImport` validates campaign as `"Afina" | "Sigma"`, but `submissions.create` and `submissions.createInternal` accept any string.

Recommended decision:

Define one shared campaign validator for submissions and use it in schema, `create`, `createInternal`, and `bulkImport`.

Why this matters:

If one path stores `"afina"`, `"Afina Campaign"`, or `"Sigma "` the UI may still show it, but analytics and filters will eventually split the same campaign into multiple buckets.

### 4. Creator lookup is exact-match in Google Forms and Discord

Files:

- `convex/creators.ts`
- `convex/http.ts`
- `convex/discord.ts`
- `src/App.tsx`
- `src/components/dashboard/ImportView.tsx`

The current `getByDiscordHandle` query uses the `by_discord` index with exact equality. It does not lower-case, trim, or do fallback matching.

CSV import strips a leading `@`, but manual creator creation does not. Google Forms strips a leading `@` from the submitted handle. Discord sends `message.author.username`.

That means these values must match exactly:

- `creators.discordHandle`
- Google Forms `discordHandle`
- Discord `message.author.username`

Recommended decision:

Normalize Discord handles at write time and lookup time:

- Trim whitespace.
- Remove leading `@`.
- Lower-case into a canonical lookup field, or enforce lower-case in `discordHandle`.
- Prefer Discord user ID matching for the bot if creator records can store it.

Why this matters:

This is the most likely reason a "working" integration silently fails in production. A single capital letter or stored `@` prefix can stop Google Forms and Discord submissions from attaching to the creator.

### 5. Manual submission form still has platform drift

File:

- `src/components/dashboard/SubmissionsView.tsx`

The schema and backend validator allow TikTok, Instagram, YouTube, Facebook, Twitter, and Threads.

The creator submit form already exposes all six. The admin/manual modal still only offers TikTok, Instagram, YouTube, and Facebook, and its TypeScript cast only includes those four.

Recommended decision:

Use one shared platform list across all forms and import parsing.

### 6. Environment documentation is incomplete

Files:

- `.env.example`
- `.env.local`
- `discord-bot/.env.example`
- `convex/auth.config.js`
- `convex/http.ts`

The local `.env.local` has the important keys set, but root `.env.example` still documents only the old Gemini/AI Studio values.

The submission pipeline actually needs:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `FORMS_SECRET` in Convex environment variables
- `BOT_SECRET` in Convex environment variables
- Discord bot `.env`: `DISCORD_BOT_TOKEN`, `DISCORD_SUBMISSION_CHANNEL_ID`, `CONVEX_SITE_URL`, `BOT_SECRET`

Recommended decision:

Update root environment documentation before deployment. Missing docs here will create deployment failures even when code is correct.

---

## What Is Working

- TypeScript check passes: `npm.cmd run lint`.
- Clerk + Convex provider setup is present in `src/main.tsx`.
- Convex auth config uses `CLERK_JWT_ISSUER_DOMAIN`.
- HTTP endpoints require shared secrets:
  - Forms: `x-forms-secret` vs `process.env.FORMS_SECRET`
  - Discord bot: `x-bot-secret` vs `process.env.BOT_SECRET`
- `submissions.review` restricts approval/rejection to admin or manager roles.
- CSV submission import is the cleanest current path: it writes to `submissions`, applies campaign from the active dashboard campaign, and performs case-insensitive creator matching.
- `SubmitLinkView` now includes all six submission platforms.

---

## Recommended Implementation Order

### Phase 1 - Make data contracts consistent

1. Create shared validators/constants for campaign and platforms.
2. Restrict `submissions.campaign` to `"Afina" | "Sigma"` in schema and mutations.
3. Pass campaign from `SubmitLinkView` into `api.submissions.create`.
4. Replace the manual modal's campaign text input with active campaign assignment.
5. Add Twitter and Threads to the manual modal platform select.

### Phase 2 - Harden identity matching

1. Normalize creator `discordHandle` on creation/import/update.
2. Normalize Google Forms `discordHandle` before lookup.
3. Normalize Discord username before lookup.
4. Prefer storing and matching `discordUserId` for Discord bot submissions.

### Phase 3 - Decide Discord's role

Recommended backend design:

1. Bot detects a supported URL.
2. HTTP action validates `BOT_SECRET`.
3. Convex logs a `discord_events` row for observability.
4. If creator matches, insert a `submissions` row with `status: "pending"`.
5. Review approval can optionally create or update a `videos` row.

This keeps review workflow, audit trail, and analytics aligned.

### Phase 4 - Deployment readiness

1. Update `.env.example` and deployment notes with Clerk, Convex, forms, and bot variables.
2. Confirm Convex dashboard env vars are set for `CLERK_JWT_ISSUER_DOMAIN`, `FORMS_SECRET`, and `BOT_SECRET`.
3. Confirm `CONVEX_SITE_URL` uses the `.convex.site` URL for HTTP actions, not the client `VITE_CONVEX_URL`.
4. Create one test row through each path and verify it appears where expected.

---

## Verification Checklist

Use this checklist after fixes:

- Manual admin submission creates a `submissions` row with the active campaign.
- Creator submit form creates a `submissions` row with the active campaign, `datePosted`, and optional `driveLink`.
- Google Forms POST creates a `submissions` row with campaign and survives handles with or without `@`.
- CSV import creates pending `submissions` rows with the selected dashboard campaign.
- Discord bot message creates either a pending `submissions` row or is intentionally documented as analytics-only.
- A matched Discord submission stores `discordUserId` for traceability.
- Approve/reject only works for admin/manager.
- Viewer can read but cannot create or review submissions.
- Twitter and Threads are accepted everywhere they are meant to be accepted.
- Unknown creator handles return controlled errors and are visible to operators.

---

## Current Backend Judgment

The system is close, but the pipeline should not be considered production-ready until campaign propagation and Discord table alignment are fixed.

Best immediate success path:

Use CSV import and dashboard/manual submission for reliable operations right now. Treat Google Forms as usable only after campaign forwarding and handle normalization. Treat Discord as tracking-only until it writes into `submissions` or until the product explicitly decides Discord content should bypass review.
