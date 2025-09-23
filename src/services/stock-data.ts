import { StockData, CacheEntry } from '../types';
import { requestUrl } from 'obsidian';
import { calculateOptimalDateRange } from '../utils/date-utils';

export class StockDataService {
	private cache = new Map<string, CacheEntry>();
	private cacheDuration: number;
	private useBusinessDays: boolean;
	private minDataPoints: number;
	
	constructor(
		cacheDurationMinutes: number = 5,
		useBusinessDays: boolean = true,
		minDataPoints: number = 2
	) {
		this.cacheDuration = cacheDurationMinutes * 60 * 1000; // Convert to milliseconds
		this.useBusinessDays = useBusinessDays;
		this.minDataPoints = minDataPoints;
	}
	
	async getStockData(symbol: string, days: number = 30): Promise<StockData> {
		const cacheKey = `${symbol}-${days}-${this.useBusinessDays}`;
		const cached = this.cache.get(cacheKey);
		
		if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
			return cached.data;
		}
		
		try {
			const data = await this.fetchRealStockData(symbol, days);
			this.cache.set(cacheKey, {
				data,
				timestamp: Date.now()
			});
			
			return data;
		} catch (error) {
			// Re-throw the error so the UI can show the Yahoo Finance failure
			throw new Error(`Yahoo Finance API failed for ${symbol}: ${error.message || 'Network or API error'}`);
		}
	}
	
	private async fetchRealStockData(symbol: string, days: number): Promise<StockData> {
		const cleanSymbol = symbol.toUpperCase().trim();
		
		// Calculate optimal date range using business day logic
		const dateRange = calculateOptimalDateRange(days, this.useBusinessDays);
		
		const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?period1=${dateRange.startDate}&period2=${dateRange.endDate}&interval=1d`;
		
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		if (!response.json || !response.json.chart || !response.json.chart.result) {
			throw new Error('Invalid response format from Yahoo Finance');
		}
		
		const result = response.json.chart.result[0];
		if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
			throw new Error(`No data found for symbol ${cleanSymbol}`);
		}
		
		const timestamps = result.timestamp;
		const quotes = result.indicators.quote[0];
		const closePrices = quotes.close;
		
		// Filter out null values and ensure we have valid data
		const validData: { timestamp: number; price: number }[] = [];
		for (let i = 0; i < timestamps.length; i++) {
			if (closePrices[i] != null && !isNaN(closePrices[i])) {
				validData.push({
					timestamp: timestamps[i] * 1000, // Convert to milliseconds
					price: Number(closePrices[i])
				});
			}
		}
		
		if (validData.length === 0) {
			throw new Error(`No valid price data found for ${cleanSymbol}`);
		}
		
		// Sort by timestamp to ensure chronological order
		validData.sort((a, b) => a.timestamp - b.timestamp);
		
		// For small datasets (like 1-day requests), be more selective about deduplication
		let finalData = validData;
		
		// Only deduplicate if we have many data points, to avoid losing necessary chart data
		if (validData.length > days * 2) {
			// Deduplicate data points from the same calendar date (keep the latest price for each day)
			const dailyData = new Map<string, { timestamp: number; price: number }>();
			for (const dataPoint of validData) {
				const date = new Date(dataPoint.timestamp);
				const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
				
				// Keep the latest data point for each day (or overwrite with later timestamp)
				if (!dailyData.has(dateKey) || dataPoint.timestamp > dailyData.get(dateKey)!.timestamp) {
					dailyData.set(dateKey, dataPoint);
				}
			}
			
			// Convert back to array and sort by timestamp
			finalData = Array.from(dailyData.values()).sort((a, b) => a.timestamp - b.timestamp);
		}
		
		// Ensure we have at least 2 data points for charting
		if (finalData.length < 2 && validData.length >= 2) {
			// If deduplication left us with too few points, use the original data
			finalData = validData;
		}
		
		const historicalPrices = finalData.map(d => d.price);
		const timestampsMs = finalData.map(d => d.timestamp);
		
		const latestPrice = historicalPrices[historicalPrices.length - 1];
		// Calculate change over the entire period (first day vs last day)
		const firstPrice = historicalPrices[0];
		
		const change = latestPrice - firstPrice;
		const changePercent = firstPrice !== 0 ? (change / firstPrice) * 100 : 0;
		
		// Calculate today's change if we have multiple days of data
		let todayChange: number | undefined;
		let todayChangePercent: number | undefined;

		if (days >= 2 && finalData.length >= 2) {
			const todayPrice = finalData[finalData.length - 1].price;
			const previousDayPrice = finalData[finalData.length - 2].price;
			
			todayChange = Number((todayPrice - previousDayPrice).toFixed(2));
			todayChangePercent = previousDayPrice !== 0 
				? Number(((todayChange / previousDayPrice) * 100).toFixed(2)) 
				: 0;
		}

		// Try to get currency from the meta data
		let currency = 'USD'; // Default to USD
		try {
			if (result.meta && result.meta.currency) {
				currency = result.meta.currency;
			}
		} catch (e) {
			// If currency detection fails, use symbol-based logic
			currency = this.detectCurrencyFromSymbol(cleanSymbol);
		}
		
		return {
			symbol: cleanSymbol,
			price: Number(latestPrice.toFixed(2)),
			change: Number(change.toFixed(2)),
			changePercent: Number(changePercent.toFixed(2)),
			todayChange,
			todayChangePercent,
			currency,
			historicalPrices,
			timestamps: timestampsMs
		};
	}
	
	private detectCurrencyFromSymbol(symbol: string): string {
		if (symbol.endsWith('.TO') || symbol.endsWith('.V')) {
			return 'CAD'; // Toronto Stock Exchange
		}
		if (symbol.endsWith('.L') || symbol.endsWith('.LON')) {
			return 'GBP'; // London Stock Exchange
		}
		if (symbol.endsWith('.F') || symbol.endsWith('.DE')) {
			return 'EUR'; // Frankfurt Stock Exchange
		}
		if (symbol.endsWith('.T') || symbol.endsWith('.TYO')) {
			return 'JPY'; // Tokyo Stock Exchange
		}
		if (symbol.endsWith('.AX') || symbol.endsWith('.ASX')) {
			return 'AUD'; // Australian Securities Exchange
		}
		if (symbol.endsWith('.HK')) {
			return 'HKD'; // Hong Kong Stock Exchange
		}
		// For common North American symbols without suffix, assume USD
		return 'USD';
	}
	
	clearCache(): void {
		this.cache.clear();
	}
	
	getCacheSize(): number {
		return this.cache.size;
	}
	
	setCacheDuration(minutes: number): void {
		this.cacheDuration = minutes * 60 * 1000;
	}
	
	setUseBusinessDays(useBusinessDays: boolean): void {
		this.useBusinessDays = useBusinessDays;
		// Clear cache when settings change to ensure fresh data
		this.clearCache();
	}
	
	setMinDataPoints(minDataPoints: number): void {
		this.minDataPoints = Math.max(2, minDataPoints);
		// Clear cache when settings change to ensure fresh data
		this.clearCache();
	}
}
