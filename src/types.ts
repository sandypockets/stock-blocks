export interface OHLCData {
	open: number;
	high: number;
	low: number;
	close: number;
}

export type AssetType = 'stock' | 'crypto';

export interface StockData {
	symbol: string;
	displaySymbol: string;
	yahooSymbol: string;
	assetType: AssetType;
	price: number;
	change: number;
	changePercent: number;
	todayChange?: number;
	todayChangePercent?: number;
	currency: string;
	pricePrecision?: number;
	marketCap?: number;
	marketCapCurrency?: string;
	volume?: number;
	averageVolume?: number;
	historicalPrices: number[];
	timestamps: number[];
	ohlcData?: OHLCData[];
}

export interface StockDataError {
	symbol: string;
	assetType?: AssetType;
	message: string;
}

export interface StockListDataResult {
	stocks: StockData[];
	errors: StockDataError[];
}

export interface StockListBlockConfig {
	tickers: string[];
	cryptos: string[];
	quoteCurrency: string;
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
	assetType: AssetType;
	quoteCurrency: string;
	stockFieldUsed?: boolean;
	cryptoFieldUsed?: boolean;
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
	showMarketCap: boolean;
	showVolume: boolean;
	showAverageVolume: boolean;
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

export interface ChartPoint {
	x: number;
	y: number;
	price: number;
	timestamp?: number;
	index: number;
}

export interface CandlePoint {
	x: number;
	open: number;
	high: number;
	low: number;
	close: number;
	timestamp?: number;
	index: number;
}

export interface ChartData {
	points?: ChartPoint[];
	candles?: CandlePoint[];
	padding: number;
	chartWidth: number;
	chartHeight: number;
	min: number;
	max: number;
	range: number;
	currency: string;
	pricePrecision?: number;
	width: number;
	height: number;
	isSinglePoint?: boolean;
	hasTimestamps?: boolean;
	candleWidth?: number;
}

export interface ChartRenderResult {
	svg: SVGSVGElement;
	chartId: string;
	chartData: ChartData;
}
