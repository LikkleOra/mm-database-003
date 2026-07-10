import { query } from "./_generated/server";
import { v } from "convex/values";

const campaignValidator = v.optional(v.union(v.literal("Afina"), v.literal("Sigma")));

const DAY_MS = 24 * 60 * 60 * 1000;

type ActivityStatus = "active" | "slowing" | "inactive" | "never_posted";

export const list = query({
  args: { campaign: campaignValidator },
  handler: async (ctx, { campaign }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const [creators, approvedSubmissions, allAccounts] = await Promise.all([
      campaign
        ? ctx.db.query("creators").withIndex("by_campaign", (q) => q.eq("campaign", campaign)).collect()
        : ctx.db.query("creators").collect(),
      ctx.db.query("submissions").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("social_accounts").collect(),
    ]);

    const submissionsByCreator = new Map<string, typeof approvedSubmissions>();
    for (const sub of approvedSubmissions) {
      const key = sub.creatorId as string;
      if (!submissionsByCreator.has(key)) submissionsByCreator.set(key, []);
      submissionsByCreator.get(key)!.push(sub);
    }

    const accountsByCreator = new Map<string, typeof allAccounts>();
    for (const acc of allAccounts) {
      const key = acc.creatorId as string;
      if (!accountsByCreator.has(key)) accountsByCreator.set(key, []);
      accountsByCreator.get(key)!.push(acc);
    }

    const now = Date.now();

    return creators.map((creator) => {
      const creatorId = creator._id as string;
      const submissions = submissionsByCreator.get(creatorId) ?? [];

      const postDates = submissions
        .map((s) => s.datePosted ?? s.submittedAt)
        .filter((d): d is string => !!d)
        .map((d) => new Date(d).getTime())
        .filter((t) => !isNaN(t));

      const lastPostedAtMs = postDates.length > 0 ? Math.max(...postDates) : null;
      const lastPostedAt = lastPostedAtMs !== null ? new Date(lastPostedAtMs).toISOString() : null;
      const daysSinceLastPost = lastPostedAtMs !== null ? Math.floor((now - lastPostedAtMs) / DAY_MS) : null;

      const postsLast7d = postDates.filter((t) => now - t <= 7 * DAY_MS).length;
      const postsLast30d = postDates.filter((t) => now - t <= 30 * DAY_MS).length;

      let activityStatus: ActivityStatus;
      if (lastPostedAtMs === null) activityStatus = "never_posted";
      else if (daysSinceLastPost! <= 7) activityStatus = "active";
      else if (daysSinceLastPost! <= 30) activityStatus = "slowing";
      else activityStatus = "inactive";

      const platformCounts = new Map<string, { postCount: number; lastPostedAtMs: number | null }>();
      for (const sub of submissions) {
        const dateRaw = sub.datePosted ?? sub.submittedAt;
        const t = dateRaw ? new Date(dateRaw).getTime() : NaN;
        const entry = platformCounts.get(sub.platform) ?? { postCount: 0, lastPostedAtMs: null };
        entry.postCount += 1;
        if (!isNaN(t) && (entry.lastPostedAtMs === null || t > entry.lastPostedAtMs)) entry.lastPostedAtMs = t;
        platformCounts.set(sub.platform, entry);
      }
      const perPlatform = Array.from(platformCounts.entries()).map(([platform, v]) => ({
        platform,
        postCount: v.postCount,
        lastPostedAt: v.lastPostedAtMs !== null ? new Date(v.lastPostedAtMs).toISOString() : null,
      }));

      const accounts = (accountsByCreator.get(creatorId) ?? []).map((a) => ({
        id: a._id as string,
        platform: a.platform,
        handle: a.handle,
        postingStatus: a.postingStatus,
      }));

      return {
        id: creatorId,
        name: creator.name,
        discordHandle: creator.discordHandle,
        tier: creator.tier,
        isActive: creator.isActive,
        campaign: creator.campaign,
        lastPostedAt,
        daysSinceLastPost,
        postsLast7d,
        postsLast30d,
        totalApprovedPosts: submissions.length,
        activityStatus,
        perPlatform,
        accounts,
      };
    });
  },
});
