import { StockData, CacheEntry, OHLCData, AssetType } from '../types';
import { requestUrl } from 'obsidian';
import { calculateOptimalDateRange } from '../utils/date-utils';
import { getErrorMessage } from '../utils/error-utils';

const YAHOO_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const SUPPORTED_CRYPTO_QUOTE_CURRENCY = 'USD';
const DEFAULT_PRICE_PRECISION = 2;
const MAX_CRYPTO_PRICE_PRECISION = 8;

interface MemorySizes {
	mapEntry: number;
	object: number;
	string: number;
	array: number;
	number: number;
	charBytes: number;
}

interface YahooQuote {
	close: unknown[];
	open?: unknown[];
	high?: unknown[];
	low?: unknown[];
}

interface YahooChartResult {
	meta?: {
		currency?: string;
		instrumentType?: string;
		priceHint?: number;
		symbol?: string;
	};
	timestamp: number[];
	indicators: {
		quote: YahooQuote[];
	};
}

interface YahooChartResponse {
	chart: {
		result: YahooChartResult[];
	};
}

interface StockDataRequestOptions {
	forceRefresh?: boolean;
}

interface YahooSearchQuote {
	symbol: string;
	quoteType?: string;
	exchange?: string;
}

interface YahooSearchResponse {
	quotes: YahooSearchQuote[];
}

interface StockDataPoint {
	timestamp: number;
	price: number;
	ohlc?: OHLCData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.every(item => typeof item === 'number');
}

function isYahooQuote(value: unknown): value is YahooQuote {
	if (!isRecord(value) || !Array.isArray(value.close)) {
		return false;
	}

	return (value.open === undefined || Array.isArray(value.open)) &&
		(value.high === undefined || Array.isArray(value.high)) &&
		(value.low === undefined || Array.isArray(value.low));
}

function isYahooChartResult(value: unknown): value is YahooChartResult {
	if (!isRecord(value) || !isNumberArray(value.timestamp) || !isRecord(value.indicators)) {
		return false;
	}

	const quote = value.indicators.quote;
	if (!Array.isArray(quote) || !quote.every(isYahooQuote)) {
		return false;
	}

	if (value.meta !== undefined) {
		if (!isRecord(value.meta)) {
			return false;
		}

		const currency = value.meta.currency;
		if (currency !== undefined && typeof currency !== 'string') {
			return false;
		}

		const instrumentType = value.meta.instrumentType;
		if (instrumentType !== undefined && typeof instrumentType !== 'string') {
			return false;
		}

		const priceHint = value.meta.priceHint;
		if (priceHint !== undefined && typeof priceHint !== 'number') {
			return false;
		}

		const symbol = value.meta.symbol;
		if (symbol !== undefined && typeof symbol !== 'string') {
			return false;
		}
	}

	return true;
}

function isYahooChartResponse(value: unknown): value is YahooChartResponse {
	if (!isRecord(value) || !isRecord(value.chart) || !Array.isArray(value.chart.result)) {
		return false;
	}

	return value.chart.result.every(isYahooChartResult);
}

function isYahooSearchQuote(value: unknown): value is YahooSearchQuote {
	if (!isRecord(value) || typeof value.symbol !== 'string') {
		return false;
	}

	return (value.quoteType === undefined || typeof value.quoteType === 'string') &&
		(value.exchange === undefined || typeof value.exchange === 'string');
}

function isYahooSearchResponse(value: unknown): value is YahooSearchResponse {
	if (!isRecord(value) || !Array.isArray(value.quotes)) {
		return false;
	}

	return value.quotes.every(isYahooSearchQuote);
}

function isValidPrice(price: unknown): price is number {
	return price != null && Number.isFinite(Number(price));
}

function createOHLCData(open: unknown, high: unknown, low: unknown, close: unknown): OHLCData | null {
	if (!isValidPrice(open) || !isValidPrice(high) || !isValidPrice(low) || !isValidPrice(close)) {
		return null;
	}

	return {
		open: Number(open),
		high: Number(high),
		low: Number(low),
		close: Number(close)
	};
}

export class StockDataService {
	private cache = new Map<string, CacheEntry>();
	private pendingRequests = new Map<string, Promise<StockData>>();
	private cryptoSymbolCache = new Map<string, string>();
	private pendingCryptoSymbolRequests = new Map<string, Promise<string>>();
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

