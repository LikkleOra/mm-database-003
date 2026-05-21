import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Syncs the signed-in Clerk user into the Convex users table.
// Call this once on first sign-in from the frontend.
export const upsert = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Unknown",
      email: identity.email ?? "",
      role: "viewer",
    });
  },
});

// Returns the current user's record from the users table.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

// Returns all users — used by timeline (name resolution) and settings (team management).
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id as string,
      clerkId: u.clerkId,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  },
});

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db.query("users").withIndex("by_clerk", (q) => q.eq("clerkId", clerkId)).unique();
  },
});

// Admin-only: change any user's role.
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requester = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!requester || requester.role !== "admin")
      throw new Error("Unauthorized: admin only");

    await ctx.db.patch(args.userId, { role: args.role });
  },
});
