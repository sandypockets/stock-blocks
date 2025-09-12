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
		// For single data point, show a centered dot
		const centerX = width / 2;
		const centerY = height / 2;
		return `
			<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stock-sparkline">
				<circle cx="${centerX}" cy="${centerY}" r="3" fill="${strokeColor}" />
				<text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="10" fill="#6b7280">Single day</text>
			</svg>
		`.trim();
	}

	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;

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
	const chartId = `sparkline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	
	if (prices.length === 0) {
		return {
			svg: `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-chart-id="${chartId}"></svg>`,
			chartId
		};
	}
	
	if (prices.length === 1) {
		// For single data point, show a centered dot with basic interactivity
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

	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;

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

	const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

	// Create chart data for sparklines (including timestamps if available)
	const chartData = JSON.stringify({
		points: points.map(p => ({
			x: p.x,
			y: p.y,
			price: p.price,
			index: p.index,
			timestamp: p.timestamp
		})),
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
			<!-- Line -->
			<polyline
				fill="none"
				stroke="${strokeColor}"
				stroke-width="1.5"
				points="${polylinePoints}"
				class="sparkline-line"
			/>
			
			<!-- Hover dot (initially hidden) -->
			<circle r="3" fill="${strokeColor}" stroke="white" stroke-width="1" 
					class="hover-dot" style="opacity: 0" />
			
			<!-- Interactive overlay -->
			<rect x="0" y="0" width="${width}" height="${height}" 
				  fill="transparent" class="sparkline-overlay" style="cursor: crosshair" />
		</svg>
	`.trim();

	return { svg, chartId };
}

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
	const chartWidth = width - (padding * 2);
	const chartHeight = height - (padding * 2);

	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;

	const pathData = prices.map((price, index) => {
		const x = padding + (index / (prices.length - 1)) * chartWidth;
		const y = padding + chartHeight - ((price - min) / range) * chartHeight;
		return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
	}).join(' ');

	const areaData = `${pathData} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

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
			<text x="5" y="${padding + chartHeight / 2 + 3}" font-size="10" fill="#6b7280" text-anchor="start">$${midPrice.toFixed(2)}</text>
			<text x="5" y="${padding + chartHeight}" font-size="10" fill="#6b7280" text-anchor="start">$${min.toFixed(2)}</text>
			
			<!-- X-axis labels -->
			<text x="${padding}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="start">${startDate}</text>
			<text x="${padding + chartWidth / 2}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${midDate}</text>
			<text x="${padding + chartWidth}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="end">${endDate}</text>
			
			<!-- Grid lines -->
			<line x1="${padding}" y1="${padding}" x2="${padding + chartWidth}" y2="${padding}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${padding + chartWidth}" y2="${padding + chartHeight / 2}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>
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
	const chartWidth = width - (padding * 2);
	const chartHeight = height - (padding * 2);

	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min || 1;

	const points = prices.map((price, index) => {
		const x = padding + (index / (prices.length - 1)) * chartWidth;
		const y = padding + chartHeight - ((price - min) / range) * chartHeight;
		return { x, y, price, timestamp: timestamps[index], index };
	});

	const pathData = points.map((point, index) => {
		return index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`;
	}).join(' ');

	const areaData = `${pathData} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

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
			<text x="5" y="${padding + chartHeight / 2 + 3}" font-size="10" fill="#6b7280" text-anchor="start">$${midPrice.toFixed(2)}</text>
			<text x="5" y="${padding + chartHeight}" font-size="10" fill="#6b7280" text-anchor="start">$${min.toFixed(2)}</text>
			
			<!-- X-axis labels -->
			<text x="${padding}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="start">${startDate}</text>
			<text x="${padding + chartWidth / 2}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="middle">${midDate}</text>
			<text x="${padding + chartWidth}" y="${height - 5}" font-size="10" fill="#6b7280" text-anchor="end">${endDate}</text>
			
			<!-- Grid lines -->
			<line x1="${padding}" y1="${padding}" x2="${padding + chartWidth}" y2="${padding}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${padding + chartWidth}" y2="${padding + chartHeight / 2}" stroke="#e5e7eb" stroke-width="0.5"/>
			<line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>
		`;
	}

	const chartData = JSON.stringify({
		points: points.map(p => ({
			x: p.x,
			y: p.y,
			price: p.price,
			timestamp: p.timestamp,
			index: p.index
		})),
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
	
	// Ensure mouseX is within chart bounds
	if (mouseX < padding || mouseX > padding + chartWidth) {
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

	// Get dimensions for positioning without hiding the tooltip
	const rect = tooltip.getBoundingClientRect();
	const tooltipWidth = rect.width || 80;
	const tooltipHeight = rect.height || 30;

	// Calculate optimal position
	let left = x + 15;
	let top = y - tooltipHeight - 15;

	// Adjust if tooltip would go off screen horizontally
	if (left + tooltipWidth > window.innerWidth - 10) {
		left = x - tooltipWidth - 15;
	}
	
	// Adjust if tooltip would go off screen vertically
	if (top < 10) {
		top = y + 15;
	}
	
	// Ensure tooltip doesn't go below screen
	if (top + tooltipHeight > window.innerHeight - 10) {
		top = window.innerHeight - tooltipHeight - 10;
	}

	// Apply final position
	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
	tooltip.classList.remove('hidden');
	tooltip.classList.add('visible');
}

export function hideTooltip(tooltip: HTMLElement): void {
	tooltip.classList.remove('visible');
	tooltip.classList.add('hidden');
}
