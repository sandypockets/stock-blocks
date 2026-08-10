import { formatPrice } from './formatters';

function positionTooltip(tooltip: HTMLElement, x: number, y: number): void {
	const ownerWindow = tooltip.ownerDocument.defaultView ?? window.activeWindow;
	const rect = tooltip.getBoundingClientRect();
	const tooltipWidth = rect.width || 80;
	const tooltipHeight = rect.height || 30;

	let left = x + 15;
	let top = y - tooltipHeight - 15;

	if (left + tooltipWidth > ownerWindow.innerWidth - 10) {
		left = x - tooltipWidth - 15;
	}
	
	if (top < 10) {
		top = y + 15;
	}
	
	if (top + tooltipHeight > ownerWindow.innerHeight - 10) {
		top = ownerWindow.innerHeight - tooltipHeight - 10;
	}

	tooltip.setCssProps({
		left: `${left}px`,
		top: `${top}px`
	});
	tooltip.classList.remove('hidden');
	tooltip.classList.add('visible');
}

export function createTooltip(doc: Document = window.activeDocument): HTMLElement {
	return doc.body.createDiv({ cls: 'stock-chart-tooltip hidden' });
}

export function updateTooltip(
	tooltip: HTMLElement, 
	x: number, 
	y: number, 
	price: number, 
	timestamp: number, 
	currency: string,
	pricePrecision?: number
): void {
	const formattedPrice = formatPrice(price, currency, pricePrecision);
	const formattedDate = new Date(timestamp).toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	tooltip.textContent = '';
	tooltip.createDiv({
		cls: 'tooltip-price',
		text: formattedPrice
	});
	tooltip.createDiv({
		cls: 'tooltip-date',
		text: formattedDate
	});

	positionTooltip(tooltip, x, y);
}

export function updateCandlestickTooltip(
	tooltip: HTMLElement, 
	x: number, 
	y: number, 
	ohlc: { open: number; high: number; low: number; close: number },
	timestamp: number, 
	currency: string,
	pricePrecision?: number
): void {
	const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		weekday: 'short'
	});

	tooltip.textContent = '';
	tooltip.createDiv({
		cls: 'tooltip-date',
		text: formattedDate
	});

	const ohlcDiv = tooltip.createDiv({ cls: 'tooltip-ohlc' });
	ohlcDiv.createDiv({
		cls: 'ohlc-row',
		text: `O: ${formatPrice(ohlc.open, currency, pricePrecision)}`
	});
	ohlcDiv.createDiv({
		cls: 'ohlc-row',
		text: `H: ${formatPrice(ohlc.high, currency, pricePrecision)}`
	});
	ohlcDiv.createDiv({
		cls: 'ohlc-row',
		text: `L: ${formatPrice(ohlc.low, currency, pricePrecision)}`
	});
	ohlcDiv.createDiv({
		cls: 'ohlc-row',
		text: `C: ${formatPrice(ohlc.close, currency, pricePrecision)}`
	});

	positionTooltip(tooltip, x, y);
}

export function hideTooltip(tooltip: HTMLElement): void {
	tooltip.classList.remove('visible');
	tooltip.classList.add('hidden');
}
