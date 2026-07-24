import { requestUrl } from 'obsidian';
import { extractLatestMarketCap, MarketCapData } from '../utils/market-stats';

interface MarketCapCacheEntry {
	data: MarketCapData;
	timestamp: number;
}

export class MarketCapService {
	private cache = new Map<string, MarketCapCacheEntry>();
	private pendingRequests = new Map<string, Promise<MarketCapData | undefined>>();

	constructor(
		private cacheDuration: number,
		private userAgent: string
	) {}

	getMarketCap(yahooSymbol: string, forceRefresh: boolean): Promise<MarketCapData | undefined> {
		const cacheKey = yahooSymbol.toUpperCase().trim();
		const cached = this.cache.get(cacheKey);

		if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheDuration) {
			return Promise.resolve(cached.data);
		}

		const pendingRequest = this.pendingRequests.get(cacheKey);
		if (pendingRequest) {
			return pendingRequest;
		}

		const request = this.fetchAndCacheMarketCap(yahooSymbol, cacheKey);
		this.pendingRequests.set(cacheKey, request);
		return request;
	}

	private async fetchAndCacheMarketCap(
		yahooSymbol: string,
		cacheKey: string
	): Promise<MarketCapData | undefined> {
		try {
			const responseJson = await this.fetchYahooMarketCapResponse(yahooSymbol);
			const marketCapData = extractLatestMarketCap(responseJson);

			if (marketCapData) {
				this.cache.set(cacheKey, {
					data: marketCapData,
					timestamp: Date.now()
				});
			}

			return marketCapData;
		} finally {
			this.pendingRequests.delete(cacheKey);
		}
	}

	private async fetchYahooMarketCapResponse(yahooSymbol: string): Promise<unknown> {
		const secondsPerDay = 24 * 60 * 60;
		const period2 = Math.floor(Date.now() / 1000) + secondsPerDay;
		const period1 = period2 - 370 * secondsPerDay;
		const encodedSymbol = encodeURIComponent(yahooSymbol);
		const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodedSymbol}?symbol=${encodedSymbol}&type=trailingMarketCap&merge=false&period1=${period1}&period2=${period2}`;
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': this.userAgent
			}
		});

		return response.json;
	}

	clearCache(): void {
		this.cache.clear();
		this.pendingRequests.clear();
	}

	getCacheSize(): number {
		return this.cache.size;
	}

	getCacheMemorySizeBytes(): number {
		let totalBytes = 40;

		for (const [cacheKey, cacheEntry] of this.cache.entries()) {
			totalBytes += 32 + 24;
			totalBytes += cacheKey.length * 2 + 40;
			totalBytes += 8 + 24 + 8;

			if (cacheEntry.data.currency) {
				totalBytes += cacheEntry.data.currency.length * 2 + 40;
			}
		}

		return totalBytes;
	}

	setCacheDuration(cacheDuration: number): void {
		this.cacheDuration = cacheDuration;
	}
}
