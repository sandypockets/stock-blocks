import { ChartData, ChartRenderResult } from '../types';
import { calculatePriceRange } from './math-utils';
import { appendSvgElement, createSvgElement } from './svg-utils';

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

	const { min, range } = calculatePriceRange(prices);

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
	doc: Document,
	prices: number[],
	width: number,
	height: number,
	strokeColor: string = '#3b82f6',
	currency: string = 'USD',
	timestamps?: number[]
): ChartRenderResult {
	const chartId = `candles-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	const svg = createSvgElement(doc, 'svg', {
		width,
		height,
		viewBox: `0 0 ${width} ${height}`,
		'data-chart-id': chartId
	});

	if (prices.length === 0) {
		const chartData: ChartData = {
			padding: 0,
			chartWidth: width,
			chartHeight: height,
			min: 0,
			max: 0,
			range: 0,
			currency,
			width,
			height
		};
		return {
			svg,
			chartId,
			chartData
		};
	}

	if (prices.length === 1) {
		const centerX = width / 2;
		const centerY = height / 2;
		const price = prices[0];

		const chartData: ChartData = {
			points: [{
				x: centerX,
				y: centerY,
				price: price,
				index: 0,
				timestamp: timestamps?.[0]
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
		};

		svg.classList.add('stock-sparkline', 'interactive-sparkline');
		appendSvgElement(svg, 'circle', {
			cx: centerX,
			cy: centerY,
			r: 3,
			fill: strokeColor,
			stroke: 'white',
			'stroke-width': 1
		});
		appendSvgElement(svg, 'text', {
			x: centerX,
			y: centerY - 10,
			'text-anchor': 'middle',
			'font-size': 10,
			fill: '#6b7280'
		}, 'Single day');
		appendSvgElement(svg, 'rect', {
			x: 0,
			y: 0,
			width,
			height,
			fill: 'transparent',
			class: 'sparkline-overlay'
		});

		return {
			svg,
			chartId,
			chartData
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
				timestamp: timestamps?.[index]
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

	const chartData: ChartData = {
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
	};

	svg.classList.add('stock-sparkline', 'interactive-sparkline');
	appendSvgElement(svg, 'polyline', {
		fill: 'none',
		stroke: strokeColor,
		'stroke-width': 1.5,
		points: polylinePoints,
		class: 'sparkline-line'
	});
	appendSvgElement(svg, 'circle', {
		r: 3,
		fill: strokeColor,
		stroke: 'white',
		'stroke-width': 1,
		class: 'hover-dot'
	});
	appendSvgElement(svg, 'rect', {
		x: 0,
		y: 0,
		width,
		height,
		fill: 'transparent',
		class: 'sparkline-overlay'
	});

	return { svg, chartId, chartData };
}
