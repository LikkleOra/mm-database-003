import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const VALID_PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook"] as const;
type VideoPlatform = typeof VALID_PLATFORMS[number];

/**
 * Called by the Discord bot via the Convex HTTP action.
 * Finds the creator by Discord handle, logs the event, and creates a video record.
 */
export const processVideoSubmission = mutation({
  args: {
    discordUserId: v.string(),
    discordUsername: v.string(),
    platform: v.string(),
    videoUrl: v.string(),
    videoId: v.string(),
    messageId: v.string(),
    channelId: v.string(),
    guildId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find creator by Discord handle first so we know if it matched.
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_discord", (q) => q.eq("discordHandle", args.discordUsername))
      .unique();

    const matched = creator !== null;
    const platform = VALID_PLATFORMS.includes(args.platform as VideoPlatform)
      ? (args.platform as VideoPlatform)
      : null;

    // Always log the raw Discord event.
    await ctx.db.insert("discord_events", {
      type: "video_submission",
      discordUserId: args.discordUserId,
      payload: {
        discordUsername: args.discordUsername,
        platform: args.platform,
        videoUrl: args.videoUrl,
        videoId: args.videoId,
        messageId: args.messageId,
        channelId: args.channelId,
        guildId: args.guildId,
        matched,
        creatorName: creator?.name ?? null,
      },
      timestamp: new Date().toISOString(),
    });

    if (!creator) {
      return {
        success: false,
        error: `No creator found with Discord handle "${args.discordUsername}". Ask an admin to check your profile.`,
      };
    }

    if (!platform) {
      return {
        success: false,
        error: `Unsupported platform "${args.platform}". Supported: TikTok, Instagram, YouTube, Facebook.`,
      };
    }

    // Prevent duplicate submissions for the same video.
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
      .filter((q) => q.eq(q.field("externalId"), args.videoId))
      .first();

    if (existing) {
      return { success: true, creatorName: creator.name, duplicate: true };
    }

    await ctx.db.insert("videos", {
      creatorId: creator._id,
      platform,
      externalId: args.videoId,
      title: `${platform} — ${new Date().toLocaleDateString("en-ZA")}`,
      views: 0,
      status: "raw",
      recordedAt: new Date().toISOString(),
    });

    return { success: true, creatorName: creator.name, duplicate: false };
  },
});

/**
 * Returns the 100 most recent Discord events for the tracking view.
 */
export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const events = await ctx.db.query("discord_events").order("desc").take(100);
    return events.map((e) => ({
      id: e._id as string,
      type: e.type,
      discordUserId: e.discordUserId,
      payload: e.payload as Record<string, unknown>,
      timestamp: e.timestamp,
    }));
  },
});

/**
 * Admin/manager can manually assign an unmatched submission to a creator.
 * Updates the video record and marks the event as matched.
 */
export const assignSubmission = mutation({
  args: {
    eventId: v.id("discord_events"),
    creatorId: v.id("creators"),
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

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new Error("Creator not found");

    const payload = event.payload as Record<string, unknown>;
    const platform = VALID_PLATFORMS.includes(payload.platform as VideoPlatform)
      ? (payload.platform as VideoPlatform)
      : "TikTok";

    // Create the video record.
    await ctx.db.insert("videos", {
      creatorId: args.creatorId,
      platform,
      externalId: (payload.videoId as string) ?? `manual_${Date.now()}`,
      title: `${platform} — ${new Date().toLocaleDateString("en-ZA")}`,
      views: 0,
      status: "raw",
      recordedAt: new Date().toISOString(),
    });

    // Mark event as matched.
    await ctx.db.patch(args.eventId, {
      payload: { ...payload, matched: true, creatorName: creator.name },
    });
  },
});
