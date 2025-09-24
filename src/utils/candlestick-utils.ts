import { OHLCData } from '../types';
import { CANDLESTICK_CONFIG } from './chart-constants';
import { formatPrice } from './formatters';
import { calculateOHLCRange, calculateChartDimensions } from './math-utils';

function calculateCandlestickDimensions(dataLength: number, chartWidth: number): {
	candleWidth: number;
	candleSpacing: number;
	gapWidth: number;
	useGapBasedLayout: boolean;
} {
	const { THRESHOLDS, MAX_WIDTHS, GAP_PERCENTAGES, MIN_WIDTH } = CANDLESTICK_CONFIG;
	
	if (dataLength <= THRESHOLDS.VERY_FEW) {
		const gapWidth = Math.min(20, chartWidth * GAP_PERCENTAGES.VERY_FEW);
		const totalGapWidth = (dataLength - 1) * gapWidth;
		const availableWidthForCandles = chartWidth - totalGapWidth;
		const candleWidth = Math.min(MAX_WIDTHS.VERY_FEW, availableWidthForCandles / dataLength);
		return {
			candleWidth,
			candleSpacing: candleWidth + gapWidth,
			gapWidth,
			useGapBasedLayout: true
		};
	}
	
	if (dataLength <= THRESHOLDS.FEW) {
		const gapWidth = Math.min(15, chartWidth * GAP_PERCENTAGES.FEW);
		const totalGapWidth = (dataLength - 1) * gapWidth;
		const availableWidthForCandles = chartWidth - totalGapWidth;
		const candleWidth = Math.min(MAX_WIDTHS.FEW, availableWidthForCandles / dataLength);
		return {
			candleWidth,
			candleSpacing: candleWidth + gapWidth,
			gapWidth,
			useGapBasedLayout: true
		};
	}
	
	if (dataLength <= THRESHOLDS.MODERATE) {
		const spacePerCandle = chartWidth / dataLength;
		const candleWidth = Math.min(MAX_WIDTHS.MODERATE, spacePerCandle * GAP_PERCENTAGES.MODERATE);
		return {
			candleWidth,
			candleSpacing: spacePerCandle,
			gapWidth: 0,
			useGapBasedLayout: false
		};
	}
	
	if (dataLength <= THRESHOLDS.MANY) {
		const spacePerCandle = chartWidth / dataLength;
		const candleWidth = Math.min(MAX_WIDTHS.MANY, spacePerCandle * GAP_PERCENTAGES.MANY);
		return {
			candleWidth,
			candleSpacing: spacePerCandle,
			gapWidth: 0,
			useGapBasedLayout: false
		};
	}
	
	const candleSpacing = chartWidth / Math.max(1, dataLength - 1);
	const candleWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTHS.VERY_MANY, chartWidth / (dataLength * GAP_PERCENTAGES.VERY_MANY)));
	return {
		candleWidth,
		candleSpacing,
		gapWidth: 0,
		useGapBasedLayout: false
	};
}

function calculateCandleXPosition(
	index: number,
	dataLength: number,
	padding: number,
	chartWidth: number,
	dimensions: {
		candleWidth: number;
		candleSpacing: number;
		gapWidth: number;
		useGapBasedLayout: boolean;
	}
): number {
	const { candleWidth, candleSpacing, gapWidth, useGapBasedLayout } = dimensions;
	
	if (useGapBasedLayout) {
		const totalWidth = dataLength * candleWidth + (dataLength - 1) * gapWidth;
		const startX = padding + (chartWidth - totalWidth) / 2;
		return startX + (index * (candleWidth + gapWidth)) + (candleWidth / 2);
	}
	
	if (dataLength <= CANDLESTICK_CONFIG.THRESHOLDS.MANY) {
		return padding + (index * candleSpacing) + (candleSpacing / 2);
	}
	
	return padding + (index * candleSpacing);
}