	async getStockData(
		symbol: string,
		days: number = 30,
		includeOHLC: boolean = false,
		options: StockDataRequestOptions = {}
	): Promise<StockData> {
		const cleanSymbol = this.normalizeSymbol(symbol);
		const cacheKey = this.createCacheKey('stock', cleanSymbol, cleanSymbol, 'USD', days, includeOHLC);
		return this.getMarketData(
			'stock',
			cleanSymbol,
			cleanSymbol,
			cleanSymbol,
			'USD',
			days,
			includeOHLC,
			cacheKey,
			options
		);
	}

	async getCryptoData(
		symbol: string,
		quoteCurrency: string = SUPPORTED_CRYPTO_QUOTE_CURRENCY,
		days: number = 30,
		includeOHLC: boolean = false,
		options: StockDataRequestOptions = {}
	): Promise<StockData> {
		const cleanQuoteCurrency = this.normalizeSymbol(quoteCurrency);
		const displaySymbol = this.normalizeCryptoSymbol(symbol, cleanQuoteCurrency);

		if (cleanQuoteCurrency !== SUPPORTED_CRYPTO_QUOTE_CURRENCY) {
			throw new Error(`Only ${SUPPORTED_CRYPTO_QUOTE_CURRENCY} crypto quotes are supported in this version`);
		}

		const cryptoSymbolCacheKey = this.createCryptoSymbolCacheKey(displaySymbol, cleanQuoteCurrency);
		const cachedYahooSymbol = this.cryptoSymbolCache.get(cryptoSymbolCacheKey);
		if (cachedYahooSymbol) {
			try {
				return await this.getCryptoMarketData(displaySymbol, cachedYahooSymbol, cleanQuoteCurrency, days, includeOHLC, options);
			} catch {
				this.cryptoSymbolCache.delete(cryptoSymbolCacheKey);
			}
		}

		const directYahooSymbol = `${displaySymbol}-${cleanQuoteCurrency}`;
		try {
			const data = await this.getCryptoMarketData(displaySymbol, directYahooSymbol, cleanQuoteCurrency, days, includeOHLC, options);
			this.cryptoSymbolCache.set(cryptoSymbolCacheKey, directYahooSymbol);
			return data;
		} catch {
			const yahooSymbol = await this.resolveCryptoSymbol(displaySymbol, cleanQuoteCurrency);
			return this.getCryptoMarketData(displaySymbol, yahooSymbol, cleanQuoteCurrency, days, includeOHLC, options);
		}
	}

	private getCryptoMarketData(
		displaySymbol: string,
		yahooSymbol: string,
		quoteCurrency: string,
		days: number,
		includeOHLC: boolean,
		options: StockDataRequestOptions
	): Promise<StockData> {
		const cacheKey = this.createCacheKey('crypto', displaySymbol, yahooSymbol, quoteCurrency, days, includeOHLC);
		return this.getMarketData(
			'crypto',
			displaySymbol,
			yahooSymbol,
			displaySymbol,
			quoteCurrency,
			days,
			includeOHLC,
			cacheKey,
			options
		);
	}

	private async getMarketData(
		assetType: AssetType,
		inputSymbol: string,
		yahooSymbol: string,
		displaySymbol: string,
		quoteCurrency: string,
		days: number,
		includeOHLC: boolean,
		cacheKey: string,
		options: StockDataRequestOptions
	): Promise<StockData> {
		const cached = this.cache.get(cacheKey);

		if (!options.forceRefresh && cached && Date.now() - cached.timestamp < this.cacheDuration) {
			return cached.data;
		}

		const pendingRequest = this.pendingRequests.get(cacheKey);
		if (pendingRequest) {
			return pendingRequest;
		}

		const request = this.fetchAndCacheStockData(
			assetType,
			inputSymbol,
			yahooSymbol,
			displaySymbol,
			quoteCurrency,
			days,
			includeOHLC,
			cacheKey
		);
		this.pendingRequests.set(cacheKey, request);
		return request;
	}

	private async fetchAndCacheStockData(
		assetType: AssetType,
		inputSymbol: string,
		yahooSymbol: string,
		displaySymbol: string,
		quoteCurrency: string,
		days: number,
		includeOHLC: boolean,
		cacheKey: string
	): Promise<StockData> {
		try {
			const data = await this.fetchRealStockData(
				assetType,
				inputSymbol,
				yahooSymbol,
				displaySymbol,
				quoteCurrency,
				days,
				includeOHLC
			);
			this.cache.set(cacheKey, {
				data,
				timestamp: Date.now()
			});

			return data;
		} catch (error: unknown) {
			throw new Error(`Yahoo Finance API failed for ${inputSymbol}: ${getErrorMessage(error, 'Network or API error')}`);
		} finally {
			this.pendingRequests.delete(cacheKey);
		}
	}

