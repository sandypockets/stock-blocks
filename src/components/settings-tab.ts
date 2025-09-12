import { App, PluginSettingTab, Setting, Notice } from 'obsidian';

export class StockBlocksSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
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
			.setDesc(`Clear all cached stock data (current cache: ${this.plugin.stockDataService.getCacheSize()} entries)`)
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


		const usageHeader = containerEl.createEl('h2', { text: 'Using the plugin' });
		usageHeader.style.fontSize = '1.5rem';
		usageHeader.style.fontWeight = 'bold';
		usageHeader.style.marginTop = '2rem';
		usageHeader.style.marginBottom = '1rem';
		usageHeader.style.color = 'var(--text-normal)';
		
		containerEl.createEl('p', { text: 'Using the plugin is as easy as specifying a single stock symbol in your markdown.' });
		
		const usageContainer = containerEl.createEl('div', { cls: 'stock-blocks-usage' });

		usageContainer.createEl('h3', { text: 'Stock Block' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: AAPL\n' +
			'```'
		);

		usageContainer.createEl('p', { text: 'When only the stock is specified, the plugin will use the default settings for all other properties. But you can still override the default settings by specifying additional properties in the block.' });
		usageContainer.createEl('p', { text: 'Below is an example of a stock block with all available properties specified. The order of properties does not matter.' });

		usageContainer.createEl('h4', { text: 'Stock Block - All properties' });
		this.createCopyableExample(usageContainer,
			'```stock-block\n' +
			'stock: AAPL\n' +
			'days: 365\n' +
			'width: 900\n' +
			'height: 400\n' +
			'showAxes: true\n' +
			'linkStyle: none | wikilink | markdown\n' +
			'showLastUpdate: true\n' +
			'refreshInterval: 15\n' +
			'title: Apple Inc. Stock Performance\n' +
			'description: One year price chart\n' +
			'```'
		);

		const calloutEl = usageContainer.createEl('div', { cls: 'stock-callout' });
		calloutEl.style.background = 'var(--background-secondary)';
		calloutEl.style.border = '1px solid var(--background-modifier-border)';
		calloutEl.style.borderLeft = '4px solid var(--text-accent)';
		calloutEl.style.borderRadius = '4px';
		calloutEl.style.padding = '12px 16px';
		calloutEl.style.margin = '12px 0';
		calloutEl.style.fontSize = '14px';
		calloutEl.style.lineHeight = '1.4';
		
		const noteHeader = calloutEl.createEl('div', { cls: 'callout-title' });
		noteHeader.style.fontWeight = 'bold';
		noteHeader.style.color = 'var(--text-accent)';
		noteHeader.style.marginBottom = '4px';
		noteHeader.style.display = 'flex';
		noteHeader.style.alignItems = 'center';
		noteHeader.style.gap = '6px';
		noteHeader.createEl('span', { text: 'Tip - stock property' });

		const noteContent = calloutEl.createEl('div', { cls: 'callout-content' });
		noteContent.style.color = 'var(--text-normal)';
		noteContent.textContent = 'The main `stock` property is flexible. You can also use `symbol`, `ticker`, or even plural forms like `stocks` or `tickers`.';

		usageContainer.createEl('h3', { text: 'Stock Block List' });
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

		usageContainer.createEl('h4', { text: 'Stock List - All properties' });
		this.createCopyableExample(usageContainer,
			'```stock-block-list\n' +
			'stocks: AAPL, MSFT, NVDA, TSLA, SPY\n' +
			'days: 365\n' +
			'width: 900\n' +
			'height: 400\n' +
			'showAxes: false\n' +
			'linkStyle: none | wikilink | markdown\n' +
			'showLastUpdate: true\n' +
			'refreshInterval: 15\n' +
			'title: Stock Performance List\n' +
			'description: One year price chart of my watch list\n' +
			'```'
		);

		const linkCalloutEl = usageContainer.createEl('div', { cls: 'stock-callout' });
		linkCalloutEl.style.background = 'var(--background-secondary)';
		linkCalloutEl.style.border = '1px solid var(--background-modifier-border)';
		linkCalloutEl.style.borderLeft = '4px solid var(--text-accent)';
		linkCalloutEl.style.borderRadius = '4px';
		linkCalloutEl.style.padding = '12px 16px';
		linkCalloutEl.style.margin = '12px 0';
		linkCalloutEl.style.fontSize = '14px';
		linkCalloutEl.style.lineHeight = '1.4';
		
		const linkHeader = linkCalloutEl.createEl('div', { cls: 'callout-title' });
		linkHeader.style.fontWeight = 'bold';
		linkHeader.style.color = 'var(--text-accent)';
		linkHeader.style.marginBottom = '4px';
		linkHeader.style.display = 'flex';
		linkHeader.style.alignItems = 'center';
		linkHeader.style.gap = '6px';
		linkHeader.createEl('span', { text: 'Tip - linkStyle property' });

		const linkContent = linkCalloutEl.createEl('div', { cls: 'callout-content' });
		linkContent.style.color = 'var(--text-normal)';
		linkContent.innerHTML = 'Stock symbols in a stocklist have three format properties. They are Obsidian wikilinks by default.<br><br>- <strong>none:</strong> Plain text<br>- <strong>wikilink:</strong> [[AAPL]] Obsidian links<br>- <strong>markdown:</strong> Links to Yahoo Finance';
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

		// Make it look like a code block
		textArea.style.fontFamily = 'monospace';
		textArea.style.fontSize = '13px';
		textArea.style.background = 'var(--background-secondary)';
		textArea.style.border = '1px solid var(--background-modifier-border)';
		textArea.style.borderRadius = '4px';
		textArea.style.padding = '8px';
		textArea.style.width = '100%';
		textArea.style.resize = 'none';
		textArea.style.color = 'var(--text-normal)';

		const copyButton = exampleContainer.createEl('button', {
			cls: 'stock-copy-button',
			text: 'Copy'
		});
		copyButton.style.marginTop = '4px';
		copyButton.style.padding = '4px 8px';
		copyButton.style.fontSize = '12px';

		copyButton.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(codeText);
				copyButton.textContent = 'Copied!';
				setTimeout(() => {
					copyButton.textContent = 'Copy';
				}, 2000);
			} catch (err) {
				// Fallback for older browsers
				textArea.select();
				document.execCommand('copy');
				copyButton.textContent = 'Copied!';
				setTimeout(() => {
					copyButton.textContent = 'Copy';
				}, 2000);
			}
		});

		textArea.addEventListener('click', () => {
			textArea.select();
		});
	}
}
