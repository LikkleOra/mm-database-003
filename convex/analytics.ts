import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const metricsArgs = {
  views:                v.optional(v.number()),
  likes:                v.optional(v.number()),
  comments:             v.optional(v.number()),
  shares:               v.optional(v.number()),
  saves:                v.optional(v.number()),
  watchTime:            v.optional(v.number()),
  averageWatchDuration: v.optional(v.number()),
  completionRate:       v.optional(v.number()),
  clicks:               v.optional(v.number()),
  orders:               v.optional(v.number()),
  revenue:              v.optional(v.number()),
};

function validateMetrics(args: Record<string, number | undefined>) {
  const nonNeg = ["views", "likes", "comments", "shares", "saves", "watchTime",
    "averageWatchDuration", "clicks", "orders", "revenue"];
  for (const key of nonNeg) {
    const val = args[key];
    if (val !== undefined && val < 0) throw new Error(`${key} must be ≥ 0`);
  }
  if (args.completionRate !== undefined && (args.completionRate < 0 || args.completionRate > 100)) {
    throw new Error("completionRate must be between 0 and 100");
  }
}

export const create = mutation({
  args: {
    submissionId: v.id("submissions"),
    snapshotLabel: v.union(
      v.literal("24h"), v.literal("7d"), v.literal("30d"), v.literal("custom")
    ),
    snapshotDate: v.string(),
    proofDriveLink: v.string(),
    ...metricsArgs,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized: admin or manager required");

    validateMetrics({
      views: args.views, likes: args.likes, comments: args.comments,
      shares: args.shares, saves: args.saves, watchTime: args.watchTime,
      averageWatchDuration: args.averageWatchDuration, completionRate: args.completionRate,
      clicks: args.clicks, orders: args.orders, revenue: args.revenue,
    });

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    return ctx.db.insert("video_analytics_snapshots", {
      submissionId: args.submissionId,
      creatorId: submission.creatorId,
      campaign: submission.campaign,
      platform: submission.platform,
      contentType: submission.contentType,
      snapshotLabel: args.snapshotLabel,
      snapshotDate: args.snapshotDate,
      views: args.views,
      likes: args.likes,
      comments: args.comments,
      shares: args.shares,
      saves: args.saves,
      watchTime: args.watchTime,
      averageWatchDuration: args.averageWatchDuration,
      completionRate: args.completionRate,
      clicks: args.clicks,
      orders: args.orders,
      revenue: args.revenue,
      proofDriveLink: args.proofDriveLink,
      status: "pending",
      submittedBy: identity.subject,
      submittedAt: new Date().toISOString(),
    });
  },
});

export const review = mutation({
  args: {
    snapshotId: v.id("video_analytics_snapshots"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized: admin or manager required");

    await ctx.db.patch(args.snapshotId, {
      status: args.status,
      reviewNote: args.reviewNote,
      reviewedBy: identity.subject,
      reviewedAt: new Date().toISOString(),
    });
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const snapshots = await ctx.db
      .query("video_analytics_snapshots")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return Promise.all(
      snapshots.map(async (snap) => {
        const [creator, submission] = await Promise.all([
          ctx.db.get(snap.creatorId),
          ctx.db.get(snap.submissionId),
        ]);
        return {
          id: snap._id as string,
          submissionId: snap.submissionId as string,
          creatorName: creator?.name ?? "Unknown",
          platform: snap.platform,
          contentType: snap.contentType,
          snapshotLabel: snap.snapshotLabel,
          snapshotDate: snap.snapshotDate,
          contentUrl: submission?.contentUrl ?? "",
          views: snap.views,
          likes: snap.likes,
          comments: snap.comments,
          shares: snap.shares,
          saves: snap.saves,
          watchTime: snap.watchTime,
          averageWatchDuration: snap.averageWatchDuration,
          completionRate: snap.completionRate,
          clicks: snap.clicks,
          orders: snap.orders,
          revenue: snap.revenue,
          proofDriveLink: snap.proofDriveLink,
          campaign: snap.campaign,
          submittedAt: snap.submittedAt,
        };
      })
    );
  },
});

export const latestApprovedBySubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const snapshots = await ctx.db
      .query("video_analytics_snapshots")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .collect();

    const approved = snapshots
      .filter((s) => s.status === "approved")
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate));

    if (approved.length === 0) return null;
    const snap = approved[0];
    return {
      views: snap.views,
      likes: snap.likes,
      comments: snap.comments,
      shares: snap.shares,
      snapshotLabel: snap.snapshotLabel,
      snapshotDate: snap.snapshotDate,
    };
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pending: 0 };

    const pending = await ctx.db
      .query("video_analytics_snapshots")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return { pending: pending.length };
  },
});
