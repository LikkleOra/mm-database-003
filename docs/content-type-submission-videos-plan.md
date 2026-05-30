# Content Type Categories for Submitted Videos

## Summary

Add a first-class `contentType` field for creator submissions with exactly three values: `talking_head`, `ai_content`, and `slides`.

The submission pipeline remains the source of truth. The Videos page should automatically show submitted posts grouped and filterable by those content types, including pending, approved, and rejected states.

## Key Changes

- Extend the Convex `submissions` schema with optional `contentType` for backward compatibility, while requiring it in all new submission paths.
- Add optional `contentType` to `videos` for manually logged and stats-backed video records so existing video tooling does not break.
- Update all submission ingestion paths to collect, validate, and persist content type:
  - `SubmitLinkView`: add required creator-facing content type selection.
  - `SubmissionsView`: add content type to the admin/manual submission modal and show it in the queue.
  - `ImportView`: parse a CSV column like `Content Type`, accepting normalized values such as `Talking Head`, `AI Content`, and `Slides`.
  - `convex/http.ts`: accept `contentType` from Google Forms/App Script payloads.
  - `convex/submissions.ts`: validate and persist the field for `create`, `createInternal`, and `bulkImport`.
- Update the Videos page so `api.videos.list` returns a unified explorer feed from submissions plus existing videos.
- Add Videos page filters for `All`, `Talking Head`, `AI Content`, and `Slides`, plus status filtering for `Pending`, `Approved`, and `Rejected`.
- Pass the active Afina/Sigma campaign into `VideosView` and filter visible content consistently with the campaign switch.

## Backend Design

- Define shared Convex validators/constants for campaign, supported submission platforms, and video content type.
- Store stable enum values in the database and keep display labels in the UI.
- Treat `submissions` as the canonical source for pipeline-created content.
- Keep the existing `videos` table for manually logged videos and YouTube/stat refresh workflows.
- Do not auto-create duplicate `videos` rows for every submission unless a later stats workflow needs it.
- Keep current CSV/import duplicate behavior for now; do not introduce new dedupe rules as part of this change.

## Test Plan

- Run `npm run lint` or `tsc --noEmit`.
- Verify the creator submit form requires content type before submission.
- Verify manual admin submission saves content type.
- Verify CSV import accepts the content type column and rejects or flags invalid values.
- Verify Google Forms HTTP payloads with `contentType` create submissions.
- Verify the Videos page shows submitted posts automatically under the correct category.
- Verify pending, approved, and rejected submissions all appear on Videos with clear status.
- Verify the Afina/Sigma campaign switch limits visible items to the active campaign.
- Verify old records without `contentType` do not crash the page.

## Assumptions

- Videos should show all submission states, not only approved content.
- The three official categories are Talking Head Videos, AI Content, and Slides.
- No AI classification or automation will be added; creators, admins, forms, and CSV rows provide the category.
- Legacy records without a category remain readable and can be ignored or manually corrected later.
