export interface StockData {
	symbol: string;
	price: number;
	change: number;
	changePercent: number;
	currency: string;
	historicalPrices: number[];
	timestamps: number[];
}

export interface StockListBlockConfig {
	tickers: string[];
	days: number;
	width: number;
	height: number;
	linkStyle: 'none' | 'wikilink' | 'markdown';
	showLastUpdate?: boolean;
	refreshInterval?: number; // in minutes
	title?: string;
	description?: string;
	sortBy?: 'symbol' | 'price' | 'changePercent';
	sortOrder?: 'asc' | 'desc';
}

export interface SingleStockBlockConfig {
	symbol: string;
	days: number;
	width: number;
	height: number;
	showAxes: boolean;
	linkStyle?: 'none' | 'wikilink' | 'markdown';
	showLastUpdate?: boolean;
	refreshInterval?: number; // in minutes
	title?: string;
	description?: string;
}

export interface StockTickerSettings {
	apiKey: string;
	cacheDuration: number; // in minutes
	defaultDays: number;
	defaultWidth: number;
	defaultHeight: number;
	useBusinessDays: boolean; // whether to interpret 'days' as business days
	minDataPoints: number; // minimum data points for chart rendering
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
