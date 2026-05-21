import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const remove = mutation({
  args: { id: v.id("activities") },
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

export const create = mutation({
  args: {
    creatorId: v.id("creators"),
    type: v.union(
      v.literal("win"),
      v.literal("loss"),
      v.literal("observation"),
      v.literal("adjustment")
    ),
    title: v.string(),
    description: v.string(),
    impact: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("activities", {
      creatorId: args.creatorId,
      type: args.type,
      title: args.title,
      description: args.description,
      impact: args.impact,
      recordedBy: identity.subject,
      recordedAt: new Date().toISOString(),
    });
  },
});

export const listByCreator = query({
  args: { creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const docs = await ctx.db
      .query("activities")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .order("desc")
      .collect();

    return docs.map((doc) => ({
      id: doc._id as string,
      creatorId: doc.creatorId as string,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      recordedBy: doc.recordedBy,
      recordedAt: doc.recordedAt,
      impact: doc.impact,
    }));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const docs = await ctx.db.query("activities").order("desc").collect();

    return docs.map((doc) => ({
      id: doc._id as string,
      creatorId: doc.creatorId as string,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      recordedBy: doc.recordedBy,
      recordedAt: doc.recordedAt,
      impact: doc.impact,
    }));
  },
});
