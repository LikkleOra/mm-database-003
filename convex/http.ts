import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Google Forms → Google Sheets → Apps Script → this endpoint
http.route({
  path: "/api/forms/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = request.headers.get("x-forms-secret");
    if (!secret || secret !== process.env.FORMS_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const discordHandle = (body.discordHandle ?? "").replace(/^@/, "");
    if (!discordHandle || !body.contentUrl || !body.platform) {
      return new Response(JSON.stringify({ error: "Missing required fields: discordHandle, contentUrl, platform" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Look up creator by discord handle
    const creator = await ctx.runQuery(api.creators.getByDiscordHandle, {
      discordHandle,
    });
    if (!creator) {
      return new Response(JSON.stringify({ error: `Creator not found: @${discordHandle}` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validPlatforms = ["TikTok", "Instagram", "YouTube", "Facebook", "Twitter", "Threads"];
    const platform = validPlatforms.find(
      (p) => p.toLowerCase() === (body.platform ?? "").toLowerCase()
    );
    if (!platform) {
      return new Response(JSON.stringify({ error: `Invalid platform: ${body.platform}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const campaign = body.campaign === "Afina" || body.campaign === "Sigma"
      ? (body.campaign as "Afina" | "Sigma")
      : undefined;

    const validContentTypes = ["talking_head", "ai_content", "slides"];
    const contentType = validContentTypes.includes(body.contentType)
      ? (body.contentType as "talking_head" | "ai_content" | "slides")
      : undefined;

    await ctx.runMutation(internal.submissions.createInternal, {
      creatorId: creator._id,
      platform: platform as "TikTok" | "Instagram" | "YouTube" | "Facebook" | "Twitter" | "Threads",
      contentUrl: body.contentUrl,
      datePosted: body.datePosted || undefined,
      driveLink: body.driveLink || undefined,
      notes: body.notes || undefined,
      campaign,
      contentType,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/discord/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret so only our bot can call this endpoint.
    const secret = request.headers.get("x-bot-secret");
    if (!secret || secret !== process.env.BOT_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(api.discord.processVideoSubmission, {
      discordUserId: body.discordUserId ?? "",
      discordUsername: body.discordUsername ?? "",
      platform: body.platform ?? "",
      videoUrl: body.videoUrl ?? "",
      videoId: body.videoId ?? "",
      messageId: body.messageId ?? "",
      channelId: body.channelId ?? "",
      guildId: body.guildId ?? "",
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
