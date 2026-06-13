import { formatPrice } from './formatters';

const DEFAULT_CHART_PADDING = 10;
const DEFAULT_AXIS_PADDING = 40;
const MIN_CHART_WIDTH = 80;
const AXIS_LABEL_AVERAGE_CHAR_WIDTH = 6;
const AXIS_LABEL_GAP = 14;

export function calculateAxisPadding(
	showAxes: boolean,
	width: number,
	height: number,
	prices: number[],
	currency: string,
	pricePrecision?: number
): number {
	if (!showAxes || prices.length === 0) {
		return DEFAULT_CHART_PADDING;
	}

	const longestLabelLength = prices
		.map(price => formatPrice(price, currency, pricePrecision).length)
		.reduce((longest, labelLength) => Math.max(longest, labelLength), 0);
	const labelWidth = Math.ceil(longestLabelLength * AXIS_LABEL_AVERAGE_CHAR_WIDTH);
	const desiredPadding = Math.max(DEFAULT_AXIS_PADDING, labelWidth + AXIS_LABEL_GAP);
	const maxWidthPadding = Math.floor((width - MIN_CHART_WIDTH) / 2);
	const maxHeightPadding = Math.floor((height - MIN_CHART_WIDTH) / 2);
	const maxPadding = Math.max(DEFAULT_CHART_PADDING, Math.min(maxWidthPadding, maxHeightPadding));

	return Math.max(DEFAULT_CHART_PADDING, Math.min(desiredPadding, maxPadding));
}
