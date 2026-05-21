import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("viewer")),
  }).index("by_clerk", ["clerkId"]),

  creators: defineTable({
    name: v.string(),
    discordHandle: v.string(),
    tier: v.union(v.literal("Bronze"), v.literal("Silver"), v.literal("Gold"), v.literal("Platinum")),
    isActive: v.boolean(),
    commissionRate: v.number(),
    managerId: v.optional(v.string()),
    joinedAt: v.string(),
    metrics: v.optional(v.object({
      mtd: v.object({ gmv: v.number(), posts: v.number(), lives: v.number(), orders: v.number() }),
      sevenDay: v.object({ gmv: v.number(), posts: v.number(), lives: v.number(), orders: v.number() }),
    })),
    profile: v.optional(v.object({
      realName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      location: v.optional(v.string()),
      niche: v.optional(v.string()),
      contentFormat: v.optional(v.string()),
      toneVibe: v.optional(v.string()),
      postingFrequency: v.optional(v.string()),
    })),
  }).index("by_discord", ["discordHandle"]),

  social_accounts: defineTable({
    creatorId: v.id("creators"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram"), v.literal("YouTube"), v.literal("Facebook"), v.literal("Twitch")),
    handle: v.string(),
    url: v.string(),
  }).index("by_creator", ["creatorId"]),

  videos: defineTable({
    creatorId: v.id("creators"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram"), v.literal("YouTube"), v.literal("Facebook")),
    externalId: v.string(), // ID from the platform
    thumbnailUrl: v.optional(v.string()),
    title: v.string(),
    views: v.number(),
    revenue: v.optional(v.number()),
    status: v.union(v.literal("raw"), v.literal("processing"), v.literal("done")),
    metadata: v.optional(v.any()),
    recordedAt: v.string(),
    statsRefreshedAt: v.optional(v.string()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_platform", ["platform"]),

  activities: defineTable({
    creatorId: v.id("creators"),
    type: v.union(v.literal("win"), v.literal("loss"), v.literal("observation"), v.literal("adjustment")),
    title: v.string(),
    description: v.string(),
    recordedBy: v.string(), // clerkId
    recordedAt: v.string(),
    impact: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
  }).index("by_creator", ["creatorId"]),

  discord_events: defineTable({
    type: v.string(), // e.g., "join", "leave", "message"
    discordUserId: v.string(),
    payload: v.any(),
    timestamp: v.string(),
  }).index("by_type", ["type"]),

  submissions: defineTable({
    creatorId: v.id("creators"),
    platform: v.union(
      v.literal("TikTok"),
      v.literal("Instagram"),
      v.literal("YouTube"),
      v.literal("Facebook"),
      v.literal("Twitter"),
      v.literal("Threads"),
    ),
    contentUrl: v.string(),
    datePosted: v.optional(v.string()),
    driveLink: v.optional(v.string()),
    campaign: v.optional(v.string()),
    affiliateLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewNote: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    submittedAt: v.string(),
    contentTags: v.optional(v.array(v.string())),
    discordUserId: v.optional(v.string()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),

  payouts: defineTable({
    creatorId: v.id("creators"),
    amount: v.number(),
    period: v.string(), // "YYYY-MM"
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("paid"), v.literal("denied")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    processedAt: v.optional(v.string()),
    createdBy: v.string(), // clerkId
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),
});
