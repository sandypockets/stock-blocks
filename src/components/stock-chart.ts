import { SingleStockBlockConfig, StockData, ChartData } from '../types';
import { formatPrice, formatPercentage } from '../utils/formatters';
import { createTooltip, updateTooltip, updateCandlestickTooltip, hideTooltip } from '../utils/tooltip-utils';
import { createInteractiveChart, interpolatePrice } from '../utils/line-chart-utils';
import { createCandlestickChart, interpolateCandlestickPrice } from '../utils/candlestick-utils';
import { getTimeRangeDescription, calculateOptimalDateRange } from '../utils/date-utils';
import { calculatePriceRange } from '../utils/math-utils';
import { MarkdownRenderer, Component, App } from 'obsidian';

export class StockChartComponent extends Component {
	private container: HTMLElement;
	private config: SingleStockBlockConfig;
	private data: StockData | null = null;
	private tooltip: HTMLElement | null = null;
	private currentChartId: string | null = null;
	private app: App;
	private autoRefreshInterval?: number;
	private lastUpdate: Date = new Date();
	public refreshDataCallback?: () => Promise<void>;
	private eventListeners: { element: Element; event: string; handler: EventListener }[] = [];

	constructor(container: HTMLElement, config: SingleStockBlockConfig, app?: App) {
		super();
		this.container = container;
		this.config = config;
		this.app = app || (window as any).app;
		this.tooltip = createTooltip();
	}

	async render(stockData: StockData): Promise<void> {
		this.data = stockData;
		this.container.empty();
		this.container.addClass('stock-chart-container');

		// Clear any existing event listeners when re-rendering
		for (const { element, event, handler } of this.eventListeners) {
			element.removeEventListener(event, handler);
		}
		this.eventListeners = [];

		if (!this.data) {
			this.container.createEl('div', {
				text: 'No stock data available',
				cls: 'stock-chart-empty'
			});
			return;
		}

		if (this.config.title || this.config.description) {
			const customHeader = this.container.createEl('div', { cls: 'stock-chart-custom-header' });
			
			if (this.config.title) {
				customHeader.createEl('h4', { 
					text: this.config.title, 
					cls: 'stock-chart-custom-title' 
				});
			}
			
			if (this.config.description) {
				customHeader.createEl('p', { 
					text: this.config.description, 
					cls: 'stock-chart-custom-description' 
				});
			}
		}

		const header = this.container.createEl('div', { cls: 'stock-chart-header' });
		this.renderHeader(header);

		const subtitle = this.container.createEl('div', { cls: 'stock-chart-subtitle' });
		this.renderSubtitle(subtitle);

		const chartContainer = this.container.createEl('div', { cls: 'stock-chart-svg-container' });
		this.renderChart(chartContainer);

		const bottomSection = this.container.createEl('div', { cls: 'stock-chart-bottom-section' });
		this.renderBottomSection(bottomSection);
	}

