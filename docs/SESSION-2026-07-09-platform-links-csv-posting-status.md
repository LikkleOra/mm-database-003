# Session: Platform Links, CSV Import Fix, Posting Activity Tracking

**Date**: 2026-07-09
**Branch**: `claude/creator-profiles-platform-links-7exvnr`
**Scope**: Three targeted changes to the Afina-Sigma Creator Database

---

## 1. Platform Links Open in New Tab

**Problem**: Clicking a creator's linked platform (TikTok, Instagram, YouTube, etc.) in the profile drawer navigates away from the dashboard in the same tab. The user has to hit back and re-navigate to get back to where they were. Every other external link in the app (`SubmissionsView`, `AdShopView`, `VideosView`) already uses `target="_blank"` — this one was missed.

**Root Cause**: `src/components/creator/CreatorDetail.tsx` line 462 — the `<a>` tag rendering platform links has `href={acc.url}` but no `target="_blank"` or `rel="noopener noreferrer"`.

**Fix**: Add `target="_blank" rel="noopener noreferrer"` to the anchor tag. One-line change. Consistent with the rest of the codebase.

**Files Changed**:
- `src/components/creator/CreatorDetail.tsx`

---

## 2. CSV Import Stuck on Loading (Creator Stats)

**Problem**: When importing creator stats via CSV, the page gets stuck on the loading spinner and never completes. The import button shows "Importing..." indefinitely.

**Root Cause (diagnosed)**: Two issues working together:

1. **No batching**: `ImportView.tsx` line 451 sends the entire `parsedStats` array in a single Convex mutation call. For large datasets (50+ creators with per-platform metrics), this can exceed Convex's transaction read/write limits or argument size limits. When the mutation fails silently or times out, the Promise never resolves, and `isImporting` stays `true` forever.

2. **No progress feedback**: The UI shows a generic spinner with no indication of how far along the import is, so the user can't tell if it's working or stuck.

3. **Minor UI bug**: Line 613 displays the badge as `{count} submissions found` even when in stats mode, instead of `stats rows`.

**Fix**:
- Batch the stats import into chunks of 25 records on the frontend side
- Add a progress indicator showing `batch X of Y`
- Add a timeout wrapper (30s per batch) so the UI recovers from hung mutations
- Fix the badge text to correctly label stats rows
- Backend mutation stays the same — it already handles partial imports via upsert logic

**Files Changed**:
- `src/components/dashboard/ImportView.tsx`

---

## 3. Creator Posting Activity Tracking

**Problem**: There's no way to track whether a creator is actively posting on their linked platforms. Team members have to manually visit each creator's TikTok, Instagram, YouTube, etc. to check if they're posting. This is time-consuming with 50+ creators.

**Solution**: Add a `postingStatus` field to each social account (platform link) that can be set via a dropdown in the creator profile. This gives the team a quick at-a-glance view of who's active and who's gone quiet, right from the platform integrations section.

**Values**:
| Status | Label | Color | Meaning |
|--------|-------|-------|---------|
| `posting_consistently` | Consistent | Green | Creator posts regularly on this platform |
| `posting_occasionally` | Occasional | Yellow/Amber | Creator posts but not consistently |
| `not_posting` | Not Posting | Red | Creator has gone silent on this platform |
| `null` / not set | Not Evaluated | Gray | Status hasn't been assessed yet |

**Schema Change** (`convex/schema.ts`):
```
social_accounts: {
  ...existing fields,
  postingStatus: v.optional(v.union(
    v.literal("posting_consistently"),
    v.literal("posting_occasionally"),
    v.literal("not_posting")
  ))
}
```

**Backend** (`convex/social_accounts.ts`):
- New `updatePostingStatus` mutation — takes account ID + status, validates auth (admin/manager only)

**Frontend** (`src/components/creator/CreatorDetail.tsx`):
- Dropdown selector on each platform card in the "Platform Integrations" section
- Color-coded status badge visible at a glance
- Only editable by users with write permissions (admin/manager)
- Click the dropdown to change status without leaving the profile

**Files Changed**:
- `convex/schema.ts`
- `convex/social_accounts.ts`
- `src/components/creator/CreatorDetail.tsx`

---

## 4. Future: GitHub Integration for Creator Communication

**Status**: Deferred — requires further scoping.

**Concept**: Connect the database to GitHub to track and communicate with creators. Potential approaches:
- GitHub Issues as a CRM layer — one issue per creator, labels for status
- GitHub Discussions for async creator communication
- Webhook bridge between Discord bot and GitHub for cross-platform tracking

**Open Questions**:
- What specific workflows need GitHub integration?
- Should this replace or supplement the existing Discord bot pipeline?
- Which GitHub org/repo would house the creator tracking?

This will be scoped in a follow-up session once the three changes above are shipped and validated.

---

## Implementation Order

1. Platform links → new tab (5 min, zero risk)
2. CSV import fix with batching (30 min, medium complexity)
3. Posting activity status feature (45 min, schema migration + UI)

All changes are backwards-compatible. The schema migration adds optional fields only.
