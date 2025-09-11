import { StockTickerSettings } from './types';

export const DEFAULT_SETTINGS: StockTickerSettings = {
	apiKey: '', // Kept for potential future use
	cacheDuration: 15, // 15 minutes
	defaultDays: 30,
	defaultWidth: 500,
	defaultHeight: 300,
	useBusinessDays: true, // Interpret 'days' as business days by default
	minDataPoints: 2, // Minimum data points for chart rendering
};

export type { StockTickerSettings };
