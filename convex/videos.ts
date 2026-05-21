import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const videos = await ctx.db.query("videos").order("desc").collect();
    return Promise.all(
      videos.map(async (video) => {
        const creator = await ctx.db.get(video.creatorId);
        return {
          id: video._id as string,
          title: video.title,
          creatorName: creator?.name ?? "Unknown",
          platform: video.platform,
          views: video.views,
          revenue: video.revenue ?? 0,
          status: video.status,
          thumbnailUrl: video.thumbnailUrl,
          recordedAt: video.recordedAt,
          externalId: video.externalId,
          statsRefreshedAt: video.statsRefreshedAt,
        };
      })
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