	private createCacheKey(
		assetType: AssetType,
		inputSymbol: string,
		yahooSymbol: string,
		quoteCurrency: string,
		days: number,
		includeOHLC: boolean
	): string {
		return `${assetType}-${this.normalizeSymbol(inputSymbol)}-${this.normalizeSymbol(yahooSymbol)}-${quoteCurrency}-${days}-${this.useBusinessDays}-${includeOHLC}`;
	}

	private normalizeSymbol(symbol: string): string {
		return symbol.toUpperCase().trim();
	}

	private normalizeCryptoSymbol(symbol: string, quoteCurrency: string): string {
		const cleanSymbol = this.normalizeSymbol(symbol);
		const quoteSuffix = `-${quoteCurrency}`;
		return cleanSymbol.endsWith(quoteSuffix)
			? cleanSymbol.slice(0, -quoteSuffix.length)
			: cleanSymbol;
	}

	private createCryptoSymbolCacheKey(symbol: string, quoteCurrency: string): string {
		return `${this.normalizeSymbol(symbol)}-${quoteCurrency}`;
	}

	private async fetchRealStockData(
		assetType: AssetType,
		inputSymbol: string,
		yahooSymbol: string,
		displaySymbol: string,
		quoteCurrency: string,
		days: number,
		includeOHLC: boolean = false
	): Promise<StockData> {
		const useBusinessDays = assetType === 'stock' ? this.useBusinessDays : false;
		const dateRange = calculateOptimalDateRange(days, useBusinessDays);
		const responseJson = await this.fetchYahooChartResponse(
			yahooSymbol,
			`period1=${dateRange.startDate}&period2=${dateRange.endDate}&interval=1d`
		);

		if (!isYahooChartResponse(responseJson)) {
			throw new Error('Invalid response format from Yahoo Finance');
		}

		const result = responseJson.chart.result[0];
		const quotes = result?.indicators.quote[0];
		if (!result || !quotes) {
			throw new Error(`No data found for symbol ${yahooSymbol}`);
		}

		if (assetType === 'crypto' && result.meta?.instrumentType !== 'CRYPTOCURRENCY') {
			throw new Error(`${inputSymbol} did not resolve to a Yahoo Finance cryptocurrency`);
		}

		const timestamps = result.timestamp;
		const closePrices = quotes.close;
		const openPrices = quotes.open;
		const highPrices = quotes.high;
		const lowPrices = quotes.low;

		const validData: StockDataPoint[] = [];

		for (let i = 0; i < timestamps.length; i++) {
			if (!isValidPrice(closePrices[i])) {
				continue;
			}

			const dataPoint: StockDataPoint = {
				timestamp: timestamps[i] * 1000,
				price: Number(closePrices[i])
			};

			if (includeOHLC) {
				const ohlc = createOHLCData(
					openPrices?.[i],
					highPrices?.[i],
					lowPrices?.[i],
					closePrices[i]
				);

				if (ohlc) {
					dataPoint.ohlc = ohlc;
				}
			}

			validData.push(dataPoint);
		}

		if (validData.length === 0) {
			throw new Error(`No valid price data found for ${yahooSymbol}`);
		}

		validData.sort((a, b) => a.timestamp - b.timestamp);

		const finalData = assetType === 'crypto'
			? this.trimCryptoData(validData, days)
			: this.prepareStockDataPoints(validData, days);

		const historicalPrices = finalData.map(d => d.price);
		const timestampsMs = finalData.map(d => d.timestamp);

		let ohlcData: OHLCData[] | undefined;
		if (includeOHLC) {
			ohlcData = [];
			for (const dataPoint of finalData) {
				if (dataPoint.ohlc) {
					ohlcData.push(dataPoint.ohlc);
				}
			}
			if (ohlcData.length === 0) {
				ohlcData = undefined;
			}
		}

		const latestPrice = historicalPrices[historicalPrices.length - 1];
		const firstPrice = historicalPrices[0];

		const change = latestPrice - firstPrice;
		const changePercent = firstPrice !== 0 ? (change / firstPrice) * 100 : 0;

		let todayChange: number | undefined;
		let todayChangePercent: number | undefined;

		if (days >= 2 && finalData.length >= 2) {
			const todayPrice = finalData[finalData.length - 1].price;
			const previousDayPrice = finalData[finalData.length - 2].price;

			todayChange = this.formatStoredPrice(todayPrice - previousDayPrice, assetType);
			todayChangePercent = previousDayPrice !== 0
				? Number(((todayChange / previousDayPrice) * 100).toFixed(2))
				: 0;
		}

		const currency = result.meta?.currency ?? (assetType === 'crypto' ? quoteCurrency : this.detectCurrencyFromSymbol(yahooSymbol));
		const pricePrecision = assetType === 'crypto'
			? this.calculateCryptoPricePrecision(result.meta?.priceHint, historicalPrices)
			: undefined;

		const stockData: StockData = {
			symbol: displaySymbol,
			displaySymbol,
			yahooSymbol,
			assetType,
			price: this.formatStoredPrice(latestPrice, assetType),
			change: this.formatStoredPrice(change, assetType),
			changePercent: Number(changePercent.toFixed(2)),
			todayChange,
			todayChangePercent,
			currency,
			pricePrecision,
			historicalPrices,
			timestamps: timestampsMs
		};

		if (includeOHLC && ohlcData && ohlcData.length > 0) {
			stockData.ohlcData = ohlcData;
		}

		return stockData;
	}

