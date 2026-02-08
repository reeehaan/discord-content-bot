import axios from "axios";
import { config } from "../config";

export interface YouTubeVideo {
  title: string;
  videoId: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  duration: string;
}

interface YouTubeSearchItem {
  id: { videoId: string };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
    thumbnails: { maxres?: { url: string }; high: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

const searchQueries: Record<string, string[]> = {
  design: [
    "figure drawing tutorial",
    "concept art process",
    "anime drawing tutorial",
    "hand drawing techniques",
    "character design sketch",
    "gesture drawing practice",
    "traditional art illustration",
    "pencil sketching tips",
  ],
  photography: [
    "cinematic photography breakdown",
    "landscape photography tips",
    "portrait photography lighting",
    "street photography POV",
    "photo editing walkthrough",
  ],
};

// Channels to always fetch latest videos from
const featuredChannels: { channelId: string; topic: "design" | "photography" }[] = [
  { channelId: "UCLMkh2PYXpQh52d3m2bzNNA", topic: "design" }, // KeshArt
  { channelId: "UCHMoHLNzj_INZCrRNMVKSVA", topic: "design" }, // CanotStopPainting
  { channelId: "UCVlbtV-0IzNltDFmSsRxbrQ", topic: "design" }, // JoshArt02
  { channelId: "UCn7_Z4iVjVWvkkByrMnNybQ", topic: "design" }, // Kai_Rump
  { channelId: "UC0vD2yISVyw99FVEJ49OHWA", topic: "design" }, // hassaneart
  { channelId: "UCm5108VByLkHnu4-b-moBLQ", topic: "design" }, // Chommang
  { channelId: "UCXfE-XxquyKfDpOBal4wqWg", topic: "design" }, // rosiessketchbook
];

function getDurationSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || "0") * 3600 +
    parseInt(match[2] || "0") * 60 +
    parseInt(match[3] || "0")
  );
}

async function getVideoDetails(videoIds: string): Promise<YouTubeVideo[]> {
  const detailsResponse = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos",
    {
      params: {
        part: "snippet,statistics,contentDetails",
        id: videoIds,
        key: config.youtubeApiKey,
      },
    },
  );

  return detailsResponse.data.items
    .filter(
      (item: YouTubeVideoItem) =>
        getDurationSeconds(item.contentDetails.duration) >= 120,
    )
    .map((item: YouTubeVideoItem) => ({
      title: item.snippet.title,
      videoId: item.id,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.maxres?.url ||
        item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
      duration: item.contentDetails.duration,
    }));
}

export async function fetchChannelVideos(
  channelId: string,
  limit = 3,
): Promise<YouTubeVideo[]> {
  if (!config.youtubeApiKey) return [];

  try {
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "id",
          channelId,
          type: "video",
          order: "date",
          maxResults: limit,
          videoDuration: "medium",
          key: config.youtubeApiKey,
        },
      },
    );

    const videoIds = searchResponse.data.items
      .map((item: YouTubeSearchItem) => item.id.videoId)
      .join(",");

    if (!videoIds) return [];
    return getVideoDetails(videoIds);
  } catch (error) {
    console.error(`Failed to fetch channel videos (${channelId}):`, error);
    return [];
  }
}

export async function fetchYouTubeVideos(
  topic: "design" | "photography",
  limit = 2,
): Promise<YouTubeVideo[]> {
  if (!config.youtubeApiKey) {
    console.log("  YouTube API key not set, skipping YouTube videos.");
    return [];
  }

  const queries = searchQueries[topic];
  const query = queries[Math.floor(Math.random() * queries.length)];

  try {
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "id",
          q: query,
          type: "video",
          order: "viewCount",
          maxResults: 15,
          videoDuration: "medium",
          key: config.youtubeApiKey,
          publishedAfter: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );

    const videoIds = searchResponse.data.items
      .map((item: YouTubeSearchItem) => item.id.videoId)
      .join(",");

    if (!videoIds) return [];
    const videos = await getVideoDetails(videoIds);

    videos.sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount));

    return videos.slice(0, limit);
  } catch (error) {
    console.error(`Failed to fetch YouTube videos for "${topic}":`, error);
    return [];
  }
}

export { featuredChannels };
