import * as assert from 'node:assert/strict';
import test from 'node:test';
import { StockDataService } from '../src/services/stock-data';
import { parseStockChartConfig } from '../src/utils/config-parser';
import { createMarketStatDisplayItems } from '../src/utils/market-stat-display';
import {
	calculateAverageVolume,
	extractLatestMarketCap,
	resolveCurrentVolume
} from '../src/utils/market-stats';
import { setRequestHandler } from './obsidian-stub';

function createYahooChartResponse(): unknown {
	return {
		chart: {
			result: [{
				meta: {
					currency: 'CAD',
					instrumentType: 'EQUITY',
					regularMarketVolume: 8_000,
					symbol: 'BTE.TO'
				},
				timestamp: [1_700_000_000, 1_700_086_400],
				indicators: {
					quote: [{
						close: [5, 6],
						volume: [1_000, 3_000]
					}]
				}
			}]
		}
	};
}

void test('parses market statistic fields case-insensitively', () => {
	const config = parseStockChartConfig(`
		stock: BTE.TO
		marketCap: TRUE
		volume: True
		volumeAvg: false
	`);

	assert.equal(config.showMarketCap, true);
	assert.equal(config.showVolume, true);
	assert.equal(config.showAverageVolume, false);
});

void test('keeps market statistic fields opt-in by default', () => {
	const config = parseStockChartConfig('stock: AAPL');

	assert.equal(config.showMarketCap, false);
	assert.equal(config.showVolume, false);
	assert.equal(config.showAverageVolume, false);
});

void test('builds compact display values for enabled market statistics', () => {
	const items = createMarketStatDisplayItems(
		{
			showMarketCap: true,
			showVolume: true,
			showAverageVolume: true
		},
		{
			currency: 'CAD',
			marketCap: 4_318_316_828,
			marketCapCurrency: 'CAD',
			volume: 5_781_234,
			averageVolume: 4_125_000
		}
	);

	assert.deepEqual(items, [
		{ label: 'Market cap', value: 'CA$4.32B' },
		{ label: 'Volume', value: '5.78M' },
		{ label: 'Avg. volume', value: '4.13M' }
	]);
});

void test('renders unavailable enabled statistics without exposing disabled ones', () => {
	const items = createMarketStatDisplayItems(
		{
			showMarketCap: true,
			showVolume: false,
			showAverageVolume: true
		},
		{
			currency: 'USD'
		}
	);

	assert.deepEqual(items, [
		{ label: 'Market cap', value: 'N/A' },
		{ label: 'Avg. volume', value: 'N/A' }
	]);
});

void test('extracts the latest valid trailing market cap', () => {
	const marketCap = extractLatestMarketCap({
		timeseries: {
			result: [
				{
					timestamp: [1_700_000_000, 1_710_000_000, 1_720_000_000],
					trailingMarketCap: [
						{
							asOfDate: '2023-11-14',
							currencyCode: 'CAD',
							reportedValue: { raw: 3_500_000_000 }
						},
						{
							asOfDate: '2024-03-09',
							currencyCode: 'CAD',
							reportedValue: { raw: -1 }
						},
						{
							asOfDate: '2024-07-03',
							currencyCode: 'CAD',
							reportedValue: { raw: 4_200_000_000 }
						}
					]
				}
			]
		}
	});

	assert.deepEqual(marketCap, {
		value: 4_200_000_000,
		currency: 'CAD'
	});
});

void test('returns no market cap for malformed or absent Yahoo data', () => {
	assert.equal(extractLatestMarketCap({ timeseries: { result: [] } }), undefined);
	assert.equal(extractLatestMarketCap({ timeseries: null }), undefined);
});

void test('calculates average volume from valid displayed sessions', () => {
	assert.equal(calculateAverageVolume([1_000, undefined, 3_000, Number.NaN, -1]), 2_000);
	assert.equal(calculateAverageVolume([undefined, Number.NaN, -1]), undefined);
});

void test('prefers regular market volume and falls back to the latest valid session', () => {
	assert.equal(resolveCurrentVolume(8_000, [5_000, 6_000]), 8_000);
	assert.equal(resolveCurrentVolume(undefined, [5_000, undefined, 6_000]), 6_000);
	assert.equal(resolveCurrentVolume(undefined, [undefined, -1]), undefined);
});

void test('keeps chart volume data when optional market cap retrieval fails', async () => {
	setRequestHandler(options => {
		if (options.url.includes('/v8/finance/chart/')) {
			return Promise.resolve({
				json: createYahooChartResponse()
			});
		}

		return Promise.reject(new Error('Market cap unavailable'));
	});

	const stockDataService = new StockDataService();
	const stockData = await stockDataService.getStockData(
		'BTE.TO',
		30,
		false,
		{ includeMarketCap: true }
	);

	assert.equal(stockData.marketCap, undefined);
	assert.equal(stockData.volume, 8_000);
	assert.equal(stockData.averageVolume, 2_000);
	assert.deepEqual(stockData.historicalPrices, [5, 6]);
});

void test('enriches cached chart data without repeating the chart request', async () => {
	let chartRequestCount = 0;

	setRequestHandler(options => {
		if (options.url.includes('/v8/finance/chart/')) {
			chartRequestCount++;
			return Promise.resolve({ json: createYahooChartResponse() });
		}

		return Promise.resolve({
			json: {
				timeseries: {
					result: [{
						timestamp: [1_720_000_000],
						trailingMarketCap: [{
							currencyCode: 'CAD',
							reportedValue: { raw: 4_200_000_000 }
						}]
					}]
				}
			}
		});
	});

	const stockDataService = new StockDataService();
	const baseData = await stockDataService.getStockData('BTE.TO', 30);
	const enrichedData = await stockDataService.getStockData(
		'BTE.TO',
		30,
		false,
		{ includeMarketCap: true }
	);

	assert.equal(baseData.marketCap, undefined);
	assert.equal(enrichedData.marketCap, 4_200_000_000);
	assert.equal(enrichedData.marketCapCurrency, 'CAD');
	assert.equal(chartRequestCount, 1);
});
