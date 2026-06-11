import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const statsValidator = v.object({
  discordHandle: v.string(),
  month: v.string(),
  period: v.union(v.literal("bonus_collection"), v.literal("mid_month")),
  retainer: v.number(),
  directOrders: v.number(),
  indirectOrders: v.number(),
  totalOrders: v.number(),
  affiliateClicks: v.number(),
  totalPosts: v.number(),
  facebook: v.object({ views: v.number(), usViews: v.number() }),
  instagram: v.object({ views: v.number(), usViews: v.number() }),
  tiktok: v.object({ views: v.number(), usViews: v.number() }),
  threads: v.object({ views: v.number(), usViews: v.number() }),
  youtube: v.object({ views: v.number(), usViews: v.number() }),
  totalViews: v.number(),
  totalUsViews: v.number(),
});

export const bulkImport = mutation({
  args: {
    campaign: v.union(v.literal("Afina"), v.literal("Sigma")),
    stats: v.array(statsValidator),
  },
  handler: async (ctx, { campaign, stats }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "manager"))
      throw new Error("Unauthorized");

    let created = 0;
    let updated = 0;

    for (const s of stats) {
      const normalizedHandle = s.discordHandle.toLowerCase().replace(/^@/, "").trim();
      
      // Try to find the creator
      const creator = await ctx.db
        .query("creators")
        .withIndex("by_discord", (q) => q.eq("discordHandle", normalizedHandle))
        .unique();

      // Check for existing stats entry
      const existing = await ctx.db
        .query("creator_stats")
        .withIndex("by_campaign_period_month", (q) => 
          q.eq("campaign", campaign)
           .eq("period", s.period)
           .eq("month", s.month)
        )
        .filter((q) => q.eq(q.field("discordHandle"), normalizedHandle))
        .unique();

      const data = {
        ...s,
        discordHandle: normalizedHandle,
        creatorId: creator?._id,
        campaign,
        importedAt: new Date().toISOString(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated++;
      } else {
        await ctx.db.insert("creator_stats", data);
        created++;
      }
    }

    return { created, updated };
  },
});

export const list = query({
  args: {
    campaign: v.union(v.literal("Afina"), v.literal("Sigma")),
    period: v.union(v.literal("bonus_collection"), v.literal("mid_month")),
    month: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let q = ctx.db
      .query("creator_stats")
      .withIndex("by_campaign_period_month", (q) => {
        let query = q.eq("campaign", args.campaign).eq("period", args.period);
        if (args.month) {
          query = query.eq("month", args.month);
        }
        return query;
      });

    const stats = await q.collect();

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      return stats.filter((s) => s.discordHandle.toLowerCase().includes(searchLower));
    }

    return stats;
  },
});

export const getSummary = query({
  args: {
    campaign: v.union(v.literal("Afina"), v.literal("Sigma")),
    period: v.union(v.literal("bonus_collection"), v.literal("mid_month")),
    month: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    let q = ctx.db
      .query("creator_stats")
      .withIndex("by_campaign_period_month", (q) => {
        let query = q.eq("campaign", args.campaign).eq("period", args.period);
        if (args.month) {
          query = query.eq("month", args.month);
        }
        return query;
      });

    let stats = await q.collect();

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      stats = stats.filter((s) => s.discordHandle.toLowerCase().includes(searchLower));
    }

    const summary = {
      totalDirectOrders: 0,
      totalIndirectOrders: 0,
      totalOrders: 0,
      totalCreators: stats.length,
      totalRetainerUSD: 0,
      facebookViews: 0,
      facebookUsViews: 0,
      instagramViews: 0,
      instagramUsViews: 0,
      tiktokViews: 0,
      tiktokUsViews: 0,
      threadsViews: 0,
      threadsUsViews: 0,
      youtubeViews: 0,
      youtubeUsViews: 0,
      totalViews: 0,
      totalUsViews: 0,
      totalAffiliateClicks: 0,
      totalPosts: 0,
    };

    for (const s of stats) {
      summary.totalDirectOrders += s.directOrders;
      summary.totalIndirectOrders += s.indirectOrders;
      summary.totalOrders += s.totalOrders;
      summary.totalRetainerUSD += s.retainer;
      summary.facebookViews += s.facebook.views;
      summary.facebookUsViews += s.facebook.usViews;
      summary.instagramViews += s.instagram.views;
      summary.instagramUsViews += s.instagram.usViews;
      summary.tiktokViews += s.tiktok.views;
      summary.tiktokUsViews += s.tiktok.usViews;
      summary.threadsViews += s.threads.views;
      summary.threadsUsViews += s.threads.usViews;
      summary.youtubeViews += s.youtube.views;
      summary.youtubeUsViews += s.youtube.usViews;
      summary.totalViews += s.totalViews;
      summary.totalUsViews += s.totalUsViews;
      summary.totalAffiliateClicks += s.affiliateClicks;
      summary.totalPosts += s.totalPosts;
    }

    return summary;
  },
});