	private async resolveCryptoSymbol(symbol: string, quoteCurrency: string): Promise<string> {
		const cacheKey = this.createCryptoSymbolCacheKey(symbol, quoteCurrency);
		const cachedSymbol = this.cryptoSymbolCache.get(cacheKey);
		if (cachedSymbol) {
			return cachedSymbol;
		}

		const pendingRequest = this.pendingCryptoSymbolRequests.get(cacheKey);
		if (pendingRequest) {
			return pendingRequest;
		}

		const request = this.searchAndCacheCryptoSymbol(symbol, quoteCurrency, cacheKey);
		this.pendingCryptoSymbolRequests.set(cacheKey, request);
		return request;
	}

	private async searchAndCacheCryptoSymbol(symbol: string, quoteCurrency: string, cacheKey: string): Promise<string> {
		try {
			const searchedSymbol = await this.searchYahooCryptoSymbol(symbol, quoteCurrency);
			if (searchedSymbol) {
				this.cryptoSymbolCache.set(cacheKey, searchedSymbol);
				return searchedSymbol;
			}

			throw new Error(`Crypto symbol ${symbol} could not be resolved on Yahoo Finance for ${quoteCurrency}`);
		} finally {
			this.pendingCryptoSymbolRequests.delete(cacheKey);
		}
	}

