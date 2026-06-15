import { StockListBlockConfig, SingleStockBlockConfig, StockTickerSettings } from '../types';

function parseSymbolList(value: string): string[] {
	return value.split(',').map(symbol => symbol.trim()).filter(symbol => symbol);
}

function parseFirstSymbol(value: string): string {
	return parseSymbolList(value)[0] || '';
}

function normalizeCryptoConfigSymbol(symbol: string, quoteCurrency: string): string {
	const trimmedSymbol = symbol.trim();
	const quoteSuffix = `-${quoteCurrency}`;
	return trimmedSymbol.toUpperCase().endsWith(quoteSuffix)
		? trimmedSymbol.slice(0, -quoteSuffix.length)
		: trimmedSymbol;
}

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
			case 'ticker':
			case 'symbol':
			case 'stock':
				config.tickers = parseSymbolList(value);
				break;
			case 'cryptos':
			case 'crypto':
				config.cryptos = parseSymbolList(value);
				break;
			case 'quoteCurrency':
				config.quoteCurrency = value.toUpperCase();
				break;
			case 'days': {
				const days = parseInt(value, 10);
				config.days = isNaN(days) ? undefined : days;
				break;
			}
			case 'width': {
				const width = parseInt(value, 10);
				config.width = isNaN(width) ? undefined : width;
				break;
			}
			case 'height': {
				const height = parseInt(value, 10);
				config.height = isNaN(height) ? undefined : height;
				break;
			}
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
				config.sortBy = ['symbol', 'price', 'changePercent', 'todayChangePercent'].includes(value) 
					? value as 'symbol' | 'price' | 'changePercent' | 'todayChangePercent'
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
		case 'showTodayChange':
			config.showTodayChange = value.toLowerCase() === 'true';
			break;
		case 'refreshInterval': {
			const refreshInterval = parseInt(value, 10);
			config.refreshInterval = isNaN(refreshInterval) ? undefined : refreshInterval;
			break;
		}
		case 'sparkline':
			config.sparkline = value.toLowerCase() === 'true';
			break;
	}
	}

	const quoteCurrency = config.quoteCurrency || 'USD';

	return {
		tickers: config.tickers || [],
		cryptos: (config.cryptos || []).map(crypto => normalizeCryptoConfigSymbol(crypto, quoteCurrency)),
		quoteCurrency,
		days: config.days ?? (settings?.defaultDays ?? 120),
		width: config.width ?? (settings?.defaultWidth ?? 500),
		height: config.height ?? (settings?.defaultHeight ?? 400),
		linkStyle: config.linkStyle || 'none',
		title: config.title,
		description: config.description,
		sortBy: config.sortBy,
		sortOrder: config.sortOrder,
		showLastUpdate: config.showLastUpdate,
		showTodayChange: config.showTodayChange,
		refreshInterval: config.refreshInterval,
		sparkline: config.sparkline ?? (settings?.defaultShowSparklines ?? true),
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
				config.stockFieldUsed = true;
				config.assetType = 'stock';
				config.symbol = parseFirstSymbol(value);
				break;
			case 'crypto':
			case 'cryptos':
				config.cryptoFieldUsed = true;
				config.assetType = 'crypto';
				config.symbol = parseFirstSymbol(value);
				break;
			case 'quoteCurrency':
				config.quoteCurrency = value.toUpperCase();
				break;
			case 'days': {
				const days = parseInt(value, 10);
				config.days = isNaN(days) ? undefined : days;
				break;
			}
			case 'width': {
				const width = parseInt(value, 10);
				config.width = isNaN(width) ? undefined : width;
				break;
			}
			case 'height': {
				const height = parseInt(value, 10);
				config.height = isNaN(height) ? undefined : height;
				break;
			}
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
			case 'showTodayChange':
				config.showTodayChange = value.toLowerCase() === 'true';
				break;
			case 'refreshInterval': {
				const refreshInterval = parseInt(value, 10);
				config.refreshInterval = isNaN(refreshInterval) ? undefined : refreshInterval;
				break;
			}
			case 'title':
				config.title = value;
				break;
			case 'description':
				config.description = value;
				break;
			case 'useCandles':
				config.useCandles = value.toLowerCase() === 'true';
				break;
		}
	}
	
	const quoteCurrency = config.quoteCurrency || 'USD';
	const symbol = config.assetType === 'crypto'
		? normalizeCryptoConfigSymbol(config.symbol || '', quoteCurrency)
		: config.symbol || '';

	return {
		symbol,
		assetType: config.assetType || 'stock',
		quoteCurrency,
		stockFieldUsed: config.stockFieldUsed,
		cryptoFieldUsed: config.cryptoFieldUsed,
		days: config.days ?? (settings?.defaultDays ?? 120),
		width: config.width ?? (settings?.defaultWidth ?? 500),
		height: config.height ?? (settings?.defaultHeight ?? 400),
		showAxes: config.showAxes ?? true,
		linkStyle: config.linkStyle || 'none',
		showLastUpdate: config.showLastUpdate,
		showTodayChange: config.showTodayChange,
		refreshInterval: config.refreshInterval,
		title: config.title,
		description: config.description,
		useCandles: config.useCandles ?? false,
	};
}
