import { StockListBlockConfig, StockData } from '../types';
import { createInteractiveSparkline, formatPrice, formatPercentage, createTooltip, hideTooltip } from '../utils/chart-utils';
import { MarkdownRenderer, Component, App } from 'obsidian';

export class StockListComponent extends Component {
	private container: HTMLElement;
	private config: StockListBlockConfig;
	private data: StockData[] = [];
	private app: App;
	private autoRefreshInterval?: number;
	private lastUpdate: Date = new Date();
	private tooltip: HTMLElement | null = null;
	private sparklineChartIds: string[] = [];
	public refreshDataCallback?: () => Promise<void>;

	constructor(container: HTMLElement, config: StockListBlockConfig, app: App) {
		super();
		this.container = container;
		this.config = config;
		this.app = app;
		this.tooltip = createTooltip();
	}

	async render(stockDataArray: StockData[]): Promise<void> {
		this.data = stockDataArray;
		this.lastUpdate = new Date();
		this.sparklineChartIds = [];
		this.container.empty();
		this.container.addClass('stock-list-container');
		this.renderHeader();

		if (this.data.length === 0) {
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
		this.createSortableHeader(headerRow, 'Change', 'changePercent');
		headerRow.createEl('th', { text: 'Chart' });

		const tbody = table.createEl('tbody');
		
		for (const stock of this.data) {
			const row = tbody.createEl('tr', { cls: 'stock-list-row' });
			
			const symbolCell = row.createEl('td', { cls: 'stock-symbol-cell' });
			await this.renderSymbol(symbolCell, stock.symbol);
			
			const priceCell = row.createEl('td', { cls: 'stock-price-cell' });
			priceCell.setText(formatPrice(stock.price, stock.currency));
			
			const changeCell = row.createEl('td', { cls: 'stock-change-cell' });
			const _changeEl = changeCell.createEl('span', {
				text: formatPercentage(stock.changePercent),
				cls: stock.changePercent >= 0 ? 'stock-change-positive' : 'stock-change-negative'
			});
			
			const chartCell = row.createEl('td', { cls: 'stock-chart-cell' });
			this.renderSparkline(chartCell, stock);
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
				text: `Last updated: ${this.lastUpdate.toLocaleTimeString()}`,
				cls: 'stock-list-info'
			});
			
			const refreshBtn = rightSection.createEl('button', {
				text: '↻ Refresh',
				cls: 'stock-list-refresh-btn stock-list-refresh-btn-bottom'
			});
			refreshBtn.onclick = () => this.refreshData();

			if (this.config.refreshInterval && this.config.refreshInterval > 0) {
				const autoRefreshBtn = rightSection.createEl('button', {
					text: '⏱ Auto',
					cls: 'stock-list-auto-refresh-btn stock-list-auto-refresh-btn-bottom'
				});
				autoRefreshBtn.onclick = () => this.toggleAutoRefresh();
			}
		}
		this.setupAutoRefresh();
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
					href: `https://finance.yahoo.com/quote/${symbol}`
				});
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
				break;
			default:
				container.setText(symbol);
				break;
		}
	}

	private renderSparkline(container: HTMLElement, stock: StockData): void {
		const color = stock.changePercent >= 0 ? '#10b981' : '#ef4444';
		const sparklineWidth = Math.min(this.config.width, 200); // Cap at 200px for table cells
		const sparklineHeight = Math.min(this.config.height, 40); // Cap at 40px for table cells
		
		const { svg, chartId } = createInteractiveSparkline(
			stock.historicalPrices,
			sparklineWidth,
			sparklineHeight,
			color,
			stock.currency,
			stock.timestamps
		);
		
		this.sparklineChartIds.push(chartId);
		container.innerHTML = svg;
		this.setupSparklineInteractions(container, chartId);
	}

	private setupSparklineInteractions(container: HTMLElement, chartId: string): void {
		const svg = container.querySelector(`[data-chart-id="${chartId}"]`) as SVGElement;
		const overlay = svg?.querySelector('.sparkline-overlay') as SVGRectElement;
		const hoverDot = svg?.querySelector('.hover-dot') as SVGCircleElement;

		if (!svg || !overlay || !hoverDot || !this.tooltip) return;

		const chartDataAttr = svg.getAttribute('data-chart-data');
		if (!chartDataAttr) return;

		let chartData: any;
		try {
			chartData = JSON.parse(chartDataAttr);
		} catch (e) {
			// Failed to parse sparkline data - fail silently
			return;
		}

		overlay.addEventListener('mouseenter', () => {
			hoverDot.style.opacity = '1';
		});

		overlay.addEventListener('mouseleave', () => {
			hoverDot.style.opacity = '0';
			if (this.tooltip) {
				hideTooltip(this.tooltip);
			}
		});

		overlay.addEventListener('mousemove', (event) => {
			const rect = svg.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;

			// For sparklines, find the closest data point rather than interpolating
			const closestPoint = this.findClosestSparklinePoint(mouseX, chartData);
			if (closestPoint && this.tooltip) {
				hoverDot.setAttribute('cx', closestPoint.x.toString());
				hoverDot.setAttribute('cy', closestPoint.y.toString());

				// Update tooltip with price and date if timestamp is available
				const clientX = event.clientX;
				const clientY = event.clientY;
				this.updateSparklineTooltip(
					this.tooltip,
					clientX,
					clientY,
					closestPoint.price,
					chartData.currency,
					closestPoint.timestamp
				);
			}
		});
	}

	private findClosestSparklinePoint(mouseX: number, chartData: any): { x: number; y: number; price: number; timestamp?: number } | null {
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

		let tooltipContent = `<div class="tooltip-price">${formattedPrice}</div>`;
		
		// Add date if timestamp is available
		if (timestamp) {
			const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
			tooltipContent += `<div class="tooltip-date">${formattedDate}</div>`;
		}

		tooltip.innerHTML = tooltipContent;

		const rect = tooltip.getBoundingClientRect();
		const tooltipWidth = rect.width || 80;
		const tooltipHeight = rect.height || 30;

		let left = x + 10;
		let top = y - tooltipHeight - 10;

		// Adjust if tooltip would go off screen
		if (left + tooltipWidth > window.innerWidth) {
			left = x - tooltipWidth - 10;
		}
		if (top < 0) {
			top = y + 10;
		}

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
		tooltip.style.opacity = '1';
	}

	updateConfig(config: StockListBlockConfig): void {
		this.config = config;
	}

	updateData(stockDataArray: StockData[]): void {
		this.render(stockDataArray);
	}

	private async refreshData(): Promise<void> {
		if (this.refreshDataCallback) {
			try {
				// Show loading state on refresh button
				const refreshBtn = this.container.querySelector('.stock-list-refresh-btn') as HTMLButtonElement;
				if (refreshBtn) {
					refreshBtn.disabled = true;
					refreshBtn.textContent = '⟳ Loading...';
				}
				
				await this.refreshDataCallback();
				
				if (refreshBtn) {
					refreshBtn.disabled = false;
					refreshBtn.textContent = '↻ Refresh';
				}
			} catch (error) {
				// Error refreshing data
				const refreshBtn = this.container.querySelector('.stock-list-refresh-btn') as HTMLButtonElement;
				if (refreshBtn) {
					refreshBtn.disabled = false;
					refreshBtn.textContent = '↻ Refresh';
				}
			}
		}
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
		th.onclick = () => this.toggleSort(sortKey as any);
		th.style.cursor = 'pointer';
		th.title = `Click to sort by ${text.toLowerCase()}`;
		
		if (this.config.sortBy === sortKey) {
			th.createEl('span', {
				text: this.config.sortOrder === 'asc' ? ' ↑' : ' ↓',
				cls: 'stock-list-sort-indicator'
			});
		}
	}

	private toggleSort(column: 'symbol' | 'price' | 'changePercent'): void {
		if (this.config.sortBy === column) {
			this.config.sortOrder = this.config.sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			// New sort column
			this.config.sortBy = column;
			this.config.sortOrder = 'asc';
		}
		
		this.sortData();
		this.render(this.data);
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
				if (this.refreshDataCallback) {
					this.refreshDataCallback();
				}
			}, this.config.refreshInterval * 60 * 1000);
		}
	}

	private clearAutoRefresh(): void {
		if (this.autoRefreshInterval) {
			clearInterval(this.autoRefreshInterval);
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
		} else {
			this.setupAutoRefresh();
			btn.textContent = '⏸ Auto';
			btn.title = 'Disable auto-refresh';
		}
	}

	onunload(): void {
		this.clearAutoRefresh();
		if (this.tooltip && this.tooltip.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
	}
}
