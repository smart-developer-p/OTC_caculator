import { Context, Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config";
import { calculateDiscountedPrice, calculateTotalTokens } from "./utils";
import { getTokenPrice } from "./utils";

// In-memory user sessions
const userSessions: { [chatId: string]: { step: string, Ticker: string, Price: number, Discount: number, Invested: number; }; } = {};

const bot = new Telegraf(BOT_TOKEN);

bot.telegram.setMyCommands([
    { command: "start", description: "Start bot." }
]);

bot.start((ctx: Context) => {
    // Initialize session for the user
    userSessions[(ctx.chat as any).id] = {
        step: "Ticker",
        Ticker: "",
        Price: 0,
        Discount: 0,
        Invested: 0
    };

    ctx.reply(
        "Welcome to the OTC Discount Calculator Bot! 🎉\n\n" +
        "Please enter the token symbol (e.g., $SOL)."
    );
});

bot.on("text", async (ctx: Context) => {
    const text = (ctx.message as any).text.trim();
    const userSession = userSessions[(ctx.chat as any).id];

    if (!userSession) {
        return ctx.reply("Please start the bot by typing /start.");
    }

    switch (userSession.step) {
        case "Ticker":
            if (!text.startsWith("$") || text.length < 2) {
                return ctx.reply("Invalid ticker format. Please enter a valid token symbol starting with '$' (e.g., $BTC).");
            }
            userSession.Ticker = text.replace("$", "").toUpperCase();

            // Fetch live price (optional)
            const livePrice = await getTokenPrice(userSession.Ticker);
            if (livePrice) {
                userSession.Price = livePrice;
                ctx.reply(`✅ Live price of $${userSession.Ticker} is ${userSession.Price} USDT.\n\nNow, enter the discount percentage (e.g., 10).`, {
                    reply_markup: {
                        keyboard: [['5', '10', "15"]],
                        resize_keyboard: true
                    }
                });
                userSession.step = "Discount";
            } else {
                ctx.reply(`Please enter the current price manually.`);
                userSession.step = "Price";
            }
            break;

        case "Price":
            const parsedPrice = parseFloat(text);
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
                return ctx.reply("❌ Invalid price. Please enter a valid numeric value (e.g., 150).");
            }
            userSession.Price = parsedPrice;
            ctx.reply("✅ Price recorded. Now, enter the discount percentage (e.g., 10).", {
                reply_markup: {
                    keyboard: [['5', '10', "15"]],
                    resize_keyboard: true
                }
            });
            userSession.step = "Discount";
            break;

        case "Discount":
            const parsedDiscount = parseFloat(text);
            if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
                return ctx.reply("❌ Invalid discount. Please enter a percentage between 0 and 100 (e.g., 10).");
            }
            userSession.Discount = parsedDiscount;
            ctx.reply("✅ Discount recorded. Now, enter the amount you want to invest in USDT (e.g., 5000).", {
                reply_markup: {
                    keyboard: [],
                    resize_keyboard: true
                }
            });
            userSession.step = "Invested";
            break;

        case "Invested":
            const parsedInvested = parseFloat(text);
            if (isNaN(parsedInvested) || parsedInvested <= 0) {
                return ctx.reply("❌ Invalid amount. Please enter a valid numeric value (e.g., 1000).");
            }
            userSession.Invested = parsedInvested;

            // Perform calculations
            const discountedPrice = calculateDiscountedPrice(userSession.Price, userSession.Discount);
            const totalTokens = calculateTotalTokens(userSession.Invested, discountedPrice);

            ctx.reply(
                `📊 *OTC Discount Calculation:*\n\n` +
                `💠 *Ticker:* $${userSession.Ticker}\n` +
                `💰 *Current Price:* ${userSession.Price.toFixed(6)} USDT\n` +
                `📉 *Discounted Percentage:* ${userSession.Discount}%\n` +
                `🎯 *Discounted Price:* ${discountedPrice.toFixed(6)} USDT\n` +
                `💵 *Total Invested:* ${userSession.Invested} USDT\n` +
                `📈 *Total Tokens:* ${totalTokens.toFixed(6)} $${userSession.Ticker}`,
                { parse_mode: "Markdown" }
            );

            // Reset flow after calculation
            userSession.step = "Ticker";
            ctx.reply("🔄 If you want to calculate again, enter a new token symbol (e.g., $ETH).");
            break;

        default:
            ctx.reply("Something went wrong. Please restart with /start.");
            userSession.step = "Ticker";
            break;
    }
});

bot.launch(() => console.log("✅ Bot started successfully!")).catch(err => console.log(err));
