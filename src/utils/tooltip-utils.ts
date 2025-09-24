import { formatPrice } from './formatters';

function positionTooltip(tooltip: HTMLElement, x: number, y: number): void {
	const rect = tooltip.getBoundingClientRect();
	const tooltipWidth = rect.width || 80;
	const tooltipHeight = rect.height || 30;

	let left = x + 15;
	let top = y - tooltipHeight - 15;

	if (left + tooltipWidth > window.innerWidth - 10) {
		left = x - tooltipWidth - 15;
	}
	
	if (top < 10) {
		top = y + 15;
	}
	
	if (top + tooltipHeight > window.innerHeight - 10) {
		top = window.innerHeight - tooltipHeight - 10;
	}

	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
	tooltip.classList.remove('hidden');
	tooltip.classList.add('visible');
}

export function createTooltip(): HTMLElement {
	const tooltip = document.createElement('div');
	tooltip.className = 'stock-chart-tooltip hidden';
	
	document.body.appendChild(tooltip);
	return tooltip;
}

export function updateTooltip(
	tooltip: HTMLElement, 
	x: number, 
	y: number, 
	price: number, 
	timestamp: number, 
	currency: string
): void {
	const formattedPrice = formatPrice(price, currency);
	const formattedDate = new Date(timestamp).toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	tooltip.textContent = '';
	
	const priceDiv = document.createElement('div');
	priceDiv.className = 'tooltip-price';
	priceDiv.textContent = formattedPrice;
	tooltip.appendChild(priceDiv);
	
	const dateDiv = document.createElement('div');
	dateDiv.className = 'tooltip-date';
	dateDiv.textContent = formattedDate;
	tooltip.appendChild(dateDiv);

	positionTooltip(tooltip, x, y);
}

export function updateCandlestickTooltip(
	tooltip: HTMLElement, 
	x: number, 
	y: number, 
	ohlc: { open: number; high: number; low: number; close: number },
	timestamp: number, 
	currency: string
): void {
	const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		weekday: 'short'
	});

	tooltip.textContent = '';
	
	const dateDiv = document.createElement('div');
	dateDiv.className = 'tooltip-date';
	dateDiv.textContent = formattedDate;
	tooltip.appendChild(dateDiv);
	
	const ohlcDiv = document.createElement('div');
	ohlcDiv.className = 'tooltip-ohlc';
	
	const openRow = document.createElement('div');
	openRow.className = 'ohlc-row';
	openRow.textContent = `O: ${formatPrice(ohlc.open, currency)}`;
	ohlcDiv.appendChild(openRow);
	
	const highRow = document.createElement('div');
	highRow.className = 'ohlc-row';
	highRow.textContent = `H: ${formatPrice(ohlc.high, currency)}`;
	ohlcDiv.appendChild(highRow);
	
	const lowRow = document.createElement('div');
	lowRow.className = 'ohlc-row';
	lowRow.textContent = `L: ${formatPrice(ohlc.low, currency)}`;
	ohlcDiv.appendChild(lowRow);
	
	const closeRow = document.createElement('div');
	closeRow.className = 'ohlc-row';
	closeRow.textContent = `C: ${formatPrice(ohlc.close, currency)}`;
	ohlcDiv.appendChild(closeRow);
	
	tooltip.appendChild(ohlcDiv);

	positionTooltip(tooltip, x, y);
}

export function hideTooltip(tooltip: HTMLElement): void {
	tooltip.classList.remove('visible');
	tooltip.classList.add('hidden');
}