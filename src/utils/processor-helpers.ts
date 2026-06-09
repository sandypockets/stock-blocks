import { StockDataService } from '../services/stock-data';
import { StockData, StockDataError, StockListBlockConfig, StockListDataResult, SingleStockBlockConfig } from '../types';
import { getErrorMessage } from './error-utils';
import { normalizeUniqueTickers } from './ticker-utils';

const MAX_STOCK_LIST_CONCURRENCY = 6;

type StockListRequestResult =
	| { status: 'success'; stock: StockData }
	| { status: 'error'; error: StockDataError };

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
	const tickers = normalizeUniqueTickers(config.tickers);
	const requestResults = await mapWithConcurrency(
		tickers,
		MAX_STOCK_LIST_CONCURRENCY,
		async (ticker: string): Promise<StockListRequestResult> => {
			try {
				const stock = await stockDataService.getStockData(ticker, config.days, false, { forceRefresh });
				return { status: 'success', stock };
			} catch (error: unknown) {
				return {
					status: 'error',
					error: {
						symbol: ticker,
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

export function createStockDataFetcher(stockDataService: StockDataService): StockDataFetcher {
	return {
		async fetchListData(config: StockListBlockConfig): Promise<StockListDataResult> {
			return fetchStockListData(stockDataService, config, false);
		},

		async fetchChartData(config: SingleStockBlockConfig): Promise<StockData> {
			return stockDataService.getStockData(config.symbol, config.days, config.useCandles === true);
		},

		createListRefreshFetcher(config: StockListBlockConfig): () => Promise<StockListDataResult> {
			return async (): Promise<StockListDataResult> => {
				return await fetchStockListData(stockDataService, config, true);
			};
		},

		createChartRefreshFetcher(config: SingleStockBlockConfig): () => Promise<StockData> {
			return async (): Promise<StockData> => {
				return await stockDataService.getStockData(config.symbol, config.days, config.useCandles === true, { forceRefresh: true });
			};
		}
	};
}

export const validators = {
	stockList: (config: StockListBlockConfig): string | null => {
		return normalizeUniqueTickers(config.tickers).length === 0 ? 'No tickers specified. Add tickers like: tickers: AAPL, MSFT, NVDA' : null;
	},

	stockChart: (config: SingleStockBlockConfig): string | null => {
		return !config.symbol ? 'No symbol specified. Add a symbol like: symbol: AAPL' : null;
	}
};
