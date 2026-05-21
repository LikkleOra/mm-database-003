import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be" || u.hostname === "www.youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
  } catch {
    // invalid URL
  }
  return null;
}

export const getVideo = internalQuery({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => ctx.db.get(videoId),
});

export const listYouTubeVideos = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("videos")
      .withIndex("by_platform", (q) => q.eq("platform", "YouTube"))
      .collect();
  },
});

export const applyStats = internalMutation({
  args: {
    videoId: v.id("videos"),
    views: v.number(),
    title: v.string(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      views: args.views,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      statsRefreshedAt: new Date().toISOString(),
    });
  },
});

export const insertVideo = internalMutation({
  args: {
    creatorId: v.id("creators"),
    externalId: v.string(),
    title: v.string(),
    views: v.number(),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return ctx.db.insert("videos", {
      creatorId: args.creatorId,
      platform: "YouTube",
      externalId: args.externalId,
      title: args.title,
      views: args.views,
      status: "done",
      recordedAt: now,
      statsRefreshedAt: now,
      thumbnailUrl: args.thumbnailUrl,
    });
  },
});

export const fetchAndUpdateStats = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const video = await ctx.runQuery(internal.youtube.getVideo, { videoId });
    if (!video || video.platform !== "YouTube") return;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(video.externalId)}&key=${apiKey}`
    );
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = (await res.json()) as {
      items?: Array<{
        snippet: { title: string; thumbnails?: { medium?: { url: string } } };
        statistics: { viewCount?: string };
      }>;
    };
    const item = data.items?.[0];
    if (!item) return;

    await ctx.runMutation(internal.youtube.applyStats, {
      videoId,
      views: parseInt(item.statistics?.viewCount ?? "0", 10),
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
    });
  },
});

// Refresh a single video — called from the UI
export const refreshVideo = action({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runAction(internal.youtube.fetchAndUpdateStats, { videoId });
  },
});

// Refresh all YouTube videos — called by cron
export const refreshAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.runQuery(internal.youtube.listYouTubeVideos);
    await Promise.allSettled(
      videos.map((v) =>
        ctx.runAction(internal.youtube.fetchAndUpdateStats, { videoId: v._id })
      )
    );
  },
});

// Public "Refresh All" action — called from the UI
export const refreshAllVideos = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runAction(internal.youtube.refreshAll);
  },
});

// Log a YouTube video by URL — fetches real stats from YouTube API
export const logVideoByUrl = action({
  args: {
    creatorId: v.id("creators"),
    videoUrl: v.string(),
  },
  handler: async (ctx, { creatorId, videoUrl }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      throw new Error("Unauthorized: admin or manager required");
    }

    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      throw new Error(
        "Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/..."
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "YOUTUBE_API_KEY is not configured. Add it in Convex dashboard → Settings → Environment Variables."
      );
    }

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}&key=${apiKey}`
    );
    if (!res.ok) throw new Error(`YouTube API returned ${res.status}`);

    const data = (await res.json()) as {
      items?: Array<{
        snippet: { title: string; thumbnails?: { medium?: { url: string } } };
        statistics: { viewCount?: string };
      }>;
    };
    const item = data.items?.[0];
    if (!item) throw new Error("Video not found on YouTube. Check the URL.");

    await ctx.runMutation(internal.youtube.insertVideo, {
      creatorId,
      externalId: videoId,
      title: item.snippet.title,
      views: parseInt(item.statistics?.viewCount ?? "0", 10),
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
    });
  },
});