	private renderHeader(container: HTMLElement): void {
		if (!this.data) return;

		const headerContainer = container.createEl('div', { cls: 'stock-chart-header-flex' });
		const titleRow = headerContainer.createEl('div', { cls: 'stock-chart-title-row' });
		const symbolContainer = titleRow.createEl('span', { cls: 'stock-chart-symbol' });
		
		this.renderSymbol(symbolContainer, this.data.symbol);

		const _priceEl = titleRow.createEl('span', {
			text: formatPrice(this.data.price, this.data.currency),
			cls: 'stock-chart-price'
		});

		// Render change information based on whether today's change is shown
		if (this.shouldShowTodayChange()) {
			// Show both period change and today's change
			const days = this.config.days;
			const dayText = days === 1 ? '1 day' : `${days} days`;
			
			const _periodChangeEl = titleRow.createEl('span', {
				text: `${formatPrice(this.data.change, this.data.currency)} (${formatPercentage(this.data.changePercent)}) ${dayText}`,
				cls: this.data.changePercent >= 0 ? 'stock-chart-change-positive' : 'stock-chart-change-negative'
			});

			if (this.data.todayChangePercent !== undefined && this.data.todayChange !== undefined) {
				const todayChangeEl = titleRow.createEl('span', {
					text: `${formatPrice(this.data.todayChange, this.data.currency)} (${formatPercentage(this.data.todayChangePercent)}) Today`,
					cls: this.data.todayChangePercent >= 0 ? 'stock-chart-change-positive' : 'stock-chart-change-negative'
				});
				todayChangeEl.addClass('stock-chart-today-change');
			}
		} else {
			// Show only period change with simplified period label
			const days = this.config.days;
			const dayText = days === 1 ? '1 day' : `${days} days`;
			
			const _changeEl = titleRow.createEl('span', {
				text: `${formatPrice(this.data.change, this.data.currency)} (${formatPercentage(this.data.changePercent)}) ${dayText}`,
				cls: this.data.changePercent >= 0 ? 'stock-chart-change-positive' : 'stock-chart-change-negative'
			});
		}
	}

	private renderSubtitle(container: HTMLElement): void {
		if (!this.data || this.data.historicalPrices.length === 0) return;

		const prices = this.data.historicalPrices;
		const { min, max } = calculatePriceRange(prices);

		const startDate = new Date(this.data.timestamps[0]).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
		const endDate = new Date(this.data.timestamps[this.data.timestamps.length - 1]).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		container.createEl('span', {
			text: `Range: ${formatPrice(min, this.data.currency)} – ${formatPrice(max, this.data.currency)} | ${startDate} – ${endDate}`,
			cls: 'stock-chart-range'
		});
	}

	private renderBottomSection(container: HTMLElement): void {
		if (!this.data) return;

		// Only show bottom section if showLastUpdate is not explicitly false
		if (this.config.showLastUpdate !== false) {
			const leftSection = container.createEl('div', { cls: 'stock-chart-bottom-left' });
			const rightSection = container.createEl('div', { cls: 'stock-chart-bottom-right' });

			// Calculate the optimal date range to show what period was actually used
			const dateRange = calculateOptimalDateRange(this.config.days, true);
			const timeRangeDesc = getTimeRangeDescription(this.config.days, true, dateRange);
			
			leftSection.createEl('span', {
				text: timeRangeDesc,
				cls: 'stock-chart-days-info'
			});

			rightSection.createEl('span', {
				text: `Last updated: ${this.lastUpdate.toLocaleTimeString()}`,
				cls: 'stock-chart-updated'
			});

			const refreshBtn = rightSection.createEl('button', {
				text: '↻ Refresh',
				cls: 'stock-list-refresh-btn stock-list-refresh-btn-bottom'
			});
			this.addEventListenerTracked(refreshBtn, 'click', () => this.refreshData());

			if (this.config.refreshInterval && this.config.refreshInterval > 0) {
				const autoRefreshBtn = rightSection.createEl('button', {
					text: '⏱ Auto',
					cls: 'stock-list-auto-refresh-btn stock-list-auto-refresh-btn-bottom'
				});
				this.addEventListenerTracked(autoRefreshBtn, 'click', () => this.toggleAutoRefresh());
			}
		}

		this.setupAutoRefresh();
	}

	private renderChart(container: HTMLElement): void {
		if (!this.data || this.data.historicalPrices.length === 0) return;

		let svg: string;
		let chartId: string;

		if (this.config.useCandles && this.data.ohlcData && this.data.ohlcData.length > 0) {
			// Render candlestick chart
			const result = createCandlestickChart(
				this.data.ohlcData,
				this.data.timestamps,
				this.config.width,
				this.config.height,
				this.config.showAxes,
				this.data.currency
			);
			svg = result.svg;
			chartId = result.chartId;
		} else {
			// Render line chart (default)
			const result = createInteractiveChart(
				this.data.historicalPrices,
				this.data.timestamps,
				this.config.width,
				this.config.height,
				this.config.showAxes,
				this.data.currency
			);
			svg = result.svg;
			chartId = result.chartId;
		}

		this.currentChartId = chartId;
		// Use innerHTML for SVG content - this is safe since we control SVG generation
		container.innerHTML = svg;
		
		this.setupChartInteractions(container, chartId);
	}

