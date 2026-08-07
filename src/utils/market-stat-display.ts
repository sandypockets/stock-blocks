import { SingleStockBlockConfig, StockData } from '../types';
import { formatCompactCurrency, formatCompactNumber } from './formatters';

export interface MarketStatDisplayItem {
	label: string;
	value: string;
}

type MarketStatConfig = Pick<
	SingleStockBlockConfig,
	'showMarketCap' | 'showVolume' | 'showAverageVolume'
>;

type MarketStatData = Pick<
	StockData,
	'currency' | 'marketCap' | 'marketCapCurrency' | 'volume' | 'averageVolume'
>;

export function createMarketStatDisplayItems(
	config: MarketStatConfig,
	data: MarketStatData
): MarketStatDisplayItem[] {
	const items: MarketStatDisplayItem[] = [];

	if (config.showMarketCap) {
		items.push({
			label: 'Market cap',
			value: data.marketCap === undefined
				? 'N/A'
				: formatCompactCurrency(data.marketCap, data.marketCapCurrency || data.currency)
		});
	}

	if (config.showVolume) {
		items.push({
			label: 'Volume',
			value: data.volume === undefined ? 'N/A' : formatCompactNumber(data.volume)
		});
	}

	if (config.showAverageVolume) {
		items.push({
			label: 'Avg. volume',
			value: data.averageVolume === undefined ? 'N/A' : formatCompactNumber(data.averageVolume)
		});
	}

	return items;
}
