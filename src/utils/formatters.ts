export function formatPrice(price: number, currency: string = 'USD'): string {
	return price.toLocaleString('en-US', {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

export function formatPercentage(percent: number): string {
	const sign = percent >= 0 ? '+' : '';
	return `${sign}${percent.toFixed(2)}%`;
}