	private setupChartInteractions(container: HTMLElement, chartId: string): void {
		const svg = container.querySelector(`[data-chart-id="${chartId}"]`) as SVGElement;
		const overlay = svg?.querySelector('.chart-overlay') as SVGRectElement;
		const hoverLine = svg?.querySelector('.hover-line') as SVGLineElement;
		const hoverDot = svg?.querySelector('.hover-dot') as SVGCircleElement;

		if (!svg || !overlay || !hoverLine || !hoverDot || !this.tooltip) return;

		const chartDataAttr = svg.getAttribute('data-chart-data');
		if (!chartDataAttr) return;

		let chartData: ChartData;
		try {
			chartData = JSON.parse(chartDataAttr);
		} catch (e) {
			return;
		}

		this.addEventListenerTracked(overlay, 'mouseenter', () => {
			hoverLine.classList.add('visible');
			hoverDot.classList.add('visible');
		});

		this.addEventListenerTracked(overlay, 'mouseleave', () => {
			hoverLine.classList.remove('visible');
			hoverDot.classList.remove('visible');
			if (this.tooltip) {
				hideTooltip(this.tooltip);
			}
		});

		this.addEventListenerTracked(overlay, 'mousemove', (event: MouseEvent) => {
			const rect = svg.getBoundingClientRect();
			
			// Calculate mouse position relative to SVG coordinates
			let mouseX: number;
			let _mouseY: number;
			
			try {
				const svgElement = svg as SVGSVGElement;
				const svgRect = svgElement.viewBox.baseVal;
				
				// Get mouse position relative to SVG with proper scaling
				const scaleX = svgRect.width / rect.width;
				const scaleY = svgRect.height / rect.height;
				
				mouseX = (event.clientX - rect.left) * scaleX;
				_mouseY = (event.clientY - rect.top) * scaleY;
			} catch (e) {
				// Fallback to simple coordinate calculation
				mouseX = event.clientX - rect.left;
				_mouseY = event.clientY - rect.top;
			}

			// Clamp mouseX to chart bounds
			const rightBound = chartData.padding + chartData.chartWidth;
			const clampedMouseX = Math.max(chartData.padding, Math.min(rightBound, mouseX));

			// Update hover line position
			hoverLine.setAttribute('x1', clampedMouseX.toString());
			hoverLine.setAttribute('x2', clampedMouseX.toString());

			// Check if this is a candlestick chart
			const isCandlestickChart = svg.classList.contains('candlestick-chart');

			if (isCandlestickChart && chartData.candles) {
				// Handle candlestick chart interactions
				const interpolated = interpolateCandlestickPrice(clampedMouseX, chartData);
				if (interpolated && this.tooltip) {
					// Calculate Y position for the dot (use close price)
					const { y } = this.calculateYPosition(interpolated.close, chartData);
					hoverDot.setAttribute('cx', clampedMouseX.toString());
					hoverDot.setAttribute('cy', y.toString());

					// Update tooltip with OHLC data using screen coordinates
					updateCandlestickTooltip(
						this.tooltip,
						event.clientX,
						event.clientY,
						{
							open: interpolated.open,
							high: interpolated.high,
							low: interpolated.low,
							close: interpolated.close
						},
						interpolated.timestamp,
						chartData.currency
					);
				}
			} else {
				// Handle line chart interactions (original logic)
				const interpolated = interpolatePrice(clampedMouseX, chartData);
				if (interpolated && this.tooltip) {
					// Calculate Y position for the dot on the line
					const { y } = this.calculateYPosition(interpolated.price, chartData);
					hoverDot.setAttribute('cx', clampedMouseX.toString());
					hoverDot.setAttribute('cy', y.toString());

					updateTooltip(
						this.tooltip,
						event.clientX,
						event.clientY,
						interpolated.price,
						interpolated.timestamp,
						chartData.currency
					);
				}
			}
		});
	}

