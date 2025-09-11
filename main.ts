import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { StockTickerSettings, DEFAULT_SETTINGS } from './src/settings';
import { StockDataService } from './src/services/stock-data';
import { StockListComponent } from './src/components/stock-list';
import { StockChartComponent } from './src/components/stock-chart';
import { StockBlocksSettingTab } from './src/components/settings-tab';
import { parseStockListConfig, parseStockChartConfig } from './src/utils/config-parser';
import { StockListBlockConfig, SingleStockBlockConfig } from './src/types';
import { createStockDataFetcher, validators } from './src/utils/processor-helpers';

export default class StockTickerPlugin extends Plugin {
	settings: StockTickerSettings;
	stockDataService: StockDataService;
	private dataFetcher: ReturnType<typeof createStockDataFetcher>;

	async onload() {
		await this.loadSettings();

		this.stockDataService = new StockDataService(
			this.settings.cacheDuration,
			this.settings.useBusinessDays,
			this.settings.minDataPoints
		);
		this.dataFetcher = createStockDataFetcher(this.stockDataService);

		this.registerMarkdownCodeBlockProcessor('stock-block-list', this.processStockList.bind(this));
		this.registerMarkdownCodeBlockProcessor('stock-block', this.processStockChart.bind(this));

		this.addSettingTab(new StockBlocksSettingTab(this.app, this));

		this.addCommand({
			id: 'refresh-stock-data',
			name: 'Refresh all stock data',
			callback: () => {
				this.stockDataService.clearCache();
				// Trigger a re-render by refreshing the current file
				const activeLeaf = this.app.workspace.activeLeaf;
				if (activeLeaf && activeLeaf.view.getViewType() === 'markdown') {
					const markdownView = activeLeaf.view as any;
					if (markdownView.currentMode?.rerender) {
						markdownView.currentMode.rerender(true);
					}
				}
			}
		});
	}

	async processStockList(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		await this.processStockBlock(
			source,
			el,
			ctx,
			'stock-list',
			parseStockListConfig,
			validators.stockList,
			this.dataFetcher.fetchListData.bind(this.dataFetcher),
			(config: StockListBlockConfig) => new StockListComponent(el, config, this.app),
			async (component: StockListComponent, config: StockListBlockConfig) => {
				return this.dataFetcher.createListRefreshFetcher(config)();
			}
		);
	}

	private async processStockBlock<TConfig, TComponent, TData>(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		blockType: string,
		configParser: (source: string, settings: StockTickerSettings) => TConfig,
		validator: (config: TConfig) => string | null,
		dataFetcher: (config: TConfig) => Promise<TData>,
		componentFactory: (config: TConfig) => TComponent,
		refreshDataFetcher: (component: TComponent, config: TConfig) => Promise<TData>
	) {
		try {
			const config = configParser(source, this.settings);
			
			const validationError = validator(config);
			if (validationError) {
				this.renderError(el, validationError);
				return;
			}

			const loadingEl = this.createLoadingElement(el);

			try {
				const data = await dataFetcher(config);
				loadingEl.remove();

				const component = componentFactory(config);
				this.setupRefreshCallback(component, config, refreshDataFetcher);
				await (component as any).render(data);

			} catch (error) {
				loadingEl.remove();
				this.renderError(el, `Error loading stock data: ${error.message || 'Network error'}. Check your internet connection.`);
			}
		} catch (error) {
			this.renderError(el, `Error parsing configuration: ${error.message}`);
		}
	}

	private createLoadingElement(el: HTMLElement): HTMLElement {
		return el.createEl('div', {
			text: 'Loading stock data...',
			cls: 'stock-loading'
		});
	}

	private setupRefreshCallback<TComponent, TConfig, TData>(
		component: TComponent,
		config: TConfig,
		refreshDataFetcher: (component: TComponent, config: TConfig) => Promise<TData>
	) {
		(component as any).refreshDataCallback = async () => {
			try {
				this.stockDataService.clearCache();
				const freshData = await refreshDataFetcher(component, config);
				await (component as any).render(freshData);
			} catch (error) {
				// Error refreshing data - fail silently or handle as needed
			}
		};
	}

	async processStockChart(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		await this.processStockBlock(
			source,
			el,
			ctx,
			'stock-chart',
			parseStockChartConfig,
			validators.stockChart,
			this.dataFetcher.fetchChartData.bind(this.dataFetcher),
			(config: SingleStockBlockConfig) => new StockChartComponent(el, config, this.app),
			async (component: StockChartComponent, config: SingleStockBlockConfig) => {
				return this.dataFetcher.createChartRefreshFetcher(config)();
			}
		);
	}

	private renderError(el: HTMLElement, message: string) {
		const errorContainer = el.createEl('div', { cls: 'stock-error-container' });
		
		const iconEl = errorContainer.createEl('span', { cls: 'stock-error-icon' });
		iconEl.innerHTML = '⚠️';
		
		const messageEl = errorContainer.createEl('div', { cls: 'stock-error-message' });
		messageEl.setText(message);
		
		const hintEl = errorContainer.createEl('div', { cls: 'stock-error-hint' });
		if (message.includes('Yahoo Finance')) {
			hintEl.setText('Yahoo Finance API may be temporarily unavailable. Try again later or check your internet connection.');
		} else {
			hintEl.setText('Check the configuration parameters and try again.');
		}
	}

	onunload() {
		// Clean up any resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
