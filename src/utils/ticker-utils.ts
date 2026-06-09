export function normalizeTicker(ticker: string): string {
	return ticker.trim().toUpperCase();
}

export function normalizeUniqueTickers(tickers: string[]): string[] {
	const normalizedTickers: string[] = [];
	const seenTickers = new Set<string>();

	for (const ticker of tickers) {
		const normalizedTicker = normalizeTicker(ticker);
		if (normalizedTicker.length === 0 || seenTickers.has(normalizedTicker)) {
			continue;
		}

		seenTickers.add(normalizedTicker);
		normalizedTickers.push(normalizedTicker);
	}

	return normalizedTickers;
}
