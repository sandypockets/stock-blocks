import { MarkdownRenderer, Component, App } from 'obsidian';
import { SingleStockBlockConfig, StockData, ChartData } from '../types';
import { formatPrice, formatPercentage } from '../utils/formatters';
import { createTooltip, updateTooltip, updateCandlestickTooltip, hideTooltip } from '../utils/tooltip-utils';
import { createInteractiveChart, interpolatePrice } from '../utils/line-chart-utils';
import { createCandlestickChart, interpolateCandlestickPrice } from '../utils/candlestick-utils';
import { getTimeRangeDescription, calculateOptimalDateRange } from '../utils/date-utils';
import { calculatePriceRange } from '../utils/math-utils';

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

	constructor(container: HTMLElement, config: SingleStockBlockConfig, app: App) {
		super();
		this.container = container;
		this.config = config;
		this.app = app;
		this.tooltip = createTooltip(this.container.ownerDocument);
	}

	async render(stockData: StockData): Promise<void> {
		this.data = stockData;
		this.container.empty();
		this.container.addClass('stock-chart-container');

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
		await this.renderHeader(header);

		const subtitle = this.container.createEl('div', { cls: 'stock-chart-subtitle' });
		this.renderSubtitle(subtitle);

		const chartContainer = this.container.createEl('div', { cls: 'stock-chart-svg-container' });
		this.renderChart(chartContainer);

		const bottomSection = this.container.createEl('div', { cls: 'stock-chart-bottom-section' });
		this.renderBottomSection(bottomSection);
	}

	private async renderHeader(container: HTMLElement): Promise<void> {
		if (!this.data) return;

		const headerContainer = container.createEl('div', { cls: 'stock-chart-header-flex' });
		const titleRow = headerContainer.createEl('div', { cls: 'stock-chart-title-row' });
		const symbolContainer = titleRow.createEl('span', { cls: 'stock-chart-symbol' });

		await this.renderSymbol(symbolContainer, this.data.symbol);

		titleRow.createEl('span', {
			text: formatPrice(this.data.price, this.data.currency),
			cls: 'stock-chart-price'
		});

		if (this.shouldShowTodayChange()) {
			const days = this.config.days;
			const dayText = days === 1 ? '1 day' : `${days} days`;

			titleRow.createEl('span', {
				text: `${formatPrice(this.data.change, this.data.currency)} (${formatPercentage(this.data.changePercent)}) ${dayText}`,
				cls: this.data.changePercent >= 0 ? 'stock-chart-change-positive' : 'stock-chart-change-negative'
			});

			if (this.data.todayChangePercent !== undefined && this.data.todayChange !== undefined) {
				const todayChangeEl = titleRow.createEl('span', {
					text: `${formatPrice(this.data.todayChange, this.data.currency)} (${formatPercentage(this.data.todayChangePercent)}) today`,
					cls: this.data.todayChangePercent >= 0 ? 'stock-chart-change-positive' : 'stock-chart-change-negative'
				});
				todayChangeEl.addClass('stock-chart-today-change');
			}
		} else {
			const days = this.config.days;
			const dayText = days === 1 ? '1 day' : `${days} days`;

			titleRow.createEl('span', {
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

		if (this.config.showLastUpdate === false) {
			return;
		}

		const leftSection = container.createEl('div', { cls: 'stock-chart-bottom-left' });
		const rightSection = container.createEl('div', { cls: 'stock-chart-bottom-right' });

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
		this.addEventListenerTracked(refreshBtn, 'click', () => void this.refreshData());

		if (this.config.refreshInterval && this.config.refreshInterval > 0) {
			const autoRefreshBtn = rightSection.createEl('button', {
				text: '⏱ Auto',
				cls: 'stock-list-auto-refresh-btn stock-list-auto-refresh-btn-bottom'
			});
			this.addEventListenerTracked(autoRefreshBtn, 'click', () => this.toggleAutoRefresh());
		}
	}

	private renderChart(container: HTMLElement): void {
		if (!this.data || this.data.historicalPrices.length === 0) return;

		const doc = container.ownerDocument;
		const result = this.config.useCandles && this.data.ohlcData && this.data.ohlcData.length > 0
			? createCandlestickChart(
				doc,
				this.data.ohlcData,
				this.data.timestamps,
				this.config.width,
				this.config.height,
				this.config.showAxes,
				this.data.currency
			)
			: createInteractiveChart(
				doc,
				this.data.historicalPrices,
				this.data.timestamps,
				this.config.width,
				this.config.height,
				this.config.showAxes,
				this.data.currency
			);

		this.currentChartId = result.chartId;
		container.empty();
		container.appendChild(result.svg);
		this.setupChartInteractions(container, result.chartId, result.chartData);
	}

	private setupChartInteractions(container: HTMLElement, chartId: string, chartData: ChartData): void {
		const svg = container.querySelector(`[data-chart-id="${chartId}"]`) as SVGElement;
		const overlay = svg?.querySelector('.chart-overlay') as SVGRectElement;
		const hoverLine = svg?.querySelector('.hover-line') as SVGLineElement;
		const hoverDot = svg?.querySelector('.hover-dot') as SVGCircleElement;

		if (!svg || !overlay || !hoverLine || !hoverDot || !this.tooltip) return;

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
			let mouseX: number;

			try {
				const svgElement = svg as SVGSVGElement;
				const svgRect = svgElement.viewBox.baseVal;
				const scaleX = svgRect.width / rect.width;
				mouseX = (event.clientX - rect.left) * scaleX;
			} catch {
				mouseX = event.clientX - rect.left;
			}

			const rightBound = chartData.padding + chartData.chartWidth;
			const clampedMouseX = Math.max(chartData.padding, Math.min(rightBound, mouseX));

			hoverLine.setAttribute('x1', clampedMouseX.toString());
			hoverLine.setAttribute('x2', clampedMouseX.toString());

			if (svg.classList.contains('candlestick-chart') && chartData.candles) {
				const interpolated = interpolateCandlestickPrice(clampedMouseX, chartData);
				if (interpolated && this.tooltip) {
					const { y } = this.calculateYPosition(interpolated.close, chartData);
					hoverDot.setAttribute('cx', clampedMouseX.toString());
					hoverDot.setAttribute('cy', y.toString());

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
				return;
			}

			const interpolated = interpolatePrice(clampedMouseX, chartData);
			if (interpolated && this.tooltip) {
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
			void this.render(this.data);
		}
	}

	updateData(stockData: StockData): void {
		void this.render(stockData);
	}

	private shouldShowTodayChange(): boolean {
		return this.config.showTodayChange === true &&
			this.config.days >= 2 &&
			this.data?.todayChangePercent !== undefined;
	}

	destroy(): void {
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
	}

	private async refreshData(): Promise<void> {
		if (!this.refreshDataCallback) {
			return;
		}

		const refreshBtn = this.container.querySelector('.stock-list-refresh-btn') as HTMLButtonElement;
		if (refreshBtn) {
			refreshBtn.disabled = true;
			refreshBtn.textContent = '⟳ Loading...';
		}

		try {
			await this.refreshDataCallback();
			this.lastUpdate = new Date();
		} finally {
			if (refreshBtn) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = '↻ Refresh';
			}
		}
	}

	private async renderSymbol(container: HTMLElement, symbol: string): Promise<void> {
		switch (this.config.linkStyle) {
			case 'wikilink':
				await MarkdownRenderer.render(
					this.app,
					`[[${symbol}]]`,
					container,
					'',
					this
				);
				break;
			case 'markdown': {
				const link = container.createEl('a', {
					text: symbol,
					href: `https://finance.yahoo.com/quote/${symbol}`,
					cls: 'external-link'
				});
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener');
				break;
			}
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
			window.clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
			autoRefreshBtn.textContent = '⏱ Auto';
			autoRefreshBtn.classList.remove('active');
			return;
		}

		if (this.config.refreshInterval && this.config.refreshInterval > 0) {
			this.autoRefreshInterval = window.setInterval(() => {
				void this.refreshData();
			}, this.config.refreshInterval * 60 * 1000);
			autoRefreshBtn.textContent = '⏹ Stop';
			autoRefreshBtn.classList.add('active');
		}
	}

	private addEventListenerTracked(element: Element, event: string, handler: EventListener): void {
		element.addEventListener(event, handler);
		this.eventListeners.push({ element, event, handler });
	}

	onunload(): void {
		if (this.autoRefreshInterval) {
			window.clearInterval(this.autoRefreshInterval);
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
