import { MarkdownRenderer, Component, App } from 'obsidian';
import { StockListBlockConfig, StockData, ChartData, StockDataError, StockListDataResult } from '../types';
import { formatPrice, formatPercentage } from '../utils/formatters';
import { createTooltip, hideTooltip } from '../utils/tooltip-utils';
import { createInteractiveSparkline } from '../utils/sparkline-utils';
import { getErrorMessage } from '../utils/error-utils';

export class StockListComponent extends Component {
	private container: HTMLElement;
	private config: StockListBlockConfig;
	private data: StockData[] = [];
	private errors: StockDataError[] = [];
	private app: App;
	private autoRefreshInterval?: number;
	private lastUpdate: Date = new Date();
	private hasLoadedData = false;
	private tooltip: HTMLElement | null = null;
	private sparklineChartIds: string[] = [];
	private refreshErrors = new Map<string, string>();
	public refreshDataCallback?: () => Promise<void>;
	private eventListeners: { element: Element; event: string; handler: EventListener }[] = [];

	constructor(container: HTMLElement, config: StockListBlockConfig, app: App) {
		super();
		this.container = container;
		this.config = config;
		this.app = app;
		this.tooltip = createTooltip(this.container.ownerDocument);
	}

	async render(stockListData: StockListDataResult, updateTimestamp: boolean = true): Promise<void> {
		const previousDataBySymbol = new Map(this.data.map(stock => [stock.symbol, stock]));
		const incomingSymbols = new Set(stockListData.stocks.map(stock => stock.symbol));
		const preservedData = stockListData.errors
			.map(error => previousDataBySymbol.get(error.symbol))
			.filter((stock): stock is StockData => stock !== undefined && !incomingSymbols.has(stock.symbol));

		this.data = stockListData.stocks.concat(preservedData);
		this.errors = stockListData.errors.filter(error => !previousDataBySymbol.has(error.symbol));
		this.refreshErrors = new Map(stockListData.errors.map(error => [error.symbol, error.message]));

		if (updateTimestamp && stockListData.stocks.length > 0) {
			this.lastUpdate = new Date();
			this.hasLoadedData = true;
		}

		this.sparklineChartIds = [];
		
		for (const { element, event, handler } of this.eventListeners) {
			element.removeEventListener(event, handler);
		}
		this.eventListeners = [];
		
		this.container.empty();
		this.container.addClass('stock-list-container');
		this.renderHeader();

		if (this.data.length === 0 && this.errors.length === 0) {
			this.container.createEl('div', {
				text: 'No stock data available',
				cls: 'stock-list-empty'
			});
			return;
		}

		this.sortData();

		const tableWrapper = this.container.createEl('div', { cls: 'stock-list-table-wrapper' });
		const table = tableWrapper.createEl('table', { cls: 'stock-list-table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');

		this.createSortableHeader(headerRow, 'Symbol', 'symbol');
		this.createSortableHeader(headerRow, 'Price', 'price');
		this.createSortableHeader(headerRow, this.getChangeColumnHeader(), 'changePercent');
		if (this.shouldShowTodayColumn()) {
			this.createSortableHeader(headerRow, 'Today', 'todayChangePercent');
		}
		if (this.config.sparkline !== false) {
			headerRow.createEl('th', { text: 'Chart' });
		}

		const tbody = table.createEl('tbody');

		for (const stock of this.data) {
			const row = tbody.createEl('tr', { cls: 'stock-list-row' });
			const refreshError = this.refreshErrors.get(stock.symbol);
			if (refreshError) {
				row.addClass('stock-list-stale-row');
			}

			const symbolCell = row.createEl('td', { cls: 'stock-symbol-cell' });
			await this.renderSymbol(symbolCell, stock.symbol);
			if (refreshError) {
				this.renderRefreshFailureBadge(symbolCell, refreshError);
			}

			const priceCell = row.createEl('td', { cls: 'stock-price-cell' });
			priceCell.setText(formatPrice(stock.price, stock.currency));

			const changeCell = row.createEl('td', { cls: 'stock-change-cell' });
			changeCell.createEl('span', {
				text: formatPercentage(stock.changePercent),
				cls: stock.changePercent >= 0 ? 'stock-change-positive' : 'stock-change-negative'
			});

			if (this.shouldShowTodayColumn()) {
				const todayChangeCell = row.createEl('td', { cls: 'stock-today-change-cell' });
				if (stock.todayChangePercent !== undefined) {
					todayChangeCell.createEl('span', {
						text: formatPercentage(stock.todayChangePercent),
						cls: stock.todayChangePercent >= 0 ? 'stock-change-positive' : 'stock-change-negative'
					});
				} else {
					todayChangeCell.createEl('span', {
						text: 'N/A',
						cls: 'stock-today-unavailable'
					});
				}
			}

			if (this.config.sparkline !== false) {
				const chartCell = row.createEl('td', { cls: 'stock-chart-cell' });
				this.renderSparkline(chartCell, stock);
			}
		}

		for (const error of this.errors) {
			this.renderErrorRow(tbody, error);
		}

		if (this.config.showLastUpdate !== false) {
			const bottomContainer = tableWrapper.createEl('div', { cls: 'stock-list-bottom-container' });
			const leftSection = bottomContainer.createEl('div', { cls: 'stock-list-bottom-left' });
			const daysText = this.config.days === 1 ? '1 day' : `${this.config.days} days`;

			leftSection.createEl('span', {
				text: `Data period: ${daysText}`,
				cls: 'stock-list-days-info'
			});

			const rightSection = bottomContainer.createEl('div', { cls: 'stock-list-bottom-right' });
			rightSection.createEl('span', {
				text: this.hasLoadedData ? `Last updated: ${this.lastUpdate.toLocaleTimeString()}` : 'No successful update yet',
				cls: 'stock-list-info'
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

		this.setupAutoRefresh();
	}

	private renderRefreshFailureBadge(container: HTMLElement, message: string): void {
		const badge = container.createEl('span', {
			text: 'Refresh failed',
			cls: 'stock-refresh-failed-badge'
		});
		badge.title = message;
	}

	private renderErrorRow(tbody: HTMLElement, error: StockDataError): void {
		const row = tbody.createEl('tr', { cls: 'stock-list-row' });
		row.addClass('stock-list-error-row');

		const symbolCell = row.createEl('td', { cls: 'stock-symbol-cell' });
		symbolCell.setText(error.symbol);

		const priceCell = row.createEl('td', { cls: 'stock-price-cell' });
		priceCell.createEl('span', {
			text: 'Unavailable',
			cls: 'stock-list-error-value'
		});

		const changeCell = row.createEl('td', { cls: 'stock-change-cell' });
		const messageEl = changeCell.createEl('span', {
			text: error.message,
			cls: 'stock-list-row-error-message'
		});
		messageEl.title = error.message;

		if (this.shouldShowTodayColumn()) {
			const todayChangeCell = row.createEl('td', { cls: 'stock-today-change-cell' });
			todayChangeCell.createEl('span', {
				text: 'N/A',
				cls: 'stock-today-unavailable'
			});
		}

		if (this.config.sparkline !== false) {
			const chartCell = row.createEl('td', { cls: 'stock-chart-cell' });
			chartCell.createEl('span', {
				text: 'Failed to load',
				cls: 'stock-list-error-value'
			});
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
					href: `https://finance.yahoo.com/quote/${symbol}`
				});
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
				break;
			}
			default:
				container.setText(symbol);
				break;
		}
	}

	private renderSparkline(container: HTMLElement, stock: StockData): void {
		const color = stock.changePercent >= 0 ? '#10b981' : '#ef4444';
		const sparklineWidth = Math.min(this.config.width, 200);
		const sparklineHeight = Math.min(this.config.height, 40);

		const result = createInteractiveSparkline(
			container.ownerDocument,
			stock.historicalPrices,
			sparklineWidth,
			sparklineHeight,
			color,
			stock.currency,
			stock.timestamps
		);

		this.sparklineChartIds.push(result.chartId);
		container.empty();
		container.appendChild(result.svg);
		this.setupSparklineInteractions(container, result.chartId, result.chartData);
	}

	private setupSparklineInteractions(container: HTMLElement, chartId: string, chartData: ChartData): void {
		const svg = container.querySelector(`[data-chart-id="${chartId}"]`) as SVGElement;
		const overlay = svg?.querySelector('.sparkline-overlay') as SVGRectElement;
		const hoverDot = svg?.querySelector('.hover-dot') as SVGCircleElement;

		if (!svg || !overlay || !hoverDot || !this.tooltip) return;

		this.addEventListenerTracked(overlay, 'mouseenter', () => {
			hoverDot.classList.add('visible');
		});

		this.addEventListenerTracked(overlay, 'mouseleave', () => {
			hoverDot.classList.remove('visible');
			if (this.tooltip) {
				hideTooltip(this.tooltip);
			}
		});

		this.addEventListenerTracked(overlay, 'mousemove', (event: MouseEvent) => {
			const rect = svg.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;

			const closestPoint = this.findClosestSparklinePoint(mouseX, chartData);
			if (closestPoint && this.tooltip) {
				hoverDot.setAttribute('cx', closestPoint.x.toString());
				hoverDot.setAttribute('cy', closestPoint.y.toString());

				this.updateSparklineTooltip(
					this.tooltip,
					event.clientX,
					event.clientY,
					closestPoint.price,
					chartData.currency,
					closestPoint.timestamp
				);
			}
		});
	}

	private findClosestSparklinePoint(mouseX: number, chartData: ChartData): { x: number; y: number; price: number; timestamp?: number } | null {
		const { points } = chartData;
		if (!points || points.length === 0) return null;

		let closestPoint = points[0];
		let minDistance = Math.abs(mouseX - points[0].x);

		for (const point of points) {
			const distance = Math.abs(mouseX - point.x);
			if (distance < minDistance) {
				minDistance = distance;
				closestPoint = point;
			}
		}

		return closestPoint;
	}

	private updateSparklineTooltip(
		tooltip: HTMLElement,
		x: number,
		y: number,
		price: number,
		currency: string,
		timestamp?: number
	): void {
		const formattedPrice = formatPrice(price, currency);
		const doc = tooltip.ownerDocument;
		const ownerWindow = doc.defaultView ?? window.activeWindow;

		tooltip.textContent = '';

		const priceDiv = doc.createElement('div');
		priceDiv.className = 'tooltip-price';
		priceDiv.textContent = formattedPrice;
		tooltip.appendChild(priceDiv);

		if (timestamp) {
			const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
			const dateDiv = doc.createElement('div');
			dateDiv.className = 'tooltip-date';
			dateDiv.textContent = formattedDate;
			tooltip.appendChild(dateDiv);
		}

		const rect = tooltip.getBoundingClientRect();
		const tooltipWidth = rect.width || 80;
		const tooltipHeight = rect.height || 30;

		let left = x + 10;
		let top = y - tooltipHeight - 10;

		if (left + tooltipWidth > ownerWindow.innerWidth) {
			left = x - tooltipWidth - 10;
		}
		if (top < 0) {
			top = y + 10;
		}

		tooltip.setCssProps({
			left: `${left}px`,
			top: `${top}px`
		});
		tooltip.classList.remove('hidden');
		tooltip.classList.add('visible');
	}

	updateConfig(config: StockListBlockConfig): void {
		this.config = config;
	}

	updateData(stockListData: StockListDataResult): void {
		void this.render(stockListData);
	}

	private shouldShowTodayColumn(): boolean {
		return this.config.showTodayChange === true &&
			this.config.days >= 2 &&
			this.data.some(stock => stock.todayChangePercent !== undefined);
	}

	private getChangeColumnHeader(): string {
		if (this.shouldShowTodayColumn()) {
			const days = this.config.days;
			return days === 1 ? '1 day' : `${days} days`;
		}

		return 'Change';
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
			this.clearRefreshError();
			await this.refreshDataCallback();
		} catch (error: unknown) {
			this.showRefreshError(getErrorMessage(error, 'Unable to refresh stock data'));
		} finally {
			if (refreshBtn) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = '↻ Refresh';
			}
		}
	}

	private clearRefreshError(): void {
		this.container.querySelector('.stock-refresh-error-banner')?.remove();
	}

	private showRefreshError(message: string): void {
		this.clearRefreshError();

		const banner = this.container.ownerDocument.createElement('div');
		banner.className = 'stock-refresh-error-banner';
		banner.textContent = `Refresh failed: ${message}. Showing last successful data.`;
		this.container.prepend(banner);
	}

	private renderHeader(): void {
		if (this.config.title || this.config.description) {
			const headerInfo = this.container.createEl('div', { cls: 'stock-list-header-basic' });
			const headerContainer = headerInfo.createEl('div', { cls: 'stock-list-header' });
			const leftSection = headerContainer.createEl('div', { cls: 'stock-list-header-left' });

			if (this.config.title) {
				const titleSection = leftSection.createEl('div', { cls: 'stock-list-title-section' });
				titleSection.createEl('h4', { text: this.config.title, cls: 'stock-list-title' });

				if (this.config.description) {
					titleSection.createEl('p', {
						text: this.config.description,
						cls: 'stock-list-description'
					});
				}
			}
		}
	}

	private createSortableHeader(row: HTMLElement, text: string, sortKey: string): void {
		const th = row.createEl('th', { text, cls: 'stock-list-sortable-header' });
		const validSortKey = sortKey as 'symbol' | 'price' | 'changePercent' | 'todayChangePercent';
		this.addEventListenerTracked(th, 'click', () => this.toggleSort(validSortKey));
		th.title = `Click to sort by ${text.toLowerCase()}`;

		if (this.config.sortBy === sortKey) {
			th.createEl('span', {
				text: this.config.sortOrder === 'asc' ? ' ↑' : ' ↓',
				cls: 'stock-list-sort-indicator'
			});
		}
	}

	private toggleSort(column: 'symbol' | 'price' | 'changePercent' | 'todayChangePercent'): void {
		if (this.config.sortBy === column) {
			this.config.sortOrder = this.config.sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			this.config.sortBy = column;
			this.config.sortOrder = 'asc';
		}

		this.sortData();
		void this.render(this.createCurrentStockListData(), false);
	}

	private createCurrentStockListData(): StockListDataResult {
		const errors = this.errors.slice();

		for (const stock of this.data) {
			const message = this.refreshErrors.get(stock.symbol);
			if (message) {
				errors.push({ symbol: stock.symbol, message });
			}
		}

		return { stocks: this.data, errors };
	}

	private sortData(): void {
		const sortBy = this.config.sortBy;
		const sortOrder = this.config.sortOrder || 'asc';

		if (!sortBy) return;

		this.data.sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'symbol':
					comparison = a.symbol.localeCompare(b.symbol);
					break;
				case 'price':
					comparison = a.price - b.price;
					break;
				case 'changePercent':
					comparison = a.changePercent - b.changePercent;
					break;
				case 'todayChangePercent': {
					const aToday = a.todayChangePercent ?? 0;
					const bToday = b.todayChangePercent ?? 0;
					comparison = aToday - bToday;
					break;
				}
				default:
					return 0;
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});
	}

	private setupAutoRefresh(): void {
		if (this.config.refreshInterval && this.config.refreshInterval > 0) {
			this.clearAutoRefresh();
			this.autoRefreshInterval = window.setInterval(() => {
				void this.refreshData();
			}, this.config.refreshInterval * 60 * 1000);
		}
	}

	private clearAutoRefresh(): void {
		if (this.autoRefreshInterval) {
			window.clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
		}
	}

	private toggleAutoRefresh(): void {
		const btn = this.container.querySelector('.stock-list-auto-refresh-btn') as HTMLButtonElement;
		if (!btn) return;

		if (this.autoRefreshInterval) {
			this.clearAutoRefresh();
			btn.textContent = '⏱ Auto';
			btn.title = 'Enable auto-refresh';
			return;
		}

		this.setupAutoRefresh();
		btn.textContent = '⏸ Auto';
		btn.title = 'Disable auto-refresh';
	}

	private addEventListenerTracked(element: Element, event: string, handler: EventListener): void {
		element.addEventListener(event, handler);
		this.eventListeners.push({ element, event, handler });
	}

	onunload(): void {
		this.clearAutoRefresh();
		
		for (const { element, event, handler } of this.eventListeners) {
			element.removeEventListener(event, handler);
		}
		this.eventListeners = [];
		
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
	}
}
