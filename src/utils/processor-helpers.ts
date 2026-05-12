import { StockDataService } from '../services/stock-data';
import { StockData, StockListBlockConfig, SingleStockBlockConfig } from '../types';

interface StockDataFetcher {
	fetchListData(config: StockListBlockConfig): Promise<StockData[]>;
	fetchChartData(config: SingleStockBlockConfig): Promise<StockData>;
	createListRefreshFetcher(config: StockListBlockConfig): () => Promise<StockData[]>;
	createChartRefreshFetcher(config: SingleStockBlockConfig): () => Promise<StockData>;
}

export function createStockDataFetcher(stockDataService: StockDataService): StockDataFetcher {
	return {
		async fetchListData(config: StockListBlockConfig): Promise<StockData[]> {
			const stockDataPromises = config.tickers.map((ticker: string) => 
				stockDataService.getStockData(ticker.trim(), config.days)
			);
			return Promise.all(stockDataPromises);
		},

		async fetchChartData(config: SingleStockBlockConfig): Promise<StockData> {
			return stockDataService.getStockData(config.symbol, config.days, config.useCandles);
		},

		createListRefreshFetcher(config: StockListBlockConfig): () => Promise<StockData[]> {
			return async (): Promise<StockData[]> => {
				stockDataService.clearCache();
				const freshDataPromises = config.tickers.map((ticker: string) => 
					stockDataService.getStockData(ticker.trim(), config.days)
				);
				return Promise.all(freshDataPromises);
			};
		},

		createChartRefreshFetcher(config: SingleStockBlockConfig): () => Promise<StockData> {
			return async (): Promise<StockData> => {
				stockDataService.clearCache();
				return stockDataService.getStockData(config.symbol, config.days, config.useCandles);
			};
		}
	};
}

export const validators = {
	stockList: (config: StockListBlockConfig): string | null => {
		return config.tickers.length === 0 ? 'No tickers specified. Add tickers like: tickers: AAPL, MSFT, NVDA' : null;
	},

	stockChart: (config: SingleStockBlockConfig): string | null => {
		return !config.symbol ? 'No symbol specified. Add a symbol like: symbol: AAPL' : null;
	}
};
