import { StockDataService } from '../services/stock-data';
import { StockListBlockConfig, SingleStockBlockConfig } from '../types';

export function createStockDataFetcher(stockDataService: StockDataService) {
	return {
		async fetchListData(config: StockListBlockConfig) {
			const stockDataPromises = config.tickers.map((ticker: string) => 
				stockDataService.getStockData(ticker.trim(), config.days)
			);
			return Promise.all(stockDataPromises);
		},

		async fetchChartData(config: SingleStockBlockConfig) {
			return stockDataService.getStockData(config.symbol, config.days);
		},

		createListRefreshFetcher(config: StockListBlockConfig) {
			return async () => {
				stockDataService.clearCache();
				const freshDataPromises = config.tickers.map((ticker: string) => 
					stockDataService.getStockData(ticker.trim(), config.days)
				);
				return Promise.all(freshDataPromises);
			};
		},

		createChartRefreshFetcher(config: SingleStockBlockConfig) {
			return async () => {
				stockDataService.clearCache();
				return stockDataService.getStockData(config.symbol, config.days);
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
