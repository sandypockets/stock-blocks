export interface PriceRange {
	min: number;
	max: number;
	range: number;
}

export interface ChartDimensions {
	padding: number;
	chartWidth: number;
	chartHeight: number;
	rightBound: number;
	bottomBound: number;
	centerX: number;
	centerY: number;
	midX: number;
	midY: number;
}

export function calculatePriceRange(prices: number[]): PriceRange {
	if (prices.length === 0) {
		return { min: 0, max: 0, range: 1 };
	}
	
	if (prices.length === 1) {
		return { min: prices[0], max: prices[0], range: 1 };
	}
	
	let min = prices[0];
	let max = prices[0];
	
	for (let i = 1; i < prices.length; i++) {
		const price = prices[i];
		if (price < min) min = price;
		if (price > max) max = price;
	}
	
	const range = max - min || 1;
	return { min, max, range };
}

export function calculateChartDimensions(
	width: number,
	height: number,
	padding: number
): ChartDimensions {
	const chartWidth = width - (padding * 2);
	const chartHeight = height - (padding * 2);
	
	return {
		padding,
		chartWidth,
		chartHeight,
		rightBound: padding + chartWidth,
		bottomBound: padding + chartHeight,
		centerX: width / 2,
		centerY: height / 2,
		midX: padding + chartWidth / 2,
		midY: padding + chartHeight / 2
	};
}

export function calculateOHLCRange(ohlcData: { open: number; high: number; low: number; close: number }[]): PriceRange {
	if (ohlcData.length === 0) {
		return { min: 0, max: 0, range: 1 };
	}
	
	const firstCandle = ohlcData[0];
	let min = Math.min(firstCandle.open, firstCandle.high, firstCandle.low, firstCandle.close);
	let max = Math.max(firstCandle.open, firstCandle.high, firstCandle.low, firstCandle.close);
	
	for (let i = 1; i < ohlcData.length; i++) {
		const candle = ohlcData[i];
		const candleMin = Math.min(candle.open, candle.high, candle.low, candle.close);
		const candleMax = Math.max(candle.open, candle.high, candle.low, candle.close);
		
		if (candleMin < min) min = candleMin;
		if (candleMax > max) max = candleMax;
	}
	
	const range = max - min || 1;
	return { min, max, range };
}