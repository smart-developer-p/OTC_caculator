import axios from "axios";
import { writeFileSync } from "fs";
import { join } from "path";

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price";

/**
 * Fetches the current price of a token from CoinGecko API.
 * @param {string} ticker - The token symbol (e.g., "BTC", "ETH").
 * @returns {Promise<number | null>} The current price in USDT or null if not found.
 */


const getCoinGeckoCoinIdFromSymbol = async (symbol: string): Promise<string | null> => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
        console.log(response.data);
        writeFileSync(join("./", "list.txt"), JSON.stringify(response.data), "utf8");
        const coin = response.data.find((coin: { symbol: string; id: string; }) => coin.symbol === symbol.toLowerCase());
        return coin ? coin.id : null;
    } catch (error) {
        console.error('Error fetching coin list:', error);
        return null;
    }
};

const getCoinGeckoTokenPrice = async (coinId: string): Promise<number | null> => {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        return response.data[coinId]?.usd || null;
    } catch (error) {
        console.error(`Error fetching price for ${coinId}:`, error);
        return null;
    }
};

export const getTokenPrice = async (symbol: string) => {
    return null
    // const coinId = await getCoinGeckoCoinIdFromSymbol(symbol); // Get CoinGecko coin ID from symbol
    // console.log(coinId);
    // if (coinId) {
    //     const price = await getCoinGeckoTokenPrice(coinId); // Fetch price using coin ID
    //     return price;
    // } else {
    //     return null;
    // }
};


export function calculateDiscountedPrice(price: number, discount: number): number {
    return price * (1 - discount / 100);
}

export function calculateTotalTokens(invested: number, discountedPrice: number): number {
    return invested / discountedPrice;
}

export function validateInputs(price: number, discount: number, invested: number): boolean {
    return price > 0 && discount >= 0 && discount <= 100 && invested > 0;
}
