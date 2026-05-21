import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("paid"),
      v.literal("denied"),
    )),
  },
  handler: async (ctx, { status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const all = status
      ? await ctx.db
          .query("payouts")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("payouts").order("desc").collect();

    return Promise.all(
      all.map(async (p) => {
        const creator = await ctx.db.get(p.creatorId);
        return {
          id: p._id as string,
          creatorId: p.creatorId as string,
          creatorName: creator?.name ?? "Unknown",
          creatorTier: creator?.tier ?? "Bronze",
          amount: p.amount,
          period: p.period,
          status: p.status,
          notes: p.notes,
          createdAt: p.createdAt,
          processedAt: p.processedAt,
          createdBy: p.createdBy,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    creatorId: v.id("creators"),
    amount: v.number(),
    period: v.string(),
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
      throw new Error("Unauthorized: admin or manager required");

    return ctx.db.insert("payouts", {
      ...args,
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: identity.subject,
    });
  },
});

export const updateStatus = mutation({
  args: {
    payoutId: v.id("payouts"),
    status: v.union(
      v.literal("approved"),
      v.literal("paid"),
      v.literal("denied"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || user.role !== "admin")
      throw new Error("Unauthorized: admin only");

    const patch: { status: typeof args.status; notes?: string; processedAt?: string } = {
      status: args.status,
    };
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.status === "paid") patch.processedAt = new Date().toISOString();

    await ctx.db.patch(args.payoutId, patch);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pending: 0, approved: 0, paid: 0, denied: 0, totalPending: 0, totalPaid: 0 };

    const all = await ctx.db.query("payouts").collect();
    return {
      pending: all.filter((p) => p.status === "pending").length,
      approved: all.filter((p) => p.status === "approved").length,
      paid: all.filter((p) => p.status === "paid").length,
      denied: all.filter((p) => p.status === "denied").length,
      totalPending: all
        .filter((p) => p.status === "pending" || p.status === "approved")
        .reduce((s, p) => s + p.amount, 0),
      totalPaid: all
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + p.amount, 0),
    };
  },
});
