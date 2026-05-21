require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// ── Env validation ──────────────────────────────────────────────────────────
const {
  DISCORD_BOT_TOKEN,
  DISCORD_SUBMISSION_CHANNEL_ID,
  CONVEX_SITE_URL,
  BOT_SECRET,
  DISCORD_LOG_CHANNEL_ID,
} = process.env;

if (!DISCORD_BOT_TOKEN || !DISCORD_SUBMISSION_CHANNEL_ID || !CONVEX_SITE_URL || !BOT_SECRET) {
  console.error('❌  Missing required env vars. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

// ── Discord client ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // requires "Message Content Intent" in the portal
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ── URL detection ───────────────────────────────────────────────────────────
const PLATFORM_PATTERNS = [
  { platform: 'TikTok',    regex: /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i },
  { platform: 'YouTube',   regex: /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/i },
  { platform: 'Instagram', regex: /https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[^\s]+/i },
  { platform: 'Facebook',  regex: /https?:\/\/(www\.|m\.)?facebook\.com\/(watch|reel|videos|share)[^\s]*/i },
];

function detectPlatform(text) {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    const match = text.match(regex);
    if (match) return { platform, url: match[0].replace(/[)>.,]+$/, '') };
  }
  return null;
}

function extractVideoId(url, platform) {
  try {
    const u = new URL(url);
    if (platform === 'YouTube') {
      return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
    }
    if (platform === 'TikTok') {
      const m = url.match(/\/video\/(\d+)/);
      return m ? m[1] : u.pathname.split('/').filter(Boolean).pop();
    }
    if (platform === 'Instagram') {
      const m = url.match(/\/(reel|p)\/([\w\-]+)/);
      return m ? m[2] : null;
    }
    if (platform === 'Facebook') {
      return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
    }
  } catch {
    // malformed URL — fall back to timestamp
  }
  return `manual_${Date.now()}`;
}

// ── Convex submission ───────────────────────────────────────────────────────
async function submitToConvex(payload) {
  const res = await fetch(`${CONVEX_SITE_URL}/api/discord/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': BOT_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Message handler ─────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== DISCORD_SUBMISSION_CHANNEL_ID) return;

  const detected = detectPlatform(message.content);
  if (!detected) return; // message has no video link — ignore

  const { platform, url } = detected;
  const videoId = extractVideoId(url, platform) || `manual_${Date.now()}`;

  // Show typing indicator while processing
  try { await message.channel.sendTyping(); } catch { /* non-critical */ }

  try {
    const data = await submitToConvex({
      discordUserId:   message.author.id,
      discordUsername: message.author.username,
      platform,
      videoUrl:  url,
      videoId,
      messageId: message.id,
      channelId: message.channelId,
      guildId:   message.guildId ?? '',
    });

    if (data.success) {
      await message.react('✅');

      const suffix = data.duplicate
        ? '_(video already logged — no duplicate created)_'
        : '_Stats can be updated in the dashboard once the video has views._';

      await message.reply(
        `📹 **Logged!** ${platform} video captured for **${data.creatorName}**.\n${suffix}`
      );

      // Post to log channel if configured
      if (DISCORD_LOG_CHANNEL_ID && DISCORD_LOG_CHANNEL_ID !== DISCORD_SUBMISSION_CHANNEL_ID) {
        const logChannel = message.guild?.channels.cache.get(DISCORD_LOG_CHANNEL_ID);
        if (logChannel?.isTextBased()) {
          await logChannel.send(
            `✅ **${data.creatorName}** submitted a ${platform} video — <${url}>`
          );
        }
      }
    } else {
      await message.react('❓');
      await message.reply(
        `⚠️ **Couldn't match your submission.**\n` +
        `Make sure your Discord username (\`${message.author.username}\`) matches your ` +
        `**discordHandle** in the MM Database.\n` +
        `> Ask an admin to check your profile if this keeps happening.\n` +
        `> _Error: ${data.error}_`
      );
    }
  } catch (err) {
    console.error(`[bot] Failed to submit video from ${message.author.username}:`, err.message);
    await message.react('❌');
    await message.reply('❌ Something went wrong on our end. Please try again or contact an admin.');
  }
});

// ── Ready ───────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅  Bot online as ${client.user.tag}`);
  console.log(`📡  Watching channel: ${DISCORD_SUBMISSION_CHANNEL_ID}`);
  console.log(`🔗  Convex endpoint: ${CONVEX_SITE_URL}/api/discord/submit`);
});

client.on('error', (err) => console.error('[discord.js]', err));

client.login(DISCORD_BOT_TOKEN);
