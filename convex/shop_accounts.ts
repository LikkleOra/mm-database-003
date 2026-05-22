import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const platformValidator = v.union(
  v.literal("TikTok"),
  v.literal("Instagram"),
  v.literal("YouTube"),
);

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const [entries, creators] = await Promise.all([
      ctx.db.query("shop_accounts").collect(),
      ctx.db.query("creators").collect(),
    ]);

    const creatorMap = new Map(creators.map((c) => [c._id as string, c.name]));

    return entries.map((e) => ({
      id: e._id as string,
      creatorId: e.creatorId as string,
      creatorName: creatorMap.get(e.creatorId as string) ?? "Unknown",
      platform: e.platform,
      shopName: e.shopName,
      adAccountName: e.adAccountName,
      shopUrl: e.shopUrl,
      verified: e.verified ?? false,
      notes: e.notes,
    }));
  },
});

export const listByCreator = query({
  args: { creatorId: v.id("creators") },
  handler: async (ctx, { creatorId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("shop_accounts")
      .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("shop_accounts")),
    creatorId: v.id("creators"),
    platform: platformValidator,
    shopName: v.optional(v.string()),
    adAccountName: v.optional(v.string()),
    shopUrl: v.string(),
    verified: v.optional(v.boolean()),
    notes: v.optional(v.string()),
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

    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, data);
      return id;
    }
    return ctx.db.insert("shop_accounts", data);
  },
});

export const setVerified = mutation({
  args: { id: v.id("shop_accounts"), verified: v.boolean() },
  handler: async (ctx, { id, verified }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized");

    await ctx.db.patch(id, { verified });
  },
});

export const remove = mutation({
  args: { id: v.id("shop_accounts") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || user.role !== "admin") throw new Error("Unauthorized: admin only");

    await ctx.db.delete(id);
  },
});
