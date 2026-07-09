import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    creatorId: v.id("creators"),
    platform: v.union(
      v.literal("TikTok"),
      v.literal("Instagram"),
      v.literal("YouTube"),
      v.literal("Facebook"),
      v.literal("Twitch"),
      v.literal("Threads")
    ),
    handle: v.string(),
    url: v.string(),
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

    return await ctx.db.insert("social_accounts", {
      creatorId: args.creatorId,
      platform: args.platform,
      handle: args.handle,
      url: args.url,
    });
  },
});

export const updatePostingStatus = mutation({
  args: {
    id: v.id("social_accounts"),
    postingStatus: v.optional(v.union(
      v.literal("posting_consistently"),
      v.literal("posting_occasionally"),
      v.literal("not_posting"),
    )),
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

    await ctx.db.patch(args.id, { postingStatus: args.postingStatus });
  },
});

export const remove = mutation({
  args: { id: v.id("social_accounts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});
