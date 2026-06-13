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
