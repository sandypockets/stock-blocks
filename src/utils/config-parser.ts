import { StockListBlockConfig, SingleStockBlockConfig, StockTickerSettings } from '../types';

export function parseStockListConfig(content: string, settings?: StockTickerSettings): StockListBlockConfig {
	const lines = content.trim().split('\n');
	const config: Partial<StockListBlockConfig> = {};
	
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) continue;
		
		const key = trimmed.substring(0, colonIndex).trim();
		const value = trimmed.substring(colonIndex + 1).trim();
		
		switch (key) {
			case 'tickers':
			case 'symbols':
			case 'stocks':
				config.tickers = value.split(',').map(t => t.trim()).filter(t => t);
				break;
			case 'days':
				const days = parseInt(value, 10);
				config.days = isNaN(days) ? undefined : days;
				break;
			case 'width':
				const width = parseInt(value, 10);
				config.width = isNaN(width) ? undefined : width;
				break;
			case 'height':
				const height = parseInt(value, 10);
				config.height = isNaN(height) ? undefined : height;
				break;
			case 'linkStyle':
				config.linkStyle = ['none', 'wikilink', 'markdown'].includes(value) 
					? value as 'none' | 'wikilink' | 'markdown' 
					: 'none';
				break;
			case 'title':
				config.title = value;
				break;
			case 'description':
				config.description = value;
				break;
			case 'sortBy':
				config.sortBy = ['symbol', 'price', 'changePercent'].includes(value) 
					? value as 'symbol' | 'price' | 'changePercent' 
					: undefined;
				break;
			case 'sortOrder':
				config.sortOrder = ['asc', 'desc'].includes(value) 
					? value as 'asc' | 'desc' 
					: undefined;
				break;
			case 'showLastUpdate':
				config.showLastUpdate = value.toLowerCase() === 'true';
				break;
			case 'refreshInterval':
				const refreshInterval = parseInt(value, 10);
				config.refreshInterval = isNaN(refreshInterval) ? undefined : refreshInterval;
				break;
			case 'sparkline':
				config.sparkline = value.toLowerCase() === 'true';
				break;
		}
	}
	
	return {
		tickers: config.tickers || [],
		days: config.days ?? (settings?.defaultDays ?? 120),
		width: config.width ?? (settings?.defaultWidth ?? 500),
		height: config.height ?? (settings?.defaultHeight ?? 400),
		linkStyle: config.linkStyle || 'none',
		title: config.title,
		description: config.description,
		sortBy: config.sortBy,
		sortOrder: config.sortOrder,
		showLastUpdate: config.showLastUpdate,
		refreshInterval: config.refreshInterval,
		sparkline: config.sparkline ?? (settings?.defaultShowSparklines ?? true), // Use plugin default setting
	};
}

export function parseStockChartConfig(content: string, settings?: StockTickerSettings): SingleStockBlockConfig {
	const lines = content.trim().split('\n');
	const config: Partial<SingleStockBlockConfig> = {};
	
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) continue;
		
		const key = trimmed.substring(0, colonIndex).trim();
		const value = trimmed.substring(colonIndex + 1).trim();
		
		switch (key) {
			case 'symbol':
			case 'symbols':
			case 'stock':
			case 'stocks':
			case 'ticker':
			case 'tickers':
				if (key === 'tickers') {
					const tickers = value.split(',').map(t => t.trim()).filter(t => t);
					config.symbol = tickers[0] || '';
				} else {
					config.symbol = value;
				}
				break;
			case 'days':
				const days = parseInt(value, 10);
				config.days = isNaN(days) ? undefined : days;
				break;
			case 'width':
				const width = parseInt(value, 10);
				config.width = isNaN(width) ? undefined : width;
				break;
			case 'height':
				const height = parseInt(value, 10);
				config.height = isNaN(height) ? undefined : height;
				break;
			case 'showAxes':
				config.showAxes = value.toLowerCase() === 'true';
				break;
			case 'linkStyle':
				config.linkStyle = ['none', 'wikilink', 'markdown'].includes(value) 
					? value as 'none' | 'wikilink' | 'markdown' 
					: 'none';
				break;
			case 'showLastUpdate':
				config.showLastUpdate = value.toLowerCase() === 'true';
				break;
			case 'refreshInterval':
				const refreshInterval = parseInt(value, 10);
				config.refreshInterval = isNaN(refreshInterval) ? undefined : refreshInterval;
				break;
			case 'title':
				config.title = value;
				break;
			case 'description':
				config.description = value;
				break;
		}
	}
	
	return {
		symbol: config.symbol || '',
		days: config.days ?? (settings?.defaultDays ?? 120),
		width: config.width ?? (settings?.defaultWidth ?? 500),
		height: config.height ?? (settings?.defaultHeight ?? 400),
		showAxes: config.showAxes ?? true,
		linkStyle: config.linkStyle || 'none',
		showLastUpdate: config.showLastUpdate,
		refreshInterval: config.refreshInterval,
		title: config.title,
		description: config.description,
	};
}
