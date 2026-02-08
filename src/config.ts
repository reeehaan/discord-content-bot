import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: requireEnv("DISCORD_BOT_TOKEN"),
  designChannelId: requireEnv("DESIGN_CHANNEL_ID"),
  photographyChannelId: requireEnv("PHOTOGRAPHY_CHANNEL_ID"),
  youtubeApiKey: requireEnv("YOUTUBE_API_KEY"),
};
