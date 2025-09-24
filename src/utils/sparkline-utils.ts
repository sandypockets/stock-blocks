import { formatPrice as _formatPrice } from './formatters';
import { calculatePriceRange, calculateChartDimensions as _calculateChartDimensions } from './math-utils';

export function createSparkline(
	prices: number[],
	width: number,
	height: number,
	strokeColor: string = '#3b82f6'
): string {
	if (prices.length === 0) {
		return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
	}
	
	if (prices.length === 1) {
		const centerX = width / 2;
		const centerY = height / 2;
		return `
			<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-sparkline">
				<circle cx="${centerX}" cy="${centerY}" r="3" fill="${strokeColor}" />
				<text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="10" fill="#6b7280">Single day</text>
			</svg>
		`.trim();
	}

	const { min, max: _max, range } = calculatePriceRange(prices);

	const points = prices.map((price, index) => {
		const x = (index / (prices.length - 1)) * width;
		const y = height - ((price - min) / range) * height;
		return `${x},${y}`;
	}).join(' ');

	return `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-sparkline">
			<polyline
				fill="none"
				stroke="${strokeColor}"
				stroke-width="1.5"
				points="${points}"
			/>
		</svg>
	`.trim();
}

export function createInteractiveSparkline(
	prices: number[],
	width: number,
	height: number,
	strokeColor: string = '#3b82f6',
	currency: string = 'USD',
	timestamps?: number[]
): { svg: string; chartId: string } {
	const chartId = `candles-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	
	if (prices.length === 0) {
		return {
			svg: `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-chart-id="${chartId}"></svg>`,
			chartId
		};
	}
	
	if (prices.length === 1) {
		const centerX = width / 2;
		const centerY = height / 2;
		const price = prices[0];
		
		const chartData = JSON.stringify({
			points: [{
				x: centerX,
				y: centerY,
				price: price,
				index: 0,
				timestamp: timestamps ? timestamps[0] : null
			}],
			padding: 0,
			chartWidth: width,
			chartHeight: height,
			min: price,
			max: price,
			range: 0,
			currency,
			width,
			height,
			hasTimestamps: !!timestamps,
			isSinglePoint: true
		});
		
		return {
			svg: `
				<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-sparkline interactive-sparkline" data-chart-id="${chartId}" data-chart-data='${chartData}'>
					<circle cx="${centerX}" cy="${centerY}" r="3" fill="${strokeColor}" stroke="white" stroke-width="1" />
					<text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="10" fill="#6b7280">Single day</text>
					<rect x="0" y="0" width="${width}" height="${height}" fill="transparent" class="sparkline-overlay" style="cursor: crosshair" />
				</svg>
			`.trim(),
			chartId
		};
	}

	const { min, max, range } = calculatePriceRange(prices);

	const points = prices.map((price, index) => {
		const x = (index / (prices.length - 1)) * width;
		const y = height - ((price - min) / range) * height;
		return { 
			x, 
			y, 
			price, 
			index,
			timestamp: timestamps ? timestamps[index] : null
		};
	});

	const polylinePointsArray: string[] = [];
	const chartDataPoints = points.map(p => {
		polylinePointsArray.push(`${p.x},${p.y}`);
		return {
			x: p.x,
			y: p.y,
			price: p.price,
			index: p.index,
			timestamp: p.timestamp
		};
	});
	const polylinePoints = polylinePointsArray.join(' ');

	const chartData = JSON.stringify({
		points: chartDataPoints,
		padding: 0,
		chartWidth: width,
		chartHeight: height,
		min,
		max,
		range,
		currency,
		width,
		height,
		hasTimestamps: !!timestamps,
		isSinglePoint: false
	});

	const svg = `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-sparkline interactive-sparkline" data-chart-id="${chartId}" data-chart-data='${chartData}'>
			<polyline
				fill="none"
				stroke="${strokeColor}"
				stroke-width="1.5"
				points="${polylinePoints}"
				class="sparkline-line"
			/>
			
			<circle r="3" fill="${strokeColor}" stroke="white" stroke-width="1" 
					class="hover-dot" style="opacity: 0" />
			
			<rect x="0" y="0" width="${width}" height="${height}" 
				  fill="transparent" class="sparkline-overlay" style="cursor: crosshair" />
		</svg>
	`.trim();

	return { svg, chartId };
}