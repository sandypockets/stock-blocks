export interface MarketCapData {
	value: number;
	currency?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function getMarketCapTimestamp(
	entry: Record<string, unknown>,
	timestamps: unknown[],
	index: number,
	fallback: number
): number {
	if (typeof entry.asOfDate === 'string') {
		const parsedDate = Date.parse(entry.asOfDate);
		if (Number.isFinite(parsedDate)) {
			return parsedDate;
		}
	}

	const timestamp = timestamps[index];
	if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
		return timestamp * 1000;
	}

	return fallback;
}

export function extractLatestMarketCap(response: unknown): MarketCapData | undefined {
	if (!isRecord(response) || !isRecord(response.timeseries) || !isUnknownArray(response.timeseries.result)) {
		return undefined;
	}

	let latestMarketCap: MarketCapData | undefined;
	let latestTimestamp = Number.NEGATIVE_INFINITY;
	let fallbackTimestamp = 0;

	for (const result of response.timeseries.result) {
		if (!isRecord(result) || !isUnknownArray(result.trailingMarketCap)) {
			continue;
		}

		const timestamps = isUnknownArray(result.timestamp) ? result.timestamp : [];

		for (let index = 0; index < result.trailingMarketCap.length; index++) {
			const entry = result.trailingMarketCap[index];
			fallbackTimestamp++;

			if (!isRecord(entry) || !isRecord(entry.reportedValue)) {
				continue;
			}

			const rawValue = entry.reportedValue.raw;
			if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) {
				continue;
			}

			const timestamp = getMarketCapTimestamp(entry, timestamps, index, fallbackTimestamp);
			if (timestamp < latestTimestamp) {
				continue;
			}

			latestTimestamp = timestamp;
			const currencyCode = typeof entry.currencyCode === 'string'
				? entry.currencyCode.toUpperCase()
				: undefined;
			latestMarketCap = {
				value: rawValue,
				currency: currencyCode && /^[A-Z]{3}$/.test(currencyCode)
					? currencyCode
					: undefined
			};
		}
	}

	return latestMarketCap;
}

export function calculateAverageVolume(volumes: Array<number | undefined>): number | undefined {
	let total = 0;
	let count = 0;

	for (const volume of volumes) {
		if (volume === undefined || !Number.isFinite(volume) || volume < 0) {
			continue;
		}

		total += volume;
		count++;
	}

	return count > 0 ? total / count : undefined;
}

export function resolveCurrentVolume(
	regularMarketVolume: number | undefined,
	historicalVolumes: Array<number | undefined>
): number | undefined {
	if (
		regularMarketVolume !== undefined &&
		Number.isFinite(regularMarketVolume) &&
		regularMarketVolume >= 0
	) {
		return regularMarketVolume;
	}

	for (let index = historicalVolumes.length - 1; index >= 0; index--) {
		const volume = historicalVolumes[index];
		if (volume !== undefined && Number.isFinite(volume) && volume >= 0) {
			return volume;
		}
	}

	return undefined;
}
