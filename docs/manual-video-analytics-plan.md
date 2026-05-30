# Manual Video Analytics Submission Plan

## Summary

Add a manual analytics follow-up flow so creators can submit performance numbers from their own platform accounts without TikTok, Instagram, YouTube, Facebook, Threads, or Twitter/X API integrations.

Creators will first submit videos through the existing submission pipeline. Later, they will submit analytics snapshots for those videos with a Drive link as proof. Admins/managers review the submitted analytics in the dashboard before the numbers are used in performance views.

## Core Workflow

1. Creator submits a video link through the existing submission flow.
2. The video appears in the Submissions and Videos areas with campaign, creator, platform, content type, and review status.
3. After posting, the creator submits analytics as a follow-up snapshot for that specific video.
4. The creator enters the metrics manually and attaches a Drive link showing proof from the platform analytics screen.
5. Admins/managers review the analytics snapshot from the dashboard.
6. Approved analytics snapshots power video performance dashboards, rankings, and reports.

## Analytics Snapshot Model

Create a new `video_analytics_snapshots` table rather than storing only one analytics object on the video. This preserves historical performance over time.

Each snapshot should include:

- `submissionId` or `videoId`
- `creatorId`
- `campaign`
- `platform`
- `contentType`
- `snapshotLabel`, such as `24h`, `7d`, `30d`, or `custom`
- `snapshotDate`
- `views`
- `likes`
- `comments`
- `shares`
- `saves`
- `watchTime`
- `averageWatchDuration`
- `completionRate`
- `clicks`
- `orders`
- `revenue`
- `proofDriveLink`
- `status`: `pending`, `approved`, or `rejected`
- `reviewNote`
- `reviewedBy`
- `submittedAt`
- `reviewedAt`

Do not include GMV in v1.

## Dashboard Changes

- Add an analytics follow-up form where a creator or admin selects an existing submitted video and enters metrics.
- Add an admin review queue for analytics snapshots.
- Show proof Drive links directly in the review dashboard.
- Add performance views to the Videos page:
  - Filter by campaign, platform, creator, content type, status, and time range.
  - Show latest approved metrics on each video card.
  - Show snapshot history for a selected video.
  - Compare performance between Talking Head, AI Content, and Slides.
- Keep pending analytics visible to admins/managers, but exclude them from official performance totals until approved.

## Recommended Rules

- Analytics are submitted later as follow-up snapshots, not during the first video submission.
- Drive proof is required for every analytics snapshot.
- Admin/manager approval is required before metrics affect dashboards.
- Use snapshots so the team can compare 24-hour, 7-day, 30-day, and custom performance.
- If multiple approved snapshots exist for one video, dashboard summary cards should use the latest approved snapshot by default.
- Historical charts should use all approved snapshots.
- Rejected snapshots stay stored for audit history but are excluded from dashboards.

## Platform Support

Support all platforms currently accepted by the submission pipeline:

- TikTok
- Instagram
- YouTube
- Facebook
- Threads
- Twitter/X

The metric fields should stay mostly shared across platforms. If a platform does not expose a metric, creators can leave that field blank and the dashboard should show it as unavailable instead of zero.

## Implementation Notes

- Keep the existing submissions pipeline as the source of truth for videos.
- Link analytics snapshots to existing submitted videos instead of creating standalone analytics records.
- Add Convex mutations for creating and reviewing analytics snapshots.
- Add Convex queries for:
  - pending analytics review queue
  - latest approved analytics per video
  - snapshot history per video
  - aggregate performance by campaign, platform, creator, and content type
- Add validation for non-negative numeric metrics.
- Store percentage metrics like completion rate as numbers from `0` to `100`.
- Store duration/watch-time fields consistently, preferably as seconds.

## Test Plan

- Submit a video, then submit a follow-up analytics snapshot for it.
- Confirm the snapshot appears in the admin analytics review queue.
- Confirm Drive proof link opens from the dashboard.
- Approve a snapshot and verify it appears on the Videos performance view.
- Reject a snapshot and verify it does not affect performance totals.
- Submit multiple snapshots for the same video and verify the latest approved snapshot is used for summary metrics.
- Verify old videos without analytics still render safely.
- Verify campaign, platform, creator, and content type filters work together.
- Verify viewer roles cannot approve analytics.

## Assumptions

- Creators will provide analytics manually from their platform accounts.
- No platform APIs or automation will be added in v1.
- Drive links are enough proof for v1; file upload/storage can be added later if needed.
- GMV is intentionally excluded.
- Orders and revenue are still tracked because they were requested and may come from affiliate/shop reporting outside platform APIs.
