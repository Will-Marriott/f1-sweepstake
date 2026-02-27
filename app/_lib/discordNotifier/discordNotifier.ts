import axios from "axios";

export const sendDiscordNotification = async (message: string) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(
      "DISCORD_WEBHOOK_URL is not defined in environment variables.",
    );
    return;
  }

  try {
    await axios.post(webhookUrl, { content: message });
  } catch (error) {
    console.error("Error sending Discord notification:", error);
  }
};