	private calculateYPosition(price: number, chartData: ChartData): { y: number } {
		const { padding, chartHeight, min, range } = chartData;
		const y = padding + chartHeight - ((price - min) / range) * chartHeight;
		return { y };
	}

	updateConfig(config: SingleStockBlockConfig): void {
		this.config = config;
		if (this.data) {
			this.render(this.data);
		}
	}

	updateData(stockData: StockData): void {
		this.render(stockData);
	}

	private shouldShowTodayChange(): boolean {
		return this.config.showTodayChange === true && this.config.days >= 2 && 
			this.data?.todayChangePercent !== undefined;
	}

	destroy(): void {
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
	}

	private async refreshData(): Promise<void> {
		if (this.refreshDataCallback) {
			try {
				const refreshBtn = this.container.querySelector('.stock-list-refresh-btn') as HTMLButtonElement;
				if (refreshBtn) {
					refreshBtn.disabled = true;
					refreshBtn.textContent = '⟳ Loading...';
				}
				
				await this.refreshDataCallback();
				this.lastUpdate = new Date();
				
				if (refreshBtn) {
					refreshBtn.disabled = false;
					refreshBtn.textContent = '↻ Refresh';
				}
			} catch (error) {
				const refreshBtn = this.container.querySelector('.stock-list-refresh-btn') as HTMLButtonElement;
				if (refreshBtn) {
					refreshBtn.disabled = false;
					refreshBtn.textContent = '↻ Refresh';
				}
			}
		}
	}

	private async renderSymbol(container: HTMLElement, symbol: string): Promise<void> {
		switch (this.config.linkStyle) {
			case 'wikilink':
				// Use MarkdownRenderer to properly process wikilinks
				await MarkdownRenderer.render(
					this.app,
					`[[${symbol}]]`,
					container,
					'',
					this
				);
				break;
			case 'markdown':
				// Create a proper HTML link
				const link = container.createEl('a', {
					text: symbol,
					href: `https://finance.yahoo.com/quote/${symbol}`,
					cls: 'external-link'
				});
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener');
				break;
			case 'none':
			default:
				container.createEl('span', { text: symbol });
				break;
		}
	}

	private toggleAutoRefresh(): void {
		const autoRefreshBtn = this.container.querySelector('.stock-list-auto-refresh-btn') as HTMLButtonElement;
		if (!autoRefreshBtn) return;

		if (this.autoRefreshInterval) {
			// Stop auto-refresh
			clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
			autoRefreshBtn.textContent = '⏱ Auto';
			autoRefreshBtn.classList.remove('active');
		} else {
			// Start auto-refresh
			if (this.config.refreshInterval && this.config.refreshInterval > 0) {
				this.autoRefreshInterval = window.setInterval(() => {
					this.refreshData();
				}, this.config.refreshInterval * 60 * 1000);
				autoRefreshBtn.textContent = '⏹ Stop';
				autoRefreshBtn.classList.add('active');
			}
		}
	}

	private setupAutoRefresh(): void {
		if (this.config.refreshInterval && this.config.refreshInterval > 0) {
			// Auto-refresh is handled by the toggle button, not automatically started
		}
	}

	private addEventListenerTracked(element: Element, event: string, handler: EventListener): void {
		element.addEventListener(event, handler);
		this.eventListeners.push({ element, event, handler });
	}

	onunload(): void {
		if (this.autoRefreshInterval) {
			clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
		}
		
		for (const { element, event, handler } of this.eventListeners) {
			element.removeEventListener(event, handler);
		}
		this.eventListeners = [];
		
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
	}
}
