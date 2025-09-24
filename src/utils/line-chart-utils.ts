import { formatPrice } from './formatters';
import { calculatePriceRange, calculateChartDimensions } from './math-utils';

export function createChart(
	prices: number[],
	timestamps: number[],
	width: number,
	height: number,
	showAxes: boolean = false
): string {
	if (prices.length === 0) {
		return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`;
	}
	
	if (prices.length === 1) {
		const centerX = width / 2;
		const centerY = height / 2;
		const price = prices[0];
		
		return `
			<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart">
				<circle cx="${centerX}" cy="${centerY}" r="5" fill="#3b82f6" stroke="white" stroke-width="2" />
				<text x="${centerX}" y="${centerY - 15}" text-anchor="middle" font-size="12" fill="#374151">$${price.toFixed(2)}</text>
				<text x="${centerX}" y="${centerY + 25}" text-anchor="middle" font-size="10" fill="#6b7280">Single trading day</text>
			</svg>
		`.trim();
	}

	const padding = showAxes ? 40 : 10;
	const dimensions = calculateChartDimensions(width, height, padding);
	const { chartWidth, chartHeight, rightBound, bottomBound, midX, midY } = dimensions;
	const { min, max, range } = calculatePriceRange(prices);

	const pathData = prices.map((price, index) => {
		const x = padding + (index / (prices.length - 1)) * chartWidth;
		const y = padding + chartHeight - ((price - min) / range) * chartHeight;
		return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
	}).join(' ');

	const areaData = `${pathData} L ${rightBound} ${bottomBound} L ${padding} ${bottomBound} Z`;

	const isPositive = prices[prices.length - 1] >= prices[0];
	const strokeColor = isPositive ? '#10b981' : '#ef4444';
	const gradientColor = isPositive ? '#10b981' : '#ef4444';

	let axesContent = '';
	if (showAxes) {
		const midPrice = (min + max) / 2;
		const startDate = new Date(timestamps[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const midDate = new Date(timestamps[Math.floor(timestamps.length / 2)]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

		axesContent = `
			<!-- Y-axis labels -->
			<text x="5" y="${padding + 5}" font-size="10" fill="#6b7280" text-anchor="start">$${max.toFixed(2)}</text>
			<text x="5" y="${midY + 3}" font-size="10" fill="#6b7280" text-anchor="start">$${midPrice.toFixed(2)}</text>
			<text x="5" y="${bottomBound}" font-size="10" fill="#6b7280" text-anchor="start">$${min.toFixed(2)}</text>
			
			<!-- X-axis labels -->
			<text x="${padding}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="start">${startDate}</text>
			<text x="${midX}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${midDate}</text>
			<text x="${rightBound}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="end">${endDate}</text>
			
			<!-- Grid lines -->
			<line x1="${padding}" y1="${padding}" x2="${rightBound}" y2="${padding}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${midY}" x2="${rightBound}" y2="${midY}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${bottomBound}" x2="${rightBound}" y2="${bottomBound}" stroke="#e5e7eb" stroke-width="0.5"/>
		`;
	}

	return `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart">
			<defs>
				<linearGradient id="gradient-${Date.now()}" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" style="stop-color:${gradientColor};stop-opacity:0.3" />
					<stop offset="100%" style="stop-color:${gradientColor};stop-opacity:0.05" />
				</linearGradient>
			</defs>
			
			${axesContent}
			
			<!-- Area fill -->
			<path d="${areaData}" fill="url(#gradient-${Date.now()})" />
			
			<!-- Line -->
			<path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="2" />
		</svg>
	`.trim();
}

export function createInteractiveChart(
	prices: number[],
	timestamps: number[],
	width: number,
	height: number,
	showAxes: boolean = false,
	currency: string = 'USD'
): { svg: string; chartId: string } {
	const chartId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	
	if (prices.length === 0) {
		return {
			svg: `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-chart-id="${chartId}"></svg>`,
			chartId
		};
	}
	
	if (prices.length === 1) {
		const padding = showAxes ? 40 : 10;
		const centerX = width / 2;
		const centerY = height / 2;
		const price = prices[0];
		
		const chartData = JSON.stringify({
			points: [{
				x: centerX,
				y: centerY,
				price: price,
				timestamp: timestamps[0],
				index: 0
			}],
			padding,
			chartWidth: width - (padding * 2),
			chartHeight: height - (padding * 2),
			min: price,
			max: price,
			range: 0,
			currency,
			width,
			height,
			isSinglePoint: true
		});
		
		return {
			svg: `
				<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart interactive-chart" data-chart-id="${chartId}" data-chart-data='${chartData}'>
					<circle cx="${centerX}" cy="${centerY}" r="5" fill="#3b82f6" stroke="white" stroke-width="2" />
					<text x="${centerX}" y="${centerY - 15}" text-anchor="middle" font-size="12" fill="#374151">${formatPrice(price, currency)}</text>
					<text x="${centerX}" y="${centerY + 25}" text-anchor="middle" font-size="10" fill="#6b7280">Single trading day</text>
					<rect x="0" y="0" width="${width}" height="${height}" fill="transparent" class="chart-overlay" style="cursor: crosshair" />
				</svg>
			`.trim(),
			chartId
		};
	}

	const padding = showAxes ? 40 : 10;
	const dimensions = calculateChartDimensions(width, height, padding);
	const { chartWidth, chartHeight, rightBound, bottomBound, midX, midY } = dimensions;
	const { min, max, range } = calculatePriceRange(prices);
	const points: { x: number; y: number; price: number; timestamp: number; index: number }[] = [];
	const pathSegments: string[] = [];
	
	prices.forEach((price, index) => {
		const x = padding + (index / (prices.length - 1)) * chartWidth;
		const y = padding + chartHeight - ((price - min) / range) * chartHeight;
		const point = { x, y, price, timestamp: timestamps[index], index };
		
		points.push(point);
		pathSegments.push(index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
	});
	
	const pathData = pathSegments.join(' ');

	const areaData = `${pathData} L ${rightBound} ${bottomBound} L ${padding} ${bottomBound} Z`;

	const isPositive = prices[prices.length - 1] >= prices[0];
	const strokeColor = isPositive ? '#10b981' : '#ef4444';
	const gradientColor = isPositive ? '#10b981' : '#ef4444';

	let axesContent = '';
	if (showAxes) {
		const midPrice = (min + max) / 2;
		const startDate = new Date(timestamps[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const midDate = new Date(timestamps[Math.floor(timestamps.length / 2)]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

		axesContent = `
			<!-- Y-axis labels -->
			<text x="5" y="${padding + 5}" font-size="10" fill="#6b7280" text-anchor="start">$${max.toFixed(2)}</text>
			<text x="5" y="${midY + 3}" font-size="10" fill="#6b7280" text-anchor="start">$${midPrice.toFixed(2)}</text>
			<text x="5" y="${bottomBound}" font-size="10" fill="#6b7280" text-anchor="start">$${min.toFixed(2)}</text>
			
			<!-- X-axis labels -->
			<text x="${padding}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="start">${startDate}</text>
			<text x="${midX}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${midDate}</text>
			<text x="${rightBound}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="end">${endDate}</text>
			
			<!-- Grid lines -->
			<line x1="${padding}" y1="${padding}" x2="${rightBound}" y2="${padding}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${midY}" x2="${rightBound}" y2="${midY}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${bottomBound}" x2="${rightBound}" y2="${bottomBound}" stroke="#e5e7eb" stroke-width="0.5"/>
		`;
	}

	const chartData = JSON.stringify({
		points: points,
		padding,
		chartWidth,
		chartHeight,
		min,
		max,
		range,
		currency,
		width,
		height
	});

	const svg = `
		<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-chart interactive-chart" data-chart-id="${chartId}" data-chart-data='${chartData}'>
			<defs>
				<linearGradient id="gradient-${chartId}" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" style="stop-color:${gradientColor};stop-opacity:0.3" />
					<stop offset="100%" style="stop-color:${gradientColor};stop-opacity:0.05" />
				</linearGradient>
			</defs>
			
			${axesContent}
			
			<!-- Area fill -->
			<path d="${areaData}" fill="url(#gradient-${chartId})" />
			
			<!-- Line -->
			<path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="2" class="chart-line" />
			
			<!-- Hover line (initially hidden) -->
			<line x1="0" y1="${padding}" x2="0" y2="${padding + chartHeight}" 
				  stroke="#666" stroke-width="1" stroke-dasharray="2,2" 
				  class="hover-line" style="opacity: 0" />
			
			<!-- Hover dot (initially hidden) -->
			<circle r="4" fill="${strokeColor}" stroke="white" stroke-width="2" 
					class="hover-dot" style="opacity: 0" />
			
			<!-- Interactive overlay -->
			<rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" 
				  fill="transparent" class="chart-overlay" style="cursor: crosshair" />
		</svg>
	`.trim();

	return { svg, chartId };
}

export function interpolatePrice(mouseX: number, chartData: any): { price: number; timestamp: number; x: number } | null {
	const { points, padding, chartWidth } = chartData;
	
	const rightBound = padding + chartWidth;
	// Ensure mouseX is within chart bounds
	if (mouseX < padding || mouseX > rightBound) {
		return null;
	}

	// Find the two closest data points
	let leftPoint = points[0];
	let rightPoint = points[points.length - 1];

	// Find the exact segment we're in
	for (let i = 0; i < points.length - 1; i++) {
		if (mouseX >= points[i].x && mouseX <= points[i + 1].x) {
			leftPoint = points[i];
			rightPoint = points[i + 1];
			break;
		}
	}

	// If we're very close to a point, snap to it
	const tolerance = 3; // pixels
	for (const point of points) {
		if (Math.abs(point.x - mouseX) <= tolerance) {
			return { 
				price: point.price, 
				timestamp: point.timestamp, 
				x: point.x 
			};
		}
	}

	// Linear interpolation between the two points
	if (leftPoint.x === rightPoint.x) {
		// Same point or single point
		return { 
			price: leftPoint.price, 
			timestamp: leftPoint.timestamp, 
			x: leftPoint.x 
		};
	}

	const ratio = (mouseX - leftPoint.x) / (rightPoint.x - leftPoint.x);
	const interpolatedPrice = leftPoint.price + (rightPoint.price - leftPoint.price) * ratio;
	const interpolatedTimestamp = leftPoint.timestamp + (rightPoint.timestamp - leftPoint.timestamp) * ratio;

	return {
		price: interpolatedPrice,
		timestamp: interpolatedTimestamp,
		x: mouseX
	};
}