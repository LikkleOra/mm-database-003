import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const [videos, submissions] = await Promise.all([
      ctx.db.query("videos").order("desc").collect(),
      ctx.db.query("submissions").order("desc").collect(),
    ]);

    const allCreators = await ctx.db.query("creators").collect();
    const creatorMap = new Map(allCreators.map((c) => [c._id as string, c.name]));

    const videoItems = videos.map((video) => ({
      id: video._id as string,
      sourceType: "video" as const,
      title: video.title,
      creatorId: video.creatorId as string,
      creatorName: creatorMap.get(video.creatorId as string) ?? "Unknown",
      platform: video.platform as string,
      contentUrl: video.externalId ?? "",
      status: video.status,
      contentType: video.contentType as "talking_head" | "ai_content" | "slides" | undefined,
      campaign: undefined as "Afina" | "Sigma" | undefined,
      thumbnailUrl: video.thumbnailUrl,
      views: video.views,
      revenue: video.revenue ?? 0,
      recordedAt: video.recordedAt,
      externalId: video.externalId,
      statsRefreshedAt: video.statsRefreshedAt,
      analyticsViews: undefined as number | undefined,
      analyticsLikes: undefined as number | undefined,
      analyticsSnapshotLabel: undefined as string | undefined,
    }));

    // Fetch latest approved analytics snapshot for each submission
    const allSnapshots = await ctx.db.query("video_analytics_snapshots").collect();
    const approvedBySubmission = new Map<string, typeof allSnapshots[number]>();
    for (const snap of allSnapshots) {
      if (snap.status !== "approved") continue;
      const key = snap.submissionId as string;
      const existing = approvedBySubmission.get(key);
      if (!existing || snap.snapshotDate > existing.snapshotDate) {
        approvedBySubmission.set(key, snap);
      }
    }

    const submissionItems = submissions.map((sub) => {
      const snap = approvedBySubmission.get(sub._id as string);
      return {
        id: sub._id as string,
        sourceType: "submission" as const,
        title: `${sub.platform} post`,
        creatorId: sub.creatorId as string,
        creatorName: creatorMap.get(sub.creatorId as string) ?? "Unknown",
        platform: sub.platform as string,
        contentUrl: sub.contentUrl,
        status: sub.status,
        contentType: sub.contentType as "talking_head" | "ai_content" | "slides" | undefined,
        campaign: sub.campaign as "Afina" | "Sigma" | undefined,
        thumbnailUrl: undefined as string | undefined,
        views: 0,
        revenue: 0,
        recordedAt: sub.submittedAt,
        externalId: undefined as string | undefined,
        statsRefreshedAt: undefined as string | undefined,
        analyticsViews: snap?.views,
        analyticsLikes: snap?.likes,
        analyticsSnapshotLabel: snap?.snapshotLabel,
      };
    });

    return [...videoItems, ...submissionItems].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  },
});

export const create = mutation({
  args: {
    creatorId: v.id("creators"),
    platform: v.union(
      v.literal("TikTok"),
      v.literal("Instagram"),
      v.literal("YouTube"),
      v.literal("Facebook")
    ),
    title: v.string(),
    views: v.number(),
    revenue: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    contentType: v.optional(v.union(v.literal("talking_head"), v.literal("ai_content"), v.literal("slides"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized");

    return await ctx.db.insert("videos", {
      creatorId: args.creatorId,
      platform: args.platform,
      externalId: `manual_${Date.now()}`,
      title: args.title,
      views: args.views,
      revenue: args.revenue,
      thumbnailUrl: args.thumbnailUrl,
      contentType: args.contentType,
      status: "done",
      recordedAt: new Date().toISOString(),
    });
  },
});

export const listByCreator = query({
  args: { creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("videos")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .order("desc")
      .collect();
  },
});
