import { StockDataService } from '../services/stock-data';
import { AssetType, StockData, StockDataError, StockListBlockConfig, StockListDataResult, SingleStockBlockConfig } from '../types';
import { getErrorMessage } from './error-utils';
import { normalizeUniqueTickers } from './ticker-utils';

const MAX_STOCK_LIST_CONCURRENCY = 6;
const SUPPORTED_CRYPTO_QUOTE_CURRENCY = 'USD';

type StockListRequestResult =
	| { status: 'success'; stock: StockData }
	| { status: 'error'; error: StockDataError };

interface StockListRequest {
	symbol: string;
	assetType: AssetType;
}

interface StockDataFetcher {
	fetchListData(config: StockListBlockConfig): Promise<StockListDataResult>;
	fetchChartData(config: SingleStockBlockConfig): Promise<StockData>;
	createListRefreshFetcher(config: StockListBlockConfig): () => Promise<StockListDataResult>;
	createChartRefreshFetcher(config: SingleStockBlockConfig): () => Promise<StockData>;
}

async function mapWithConcurrency<TInput, TOutput>(
	items: TInput[],
	limit: number,
	mapper: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
	const results = new Array<TOutput>(items.length);
	let nextIndex = 0;
	const workerCount = Math.min(limit, items.length);
	const workers: Promise<void>[] = [];

	for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
		workers.push((async () => {
			while (nextIndex < items.length) {
				const currentIndex = nextIndex;
				nextIndex++;
				results[currentIndex] = await mapper(items[currentIndex], currentIndex);
			}
		})());
	}

	await Promise.all(workers);
	return results;
}

async function fetchStockListData(
	stockDataService: StockDataService,
	config: StockListBlockConfig,
	forceRefresh: boolean
): Promise<StockListDataResult> {
	const requests = createStockListRequests(config);
	const requestResults = await mapWithConcurrency(
		requests,
		MAX_STOCK_LIST_CONCURRENCY,
		async (request: StockListRequest): Promise<StockListRequestResult> => {
			try {
				const stock = request.assetType === 'crypto'
					? await stockDataService.getCryptoData(request.symbol, config.quoteCurrency, config.days, false, { forceRefresh })
					: await stockDataService.getStockData(request.symbol, config.days, false, { forceRefresh });
				return { status: 'success', stock };
			} catch (error: unknown) {
				return {
					status: 'error',
					error: {
						symbol: request.symbol,
						assetType: request.assetType,
						message: getErrorMessage(error, 'Unable to load stock data')
					}
				};
			}
		}
	);

	const stocks: StockData[] = [];
	const errors: StockDataError[] = [];

	for (const result of requestResults) {
		if (result.status === 'success') {
			stocks.push(result.stock);
		} else {
			errors.push(result.error);
		}
	}

	return { stocks, errors };
}

function createStockListRequests(config: StockListBlockConfig): StockListRequest[] {
	return [
		...normalizeUniqueTickers(config.tickers).map(symbol => ({ symbol, assetType: 'stock' as const })),
		...normalizeUniqueTickers(config.cryptos).map(symbol => ({ symbol, assetType: 'crypto' as const }))
	];
}

export function createStockDataFetcher(stockDataService: StockDataService): StockDataFetcher {
	return {
		async fetchListData(config: StockListBlockConfig): Promise<StockListDataResult> {
			return fetchStockListData(stockDataService, config, false);
		},

		async fetchChartData(config: SingleStockBlockConfig): Promise<StockData> {
			return config.assetType === 'crypto'
				? stockDataService.getCryptoData(config.symbol, config.quoteCurrency, config.days, config.useCandles === true)
				: stockDataService.getStockData(
					config.symbol,
					config.days,
					config.useCandles === true,
					{ includeMarketCap: config.showMarketCap }
				);
		},

		createListRefreshFetcher(config: StockListBlockConfig): () => Promise<StockListDataResult> {
			return async (): Promise<StockListDataResult> => {
				return await fetchStockListData(stockDataService, config, true);
			};
		},

		createChartRefreshFetcher(config: SingleStockBlockConfig): () => Promise<StockData> {
			return async (): Promise<StockData> => {
				return config.assetType === 'crypto'
					? await stockDataService.getCryptoData(config.symbol, config.quoteCurrency, config.days, config.useCandles === true, { forceRefresh: true })
					: await stockDataService.getStockData(
						config.symbol,
						config.days,
						config.useCandles === true,
						{
							forceRefresh: true,
							includeMarketCap: config.showMarketCap
						}
					);
			};
		}
	};
}

export const validators = {
	stockList: (config: StockListBlockConfig): string | null => {
		const hasCryptoSymbols = normalizeUniqueTickers(config.cryptos).length > 0;
		if (hasCryptoSymbols && config.quoteCurrency !== SUPPORTED_CRYPTO_QUOTE_CURRENCY) {
			return `Only ${SUPPORTED_CRYPTO_QUOTE_CURRENCY} crypto quotes are supported in this version. Use quoteCurrency: ${SUPPORTED_CRYPTO_QUOTE_CURRENCY}`;
		}

		return createStockListRequests(config).length === 0 ? 'No symbols specified. Add stocks like: stocks: AAPL, MSFT or cryptos like: crypto: BTC or cryptos: BTC, ETH' : null;
	},

	stockChart: (config: SingleStockBlockConfig): string | null => {
		if (config.stockFieldUsed && config.cryptoFieldUsed) {
			return 'Specify either a stock symbol or a crypto symbol, not both';
		}

		if (config.assetType === 'crypto' && config.quoteCurrency !== SUPPORTED_CRYPTO_QUOTE_CURRENCY) {
			return `Only ${SUPPORTED_CRYPTO_QUOTE_CURRENCY} crypto quotes are supported in this version. Use quoteCurrency: ${SUPPORTED_CRYPTO_QUOTE_CURRENCY}`;
		}

		return !config.symbol ? 'No symbol specified. Add a stock like: stock: AAPL or a crypto like: crypto: BTC or cryptos: BTC' : null;
	}
};
