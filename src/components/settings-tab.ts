import { App, PluginSettingTab, Setting, Notice, Plugin } from 'obsidian';
import { StockTickerSettings } from '../settings';
import { StockDataService } from '../services/stock-data';

interface StockBlocksPlugin extends Plugin {
	settings: StockTickerSettings;
	stockDataService: StockDataService;
	saveSettings(): Promise<void>;
}

export class StockBlocksSettingTab extends PluginSettingTab {
	declare plugin: StockBlocksPlugin;

	constructor(app: App, plugin: StockBlocksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Data source')
			.setDesc('Stock data is fetched from Yahoo Finance API with clear error messages if unavailable')
			.addText(text => text
				.setPlaceholder('No API key required')
				.setValue('Yahoo Finance (Free)')
				.setDisabled(true));

		new Setting(containerEl)
			.setName('Default days')
			.setDesc('Default number of days for historical data (used when not specified in code blocks)')
			.addSlider(slider => slider
				.setLimits(7, 365, 1)
				.setValue(this.plugin.settings.defaultDays)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.defaultDays = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use business days')
			.setDesc('When enabled, "days" parameters are interpreted as business/trading days rather than calendar days. This ensures better data for short time periods (1-5 days).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useBusinessDays)
				.onChange(async (value) => {
					this.plugin.settings.useBusinessDays = value;
					this.plugin.stockDataService.setUseBusinessDays(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show sparklines by default')
			.setDesc('Default setting for displaying sparkline charts in stock lists. This can be overridden per code block using the "sparkline" property.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultShowSparklines)
				.onChange(async (value) => {
					this.plugin.settings.defaultShowSparklines = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Cache duration')
			.setDesc('How long to cache stock data (in minutes)')
			.addSlider(slider => slider
				.setLimits(1, 60, 1)
				.setValue(this.plugin.settings.cacheDuration)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.cacheDuration = value;
					this.plugin.stockDataService.setCacheDuration(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Clear cache')
			.setDesc(`Clear all cached stock data (current cache: ${this.plugin.stockDataService.getCacheSize()} entries, ${this.plugin.stockDataService.getCacheMemorySize()})`)
			.addButton(button => button
				.setButtonText('Clear Cache')
				.onClick(async () => {
				try {
					this.plugin.stockDataService.clearCache();
					new Notice('Stock data cache cleared');
					this.display();
				} catch (error) {
					new Notice('Error clearing cache');
				}
			}));

		new Setting(containerEl)
			.setName('Using the plugin')
			.setHeading();
		
		containerEl.createEl('p', { text: 'Using the plugin is as easy as specifying a single stock symbol in your markdown.' });
		const usageContainer = containerEl.createEl('div', { cls: 'stock-blocks-usage' });

		usageContainer.createEl('h3', { text: 'Stock block' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: AAPL\n' +
			'```'
		);

		usageContainer.createEl('p', { text: 'When only the stock is specified, the plugin will use the default settings for all other properties. But you can still override the default settings by specifying additional properties in the block.' });
		usageContainer.createEl('p', { text: 'Below is an example of a stock block with all available properties specified. The order of properties does not matter.' });

		usageContainer.createEl('h4', { text: 'Stock block - all properties' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: AAPL\n' +
			'useCandles: false\n' +
			'days: 365\n' +
			'width: 900\n' +
			'height: 400\n' +
			'showAxes: true\n' +
			'linkStyle: none | wikilink | markdown\n' +
			'showLastUpdate: true\n' +
			'showTodayChange: true\n' +
			'refreshInterval: 15\n' +
			'title: Apple Inc. Stock Performance\n' +
			'description: One year price chart\n' +
			'```'
		);

		usageContainer.createEl('h4', { text: 'Candlestick chart' });
		usageContainer.createEl('p', { text: 'Display OHLC (Open, High, Low, Close) data as traditional candlestick bars by setting useCandles to true:' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: AAPL\n' +
			'useCandles: true\n' +
			'```'
		);

		const calloutEl = usageContainer.createEl('div', { cls: 'stock-callout' });
		
		const noteHeader = calloutEl.createEl('div', { cls: 'callout-title stock-callout-title' });
		noteHeader.createEl('span', { text: 'Tip - stock property' });

		const noteContent = calloutEl.createEl('div', { cls: 'callout-content stock-callout-content' });
		noteContent.textContent = 'The main `stock` property is flexible. You can also use `symbol`, `ticker`, or even plural forms like `stocks` or `tickers`.';

		const chartTypeCalloutEl = usageContainer.createEl('div', { cls: 'stock-callout' });
		
		const chartTypeHeader = chartTypeCalloutEl.createEl('div', { cls: 'callout-title stock-callout-title' });
		chartTypeHeader.createEl('span', { text: 'Chart types' });

		const chartTypeContent = chartTypeCalloutEl.createEl('div', { cls: 'callout-content stock-callout-content' });
		
		const chartTypeIntro = chartTypeContent.createEl('p');
		chartTypeIntro.textContent = 'Stock blocks support two chart types:';
		
		const chartTypeList = chartTypeContent.createEl('ul', { cls: 'stock-callout-list' });
		
		const lineItem = chartTypeList.createEl('li');
		const lineStrong = lineItem.createEl('strong');
		lineStrong.textContent = 'Line Chart (default):';
		lineItem.appendText(' Shows price movement as a connected line');
		
		const candleItem = chartTypeList.createEl('li');
		const candleStrong = candleItem.createEl('strong');
		candleStrong.textContent = 'Candlestick Chart:';
		candleItem.appendText(' Shows OHLC data as traditional candlestick bars (set useCandles: true)');

		usageContainer.createEl('h3', { text: 'Stock block list' });
		this.createCopyableExample(usageContainer,
			'```stock-block-list\n' +
			'stocks: AAPL, MSFT, NVDA, TSLA, SPY\n' +
			'```'
		);

		usageContainer.createEl('p', { text: 'To view stocks from international exchanges like the Toronto Stock Exchange (TSX), London Stock Exchange (LSE), or others, simply append the appropriate exchange suffix to the stock symbol.' });

		usageContainer.createEl('h4', { text: 'International stock chart' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: SHOP.TO\n' +
			'title: Shopify Inc. (Toronto Stock Exchange)\n' +
			'```'
		);

		usageContainer.createEl('h4', { text: 'Global stock list' });
		this.createCopyableExample(usageContainer,
			'```stock-block-list\n' +
			'stocks: SHOP.TO, ASML.AS, VOD.L, SAP.DE, NES.SW\n' +
			'title: International Portfolio\n' +
			'description: Stocks from Toronto, Amsterdam, London, Frankfurt, and Zurich\n' +
			'```'
		);

		usageContainer.createEl('p', { text: 'Common exchange suffixes: ".TO" (Toronto), ".L" (London), ".PA" (Paris), ".DE" (Frankfurt), ".AS" (Amsterdam), ".SW" (Switzerland).' });
		usageContainer.createEl('p', { text: 'Below is an example of a stock block list with all available properties specified. The order of properties does not matter.' });

		usageContainer.createEl('h4', { text: 'Stock list - all properties' });
		this.createCopyableExample(usageContainer,
			'```stock-block-list\n' +
			'stocks: AAPL, MSFT, NVDA, TSLA, SPY\n' +
			'days: 365\n' +
			'width: 900\n' +
			'height: 400\n' +
			'sparkline: true\n' +
			'linkStyle: none | wikilink | markdown\n' +
			'showLastUpdate: true\n' +
			'showTodayChange: true\n' +
			'refreshInterval: 15\n' +
			'title: Stock Performance List\n' +
			'description: One year price chart of my watch list\n' +
			'```'
		);

		const linkCalloutEl = usageContainer.createEl('div', { cls: 'stock-callout' });
		
		const linkHeader = linkCalloutEl.createEl('div', { cls: 'callout-title stock-callout-title' });
		linkHeader.createEl('span', { text: 'Tip - linkStyle property' });

		const linkContent = linkCalloutEl.createEl('div', { cls: 'callout-content stock-callout-content' });
		
		const introText = linkContent.createEl('p');
		introText.textContent = 'Stock symbols in a stocklist have three format properties. They are Obsidian wikilinks by default.';
		
		const list = linkContent.createEl('ul', { cls: 'stock-callout-list' });
		
		const noneItem = list.createEl('li');
		const noneStrong = noneItem.createEl('strong');
		noneStrong.textContent = 'none:';
		noneItem.appendText(' Plain text');
		
		const wikilinkItem = list.createEl('li');
		const wikilinkStrong = wikilinkItem.createEl('strong');
		wikilinkStrong.textContent = 'wikilink:';
		wikilinkItem.appendText(' [[AAPL]] Obsidian links');
		
		const markdownItem = list.createEl('li');
		const markdownStrong = markdownItem.createEl('strong');
		markdownStrong.textContent = 'markdown:';
		markdownItem.appendText(' Links to Yahoo Finance');
	}

	private createCopyableExample(container: HTMLElement, codeText: string): void {
		const exampleContainer = container.createEl('div', { cls: 'stock-example-container' });

		// Create a textarea for better copy functionality
		const textArea = exampleContainer.createEl('textarea', {
			cls: 'stock-example-code',
			attr: {
				readonly: 'true',
				rows: codeText.split('\n').length.toString()
			}
		});
		textArea.value = codeText;

		const copyButton = exampleContainer.createEl('button', {
			cls: 'stock-copy-button',
			text: 'Copy'
		});

		copyButton.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(codeText);
				copyButton.textContent = 'Copied!';
				setTimeout(() => {
					copyButton.textContent = 'Copy';
				}, 2000);
			} catch (err) {
				new Notice('Failed to copy to clipboard');
				console.error('Clipboard copy failed:', err);
			}
		});

		textArea.addEventListener('click', () => {
			textArea.select();
		});
	}
}
