import { Telegraf } from "telegraf";

const BOT_TOKEN = "7302034755:AAEva6yS521VnflkVOnIkiFv6o8yYOXy1ec"; // 🔹 Замени на свой токен
const WEB_APP_URL = "https://fruitquest.vercel.app"; // 🔹 Ссылка на твой фронт

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("Добро пожаловать! Открыть приложение:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть приложение", web_app: { url: WEB_APP_URL } }],
      ],
    },
  });
});

bot.launch();
console.log("🤖 Бот запущен...");
