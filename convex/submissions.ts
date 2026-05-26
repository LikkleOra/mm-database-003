import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    )),
  },
  handler: async (ctx, { status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const all = status
      ? await ctx.db
          .query("submissions")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("submissions").order("desc").collect();

    return Promise.all(
      all.map(async (s) => {
        const creator = await ctx.db.get(s.creatorId);
        return {
          id: s._id as string,
          creatorId: s.creatorId as string,
          creatorName: creator?.name ?? "Unknown",
          creatorTier: creator?.tier ?? "Bronze",
          platform: s.platform,
          contentUrl: s.contentUrl,
          datePosted: s.datePosted,
          driveLink: s.driveLink,
          campaign: s.campaign,
          affiliateLink: s.affiliateLink,
          notes: s.notes,
          status: s.status,
          reviewNote: s.reviewNote,
          reviewedBy: s.reviewedBy,
          submittedAt: s.submittedAt,
          contentTags: s.contentTags ?? [],
          discordUserId: s.discordUserId,
        };
      })
    );
  },
});

const platformValidator = v.union(
  v.literal("TikTok"),
  v.literal("Instagram"),
  v.literal("YouTube"),
  v.literal("Facebook"),
  v.literal("Twitter"),
  v.literal("Threads"),
);

// Called from HTTP actions (Google Forms, Discord bot) — no user session available
export const createInternal = internalMutation({
  args: {
    creatorId: v.id("creators"),
    platform: platformValidator,
    contentUrl: v.string(),
    datePosted: v.optional(v.string()),
    driveLink: v.optional(v.string()),
    campaign: v.optional(v.union(v.literal("Afina"), v.literal("Sigma"))),
    affiliateLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    discordUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("submissions", {
      ...args,
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
  },
});

export const create = mutation({
  args: {
    creatorId: v.id("creators"),
    platform: platformValidator,
    contentUrl: v.string(),
    datePosted: v.optional(v.string()),
    driveLink: v.optional(v.string()),
    campaign: v.optional(v.union(v.literal("Afina"), v.literal("Sigma"))),
    affiliateLink: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return ctx.db.insert("submissions", {
      ...args,
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
  },
});

export const review = mutation({
  args: {
    submissionId: v.id("submissions"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNote: v.optional(v.string()),
    contentTags: v.optional(v.array(v.string())),
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

    await ctx.db.patch(args.submissionId, {
      status: args.status,
      reviewNote: args.reviewNote,
      reviewedBy: identity.subject,
      contentTags: args.contentTags,
    });
  },
});

export const bulkImport = mutation({
  args: {
    campaign: v.optional(v.union(v.literal("Afina"), v.literal("Sigma"))),
    submissions: v.array(v.object({
      creatorDiscordHandle: v.string(),
      contentUrl: v.string(),
      platform: platformValidator,
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Match creators across ALL campaigns so the handle lookup always works
    const allCreators = await ctx.db.query("creators").collect();
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sub of args.submissions) {
      const creator = allCreators.find(
        (c) => c.discordHandle.toLowerCase() === sub.creatorDiscordHandle.toLowerCase()
      );
      if (!creator) {
        errors.push(`Creator not found: @${sub.creatorDiscordHandle}`);
        skipped++;
        continue;
      }
      await ctx.db.insert("submissions", {
        creatorId: creator._id,
        platform: sub.platform,
        contentUrl: sub.contentUrl,
        notes: sub.notes,
        campaign: args.campaign,
        status: "pending",
        submittedAt: new Date().toISOString(),
      });
      created++;
    }

    return { created, skipped, errors };
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { pending: 0, approved: 0, rejected: 0 };

    const [pending, approved, rejected] = await Promise.all([
      ctx.db.query("submissions").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("submissions").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("submissions").withIndex("by_status", (q) => q.eq("status", "rejected")).collect(),
    ]);

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    };
  },
});