export function createCandlestickChart(
	ohlcData: OHLCData[],
	timestamps: number[],
	width: number,
	height: number,
	showAxes: boolean = false,
	currency: string = 'USD'
): { svg: string; chartId: string } {
	const chartId = `candles-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	
	if (ohlcData.length === 0) {
		return {
			svg: `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-chart-id="${chartId}"></svg>`,
			chartId
		};
	}
	
	if (ohlcData.length === 1) {
		const padding = showAxes ? 40 : 10;
		const centerX = width / 2;
		const centerY = height / 2;
		const ohlc = ohlcData[0];
		
		const chartData = JSON.stringify({
			candles: [{
				x: centerX,
				open: ohlc.open,
				high: ohlc.high,
				low: ohlc.low,
				close: ohlc.close,
				timestamp: timestamps[0],
				index: 0
			}],
			padding,
			chartWidth: width - (padding * 2),
			chartHeight: height - (padding * 2),
			min: Math.min(ohlc.low, ohlc.high, ohlc.open, ohlc.close),
			max: Math.max(ohlc.low, ohlc.high, ohlc.open, ohlc.close),
			range: Math.max(ohlc.high - ohlc.low, 1),
			currency,
			width,
			height,
			isSinglePoint: true
		});
		
		return {
			svg: `
				<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart interactive-chart candlestick-chart" data-chart-id="${chartId}" data-chart-data='${chartData}'>
					<rect x="${centerX - 5}" y="${centerY - 5}" width="10" height="10" 
						  fill="${ohlc.close >= ohlc.open ? '#10b981' : '#ef4444'}" 
						  stroke="white" stroke-width="1" />
					<text x="${centerX}" y="${centerY - 15}" text-anchor="middle" font-size="12" fill="#374151">${formatPrice(ohlc.close, currency)}</text>
					<text x="${centerX}" y="${centerY + 25}" text-anchor="middle" font-size="10" fill="#6b7280">Single trading day</text>
					<rect x="0" y="0" width="${width}" height="${height}" fill="transparent" class="chart-overlay" style="cursor: crosshair" />
				</svg>
			`.trim(),
			chartId
		};
	}

	const padding = showAxes ? 40 : 10;
	const chartDimensions = calculateChartDimensions(width, height, padding);
	const { chartWidth, chartHeight, rightBound, bottomBound, midX, midY } = chartDimensions;

	const { min, max, range } = calculateOHLCRange(ohlcData);

	const dimensions = calculateCandlestickDimensions(ohlcData.length, chartWidth);
	const { candleWidth, candleSpacing: _candleSpacing, gapWidth: _gapWidth, useGapBasedLayout: _useGapBasedLayout } = dimensions;

	const candles = ohlcData.map((ohlc, index) => {
		const x = calculateCandleXPosition(index, ohlcData.length, padding, chartWidth, dimensions);
		
		const openY = padding + chartHeight - ((ohlc.open - min) / range) * chartHeight;
		const highY = padding + chartHeight - ((ohlc.high - min) / range) * chartHeight;
		const lowY = padding + chartHeight - ((ohlc.low - min) / range) * chartHeight;
		const closeY = padding + chartHeight - ((ohlc.close - min) / range) * chartHeight;
		
		return {
			x,
			openY,
			highY,
			lowY,
			closeY,
			open: ohlc.open,
			high: ohlc.high,
			low: ohlc.low,
			close: ohlc.close,
			timestamp: timestamps[index],
			index,
			isGreen: ohlc.close >= ohlc.open
		};
	});

	// Generate candlestick SVG elements
	const candlestickElements = candles.map(candle => {
		const color = candle.isGreen ? '#10b981' : '#ef4444';
		const bodyTop = Math.min(candle.openY, candle.closeY);
		const bodyHeight = Math.abs(candle.closeY - candle.openY);
		const bodyX = candle.x - candleWidth / 2;

		return `
			<line x1="${candle.x}" y1="${candle.highY}" x2="${candle.x}" y2="${candle.lowY}" 
				  stroke="${color}" stroke-width="1" class="candle-wick" />
			
			<rect x="${bodyX}" y="${bodyTop}" width="${candleWidth}" height="${Math.max(1, bodyHeight)}" 
				  fill="${color}" 
				  stroke="${color}" stroke-width="1" 
				  class="candle-body" data-candle-index="${candle.index}" />
		`;
	}).join('');

	let axesContent = '';
	if (showAxes) {
		const midPrice = (min + max) / 2;
		const startDate = new Date(timestamps[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const midDate = new Date(timestamps[Math.floor(timestamps.length / 2)]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

		axesContent = `
			<text x="5" y="${padding + 5}" font-size="10" fill="#6b7280" text-anchor="start">${formatPrice(max, currency)}</text>
			<text x="5" y="${midY + 3}" font-size="10" fill="#6b7280" text-anchor="start">${formatPrice(midPrice, currency)}</text>
			<text x="5" y="${bottomBound}" font-size="10" fill="#6b7280" text-anchor="start">${formatPrice(min, currency)}</text>
			
			<text x="${padding}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="start">${startDate}</text>
			<text x="${midX}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${midDate}</text>
			<text x="${rightBound}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="end">${endDate}</text>
			
			<line x1="${padding}" y1="${padding}" x2="${rightBound}" y2="${padding}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${midY}" x2="${rightBound}" y2="${midY}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${bottomBound}" x2="${rightBound}" y2="${bottomBound}" stroke="#e5e7eb" stroke-width="0.5"/>
		`;
	}

	const chartData = JSON.stringify({
		candles: candles,
		padding,
		chartWidth,
		chartHeight,
		min,
		max,
		range,
		currency,
		width,
		height,
		candleWidth
	});

	const svg = `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart interactive-chart candlestick-chart" data-chart-id="${chartId}" data-chart-data='${chartData}'>
			${axesContent}
			
			${candlestickElements}
			
			<line x1="0" y1="${padding}" x2="0" y2="${padding + chartHeight}" 
				  stroke="#666" stroke-width="1" stroke-dasharray="2,2" 
				  class="hover-line" style="opacity: 0" />
			
			<circle r="4" fill="#666" stroke="white" stroke-width="2" 
					class="hover-dot" style="opacity: 0" />
			
			<rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" 
				  fill="transparent" class="chart-overlay" style="cursor: crosshair" />
		</svg>
	`.trim();

	return { svg, chartId };
}

export function interpolateCandlestickPrice(mouseX: number, chartData: any): { open: number; high: number; low: number; close: number; timestamp: number; x: number } | null {
	const { candles, padding, chartWidth } = chartData;
	
	const rightBound = padding + chartWidth;
	// Ensure mouseX is within chart bounds
	if (mouseX < padding || mouseX > rightBound) {
		return null;
	}

	let closestCandle = candles[0];
	let minDistance = Math.abs(candles[0].x - mouseX);

	for (const candle of candles) {
		const distance = Math.abs(candle.x - mouseX);
		if (distance < minDistance) {
			minDistance = distance;
			closestCandle = candle;
		}
	}

	return {
		open: closestCandle.open,
		high: closestCandle.high,
		low: closestCandle.low,
		close: closestCandle.close,
		timestamp: closestCandle.timestamp,
		x: closestCandle.x
	};
}