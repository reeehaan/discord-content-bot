import { Client, GatewayIntentBits } from "discord.js";
import cron from "node-cron";
import { config } from "./config";
import { aggregateAndPost } from "./services/poster";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}`);

  // Run immediately on startup
  aggregateAndPost(client);

  // Then run every 6 hours
  cron.schedule("0 */6 * * *", () => {
    aggregateAndPost(client);
  });

  console.log("Scheduled content aggregation every 6 hours.");
});

client.login(config.discordToken);
