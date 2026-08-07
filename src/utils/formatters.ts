export function formatPrice(price: number, currency: string = 'USD', precision: number = 2): string {
	const fractionDigits = Number.isFinite(precision)
		? Math.max(0, Math.min(20, Math.trunc(precision)))
		: 2;

	return price.toLocaleString('en-US', {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	});
}

export function formatPercentage(percent: number): string {
	const sign = percent >= 0 ? '+' : '';
	return `${sign}${percent.toFixed(2)}%`;
}

interface CompactScale {
	divisor: number;
	suffix: string;
}

function getCompactScale(value: number): CompactScale {
	const absoluteValue = Math.abs(value);

	if (absoluteValue >= 1_000_000_000_000) {
		return { divisor: 1_000_000_000_000, suffix: 'T' };
	}
	if (absoluteValue >= 1_000_000_000) {
		return { divisor: 1_000_000_000, suffix: 'B' };
	}
	if (absoluteValue >= 1_000_000) {
		return { divisor: 1_000_000, suffix: 'M' };
	}
	if (absoluteValue >= 1_000) {
		return { divisor: 1_000, suffix: 'K' };
	}

	return { divisor: 1, suffix: '' };
}

export function formatCompactNumber(value: number): string {
	const { divisor, suffix } = getCompactScale(value);
	const scaledValue = value / divisor;
	const formattedValue = scaledValue.toLocaleString('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: suffix ? 2 : 0
	});

	return `${formattedValue}${suffix}`;
}

export function formatCompactCurrency(value: number, currency: string): string {
	const { divisor, suffix } = getCompactScale(value);
	const formattedValue = (value / divisor).toLocaleString('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: suffix ? 2 : 0
	});

	return `${formattedValue}${suffix}`;
}
