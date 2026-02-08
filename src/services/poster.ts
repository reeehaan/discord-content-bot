import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { config } from "../config";
import {
  fetchYouTubeVideos,
  fetchChannelVideos,
  featuredChannels,
  YouTubeVideo,
} from "./youtube";

const postedLinks = new Set<string>();

function formatNumber(num: string): string {
  const n = parseInt(num);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return num;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = match[1] ? `${match[1]}:` : "";
  const m = match[2] || "0";
  const s = (match[3] || "0").padStart(2, "0");
  return `${h}${h ? m.padStart(2, "0") : m}:${s}`;
}

const topicTheme = {
  design: {
    color: 0x9b59b6 as number,
    icon: "\u{1f3a8}",
    label: "Art & Design",
    accent: "\u{1f58c}\u{fe0f}",
  },
  photography: {
    color: 0xe67e22 as number,
    icon: "\u{1f4f7}",
    label: "Photography",
    accent: "\u{1f305}",
  },
};

async function postYouTubeVideo(
  channel: TextChannel,
  video: YouTubeVideo,
  topic: "design" | "photography",
) {
  const url = `https://www.youtube.com/watch?v=${video.videoId}`;
  const theme = topicTheme[topic];
  const views = formatNumber(video.viewCount);
  const likes = formatNumber(video.likeCount);
  const duration = formatDuration(video.duration);

  const snippet =
    video.description.length > 100
      ? video.description.slice(0, 100).trim() + "\u2026"
      : video.description;

  const embed = new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: `${theme.accent}  ${video.channelTitle}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(video.channelTitle)}`,
    })
    .setTitle(`${video.title}`)
    .setURL(url)
    .setDescription(
      (snippet ? `> *${snippet}*\n\n` : "") +
        `\u{1f441}\u{fe0f}  \`${views}\`  ` +
        `\u{2022}  \u{1f44d}  \`${likes}\`  ` +
        (duration ? `\u{2022}  \u{23f1}\u{fe0f}  \`${duration}\`` : "") +
        `\n\u200b`,
    )
    .setImage(video.thumbnail)
    .addFields({
      name: "\u200b",
      value: `> \u{25b6}\u{fe0f}  [**Watch on YouTube  \u{2192}**](${url})`,
    })
    .setFooter({
      text: `${theme.icon}  ${theme.label}  \u{2502}  YouTube`,
    })
    .setTimestamp(new Date(video.publishedAt));

  await channel.send({ embeds: [embed] });
  postedLinks.add(url);
}

export async function aggregateAndPost(client: Client) {
  console.log(`[${new Date().toISOString()}] Running content aggregation...`);

  const designChannel = (await client.channels.fetch(
    config.designChannelId,
  )) as TextChannel;
  const photographyChannel = (await client.channels.fetch(
    config.photographyChannelId,
  )) as TextChannel;

  if (!designChannel || !photographyChannel) {
    console.error(
      "Could not find one or more channels. Check your channel IDs.",
    );
    return;
  }

  // Featured channels
  for (const fc of featuredChannels) {
    const channel = fc.topic === "design" ? designChannel : photographyChannel;
    const videos = await fetchChannelVideos(fc.channelId, 3);
    const newVideos = videos.filter(
      (v) => !postedLinks.has(`https://www.youtube.com/watch?v=${v.videoId}`),
    );

    if (newVideos.length === 0) {
      console.log(`  No new videos from featured channel`);
    } else {
      console.log(
        `  Posting ${newVideos.length} video(s) from ${newVideos[0]?.channelTitle || "featured channel"}`,
      );
      for (const video of newVideos) {
        try {
          await postYouTubeVideo(channel, video, fc.topic);
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          console.error(
            `  Failed to post featured video: ${video.title}`,
            error,
          );
        }
      }
    }
  }

  // YouTube search videos
  for (const topic of ["design", "photography"] as const) {
    const channel = topic === "design" ? designChannel : photographyChannel;
    const videos = await fetchYouTubeVideos(topic, 2);
    const newVideos = videos.filter(
      (v) => !postedLinks.has(`https://www.youtube.com/watch?v=${v.videoId}`),
    );

    if (newVideos.length === 0) {
      console.log(`  No new YouTube videos for ${topic}`);
      continue;
    }

    console.log(`  Posting ${newVideos.length} YouTube video(s) for ${topic}`);

    for (const video of newVideos) {
      try {
        await postYouTubeVideo(channel, video, topic);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(`  Failed to post YouTube video: ${video.title}`, error);
      }
    }
  }

  console.log("Content aggregation complete.");
}