	private async searchYahooCryptoSymbol(symbol: string, quoteCurrency: string): Promise<string | null> {
		const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=10&newsCount=0`;
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': YAHOO_USER_AGENT
			}
		});

		const responseJson: unknown = response.json;
		if (!isYahooSearchResponse(responseJson)) {
			throw new Error('Invalid search response format from Yahoo Finance');
		}

		const directSymbol = `${symbol}-${quoteCurrency}`;
		const suffixedSymbolPattern = new RegExp(`^${this.escapeRegExp(symbol)}[0-9]+-${quoteCurrency}$`);

		for (const quote of responseJson.quotes) {
			if (quote.quoteType !== 'CRYPTOCURRENCY' || quote.exchange !== 'CCC') {
				continue;
			}

			if (quote.symbol === directSymbol || suffixedSymbolPattern.test(quote.symbol)) {
				return quote.symbol;
			}
		}

		return null;
	}

	private async fetchYahooChartResponse(yahooSymbol: string, queryString: string): Promise<unknown> {
		const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${queryString}`;
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: {
				'User-Agent': YAHOO_USER_AGENT
			}
		});

		return response.json;
	}

	private prepareStockDataPoints(validData: StockDataPoint[], days: number): StockDataPoint[] {
		let finalData = validData;

		if (validData.length > days * 2) {
			const dailyData = new Map<string, StockDataPoint>();
			for (const dataPoint of validData) {
				const date = new Date(dataPoint.timestamp);
				const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

				if (!dailyData.has(dateKey) || dataPoint.timestamp > dailyData.get(dateKey)!.timestamp) {
					dailyData.set(dateKey, dataPoint);
				}
			}

			finalData = Array.from(dailyData.values()).sort((a, b) => a.timestamp - b.timestamp);
		}

		if (finalData.length < this.minDataPoints && validData.length >= this.minDataPoints) {
			return validData;
		}

		return finalData;
	}

	private trimCryptoData(validData: StockDataPoint[], days: number): StockDataPoint[] {
		const requestedPoints = Math.max(days, this.minDataPoints);
		return validData.slice(-requestedPoints);
	}

	private calculateCryptoPricePrecision(priceHint: number | undefined, prices: number[]): number {
		const latestPrice = prices[prices.length - 1] ?? 0;
		const hintedPrecision = this.normalizePricePrecision(priceHint ?? DEFAULT_PRICE_PRECISION);

		if (latestPrice > 0 && latestPrice < 0.01) {
			const significantPrecision = Math.ceil(Math.abs(Math.log10(latestPrice))) + 2;
			return Math.min(MAX_CRYPTO_PRICE_PRECISION, Math.max(hintedPrecision, significantPrecision));
		}

		return Math.min(MAX_CRYPTO_PRICE_PRECISION, Math.max(DEFAULT_PRICE_PRECISION, hintedPrecision));
	}

	private normalizePricePrecision(precision: number): number {
		return Number.isFinite(precision)
			? Math.max(0, Math.trunc(precision))
			: DEFAULT_PRICE_PRECISION;
	}

	private formatStoredPrice(price: number, assetType: AssetType): number {
		return assetType === 'stock' ? Number(price.toFixed(DEFAULT_PRICE_PRECISION)) : price;
	}

	private escapeRegExp(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
		this.pendingRequests.clear();
		this.cryptoSymbolCache.clear();
		this.pendingCryptoSymbolRequests.clear();
	}

	getCacheSize(): number {
		return this.cache.size;
	}

	getCacheMemorySize(): string {
		const sizes = {
			mapEntry: 32,
			object: 24,
			string: 40,
			array: 40,
			number: 8,
			charBytes: 2
		};

		let totalBytes = sizes.array; // Map itself

		for (const [cacheKey, cacheEntry] of this.cache.entries()) {
			totalBytes += this.calculateEntrySize(cacheKey, cacheEntry, sizes);
		}

		return this.formatBytes(totalBytes);
	}

	private calculateEntrySize(cacheKey: string, cacheEntry: CacheEntry, sizes: MemorySizes): number {
		let entryBytes = sizes.mapEntry + sizes.object; // Map entry + CacheEntry object

		entryBytes += this.calculateStringSize(cacheKey, sizes);
		entryBytes += sizes.number; // timestamp

		entryBytes += this.calculateStockDataSize(cacheEntry.data, sizes);

		return entryBytes;
	}

	private calculateStockDataSize(stockData: StockData, sizes: MemorySizes): number {
		let dataBytes = sizes.object; // StockData object

		dataBytes += this.calculateStringSize(stockData.symbol, sizes);
		dataBytes += this.calculateStringSize(stockData.displaySymbol, sizes);
		dataBytes += this.calculateStringSize(stockData.yahooSymbol, sizes);
		dataBytes += this.calculateStringSize(stockData.assetType, sizes);
		dataBytes += this.calculateStringSize(stockData.currency, sizes);

		dataBytes += sizes.number * 3; // price, change, changePercent

		if (stockData.todayChange !== undefined) dataBytes += sizes.number;
		if (stockData.todayChangePercent !== undefined) dataBytes += sizes.number;
		if (stockData.pricePrecision !== undefined) dataBytes += sizes.number;

		dataBytes += this.calculateArraySize(stockData.historicalPrices, sizes);
		dataBytes += this.calculateArraySize(stockData.timestamps, sizes);

		if (stockData.ohlcData) {
			dataBytes += this.calculateOhlcArraySize(stockData.ohlcData, sizes);
		}

		return dataBytes;
	}

	private calculateStringSize(str: string, sizes: MemorySizes): number {
		return str.length * sizes.charBytes + sizes.string;
	}

	private calculateArraySize(array: unknown[], sizes: MemorySizes): number {
		return sizes.array + array.length * sizes.number;
	}

	private calculateOhlcArraySize(ohlcArray: OHLCData[], sizes: MemorySizes): number {
		const ohlcObjectSize = sizes.object + sizes.number * 4; // open, high, low, close
		return sizes.array + ohlcArray.length * ohlcObjectSize;
	}

	private formatBytes(bytes: number): string {
		const kilobyte = 1024;
		const megabyte = kilobyte * 1024;

		if (bytes < kilobyte) {
			return `${bytes} B`;
		} else if (bytes < megabyte) {
			return `${(bytes / kilobyte).toFixed(1)} KB`;
		} else {
			return `${(bytes / megabyte).toFixed(1)} MB`;
		}
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
