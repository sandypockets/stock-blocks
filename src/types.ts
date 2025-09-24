export interface OHLCData {
	open: number;
	high: number;
	low: number;
	close: number;
}

export interface StockData {
	symbol: string;
	price: number;
	change: number;
	changePercent: number;
	todayChange?: number;
	todayChangePercent?: number;
	currency: string;
	historicalPrices: number[];
	timestamps: number[];
	ohlcData?: OHLCData[];
}

export interface StockListBlockConfig {
	tickers: string[];
	days: number;
	width: number;
	height: number;
	linkStyle: 'none' | 'wikilink' | 'markdown';
	showLastUpdate?: boolean;
	showTodayChange?: boolean;
	refreshInterval?: number; // in minutes
	title?: string;
	description?: string;
	sortBy?: 'symbol' | 'price' | 'changePercent' | 'todayChangePercent';
	sortOrder?: 'asc' | 'desc';
	sparkline?: boolean;
}

export interface SingleStockBlockConfig {
	symbol: string;
	days: number;
	width: number;
	height: number;
	showAxes: boolean;
	linkStyle?: 'none' | 'wikilink' | 'markdown';
	showLastUpdate?: boolean;
	showTodayChange?: boolean;
	refreshInterval?: number; // in minutes
	title?: string;
	description?: string;
	useCandles?: boolean;
}

export interface StockTickerSettings {
	apiKey: string;
	cacheDuration: number; // in minutes
	defaultDays: number;
	defaultWidth: number;
	defaultHeight: number;
	useBusinessDays: boolean; // whether to interpret 'days' as business days
	minDataPoints: number;
	defaultShowSparklines: boolean;
}

export interface CacheEntry {
	data: StockData;
	timestamp: number;
}

export interface StockApiResponse {
	symbol: string;
	price: number;
	change: number;
	changePercent: number;
	historicalData: Array<{
		date: string;
		close: number;
	}>;
}
