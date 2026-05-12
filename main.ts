import { Plugin, MarkdownPostProcessorContext, MarkdownView, Component } from 'obsidian';
import { StockTickerSettings, DEFAULT_SETTINGS } from './src/settings';
import { StockDataService } from './src/services/stock-data';
import { StockListComponent } from './src/components/stock-list';
import { StockChartComponent } from './src/components/stock-chart';
import { StockBlocksSettingTab } from './src/components/settings-tab';
import { parseStockListConfig, parseStockChartConfig } from './src/utils/config-parser';
import { StockListBlockConfig, SingleStockBlockConfig } from './src/types';
import { createStockDataFetcher, validators } from './src/utils/processor-helpers';
import { getErrorMessage } from './src/utils/error-utils';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPartialStockTickerSettings(value: unknown): value is Partial<StockTickerSettings> {
	return isRecord(value);
}

export default class StockTickerPlugin extends Plugin {
	settings: StockTickerSettings;
	stockDataService: StockDataService;
	private dataFetcher: ReturnType<typeof createStockDataFetcher>;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.stockDataService = new StockDataService(
			this.settings.cacheDuration,
			this.settings.useBusinessDays,
			this.settings.minDataPoints
		);
		this.dataFetcher = createStockDataFetcher(this.stockDataService);

		this.registerMarkdownCodeBlockProcessor('stock-block-list', async (source, el, ctx) => {
			await this.processStockList(source, el, ctx);
		});
		this.registerMarkdownCodeBlockProcessor('stock-block', async (source, el, ctx) => {
			await this.processStockChart(source, el, ctx);
		});

		this.addSettingTab(new StockBlocksSettingTab(this.app, this));

		this.addCommand({
			id: 'refresh-stock-data',
			name: 'Refresh all stock data',
			callback: () => {
				this.stockDataService.clearCache();
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					const currentMode = (markdownView as MarkdownView & { currentMode?: { rerender?: (force: boolean) => void } }).currentMode;
					if (currentMode?.rerender) {
						currentMode.rerender(true);
					}
				}
			}
		});
	}

	async processStockList(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
		void ctx;

		await this.processStockBlock(
			source,
			el,
			parseStockListConfig,
			validators.stockList,
			async (config: StockListBlockConfig) => await this.dataFetcher.fetchListData(config),
			(config: StockListBlockConfig) => new StockListComponent(el, config, this.app),
			async (component: StockListComponent, config: StockListBlockConfig) => {
				return await this.dataFetcher.createListRefreshFetcher(config)();
			}
		);
	}

	async processStockChart(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
		void ctx;

		await this.processStockBlock(
			source,
			el,
			parseStockChartConfig,
			validators.stockChart,
			async (config: SingleStockBlockConfig) => await this.dataFetcher.fetchChartData(config),
			(config: SingleStockBlockConfig) => new StockChartComponent(el, config, this.app),
			async (component: StockChartComponent, config: SingleStockBlockConfig) => {
				return await this.dataFetcher.createChartRefreshFetcher(config)();
			}
		);
	}

	private async processStockBlock<TConfig, TComponent extends Component & { render: (data: TData) => void | Promise<void> }, TData>(
		source: string,
		el: HTMLElement,
		configParser: (source: string, settings: StockTickerSettings) => TConfig,
		validator: (config: TConfig) => string | null,
		dataFetcher: (config: TConfig) => Promise<TData>,
		componentFactory: (config: TConfig) => TComponent,
		refreshDataFetcher: (component: TComponent, config: TConfig) => Promise<TData>
	): Promise<void> {
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
				this.addChild(component);
				this.setupRefreshCallback(component, config, refreshDataFetcher);
				await component.render(data);

			} catch (error: unknown) {
				loadingEl.remove();
				this.renderError(el, `error loading stock data: ${getErrorMessage(error, 'network error')}. Check your internet connection.`);
			}
		} catch (error: unknown) {
			this.renderError(el, `error parsing configuration: ${getErrorMessage(error)}`);
		}
	}

	private createLoadingElement(el: HTMLElement): HTMLElement {
		return el.createEl('div', {
			text: 'Loading stock data...',
			cls: 'stock-loading'
		});
	}

	private setupRefreshCallback<TComponent extends Component & { refreshDataCallback?: () => Promise<void>; render: (data: TData) => void | Promise<void> }, TConfig, TData>(
		component: TComponent,
		config: TConfig,
		refreshDataFetcher: (component: TComponent, config: TConfig) => Promise<TData>
	): void {
		component.refreshDataCallback = async () => {
			try {
				this.stockDataService.clearCache();
				const freshData = await refreshDataFetcher(component, config);
				await component.render(freshData);
			} catch {
				// Refresh errors are already shown by the rendered block when data loading fails.
			}
		};
	}

	private renderError(el: HTMLElement, message: string): void {
		const errorContainer = el.createEl('div', { cls: 'stock-error-container' });
		
		const iconEl = errorContainer.createEl('span', { cls: 'stock-error-icon' });
		iconEl.textContent = '⚠️';
		
		const messageEl = errorContainer.createEl('div', { cls: 'stock-error-message' });
		messageEl.setText(message);
		
		const hintEl = errorContainer.createEl('div', { cls: 'stock-error-hint' });
		if (message.includes('Yahoo Finance')) {
			hintEl.setText('Yahoo Finance API may be temporarily unavailable. Try again later or check your internet connection.');
		} else {
			hintEl.setText('Check the configuration parameters and try again.');
		}
	}

	onunload(): void {
		if (this.stockDataService) {
			this.stockDataService.clearCache();
		}
	}

	async loadSettings(): Promise<void> {
		const loadedSettings: unknown = await this.loadData();
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			isPartialStockTickerSettings(loadedSettings) ? loadedSettings : {}
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
