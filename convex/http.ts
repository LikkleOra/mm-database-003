import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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
