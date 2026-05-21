import { query } from "./_generated/server";
import { v } from "convex/values";

export const rankings = query({
  args: {
    period: v.union(v.literal("7d"), v.literal("mtd")),
    metric: v.union(v.literal("gmv"), v.literal("posts"), v.literal("orders")),
  },
  handler: async (ctx, { period, metric }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const creators = await ctx.db
      .query("creators")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const periodKey = period === "7d" ? "sevenDay" : "mtd";

    const entries = creators
      .map((c) => ({
        id: c._id as string,
        name: c.name,
        discordHandle: c.discordHandle,
        tier: c.tier,
        gmv: c.metrics?.[periodKey]?.gmv ?? 0,
        posts: c.metrics?.[periodKey]?.posts ?? 0,
        orders: c.metrics?.[periodKey]?.orders ?? 0,
        lives: c.metrics?.[periodKey]?.lives ?? 0,
      }))
      .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0));

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  },
});

export const topPerformers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const creators = await ctx.db
      .query("creators")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return creators
      .map((c) => ({
        id: c._id as string,
        name: c.name,
        tier: c.tier,
        mtdGmv: c.metrics?.mtd?.gmv ?? 0,
        sevenDayGmv: c.metrics?.sevenDay?.gmv ?? 0,
        mtdPosts: c.metrics?.mtd?.posts ?? 0,
      }))
      .sort((a, b) => b.mtdGmv - a.mtdGmv)
      .slice(0, 10)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  },
});