/**
 * Utility functions for handling business days and market trading schedules
 */

export interface DateRange {
	startDate: number; // Unix timestamp in seconds
	endDate: number; // Unix timestamp in seconds
	actualDays: number; // Number of calendar days covered
}

/**
 * Check if a given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a given date is likely a market holiday (basic US holidays)
 * This is a simplified version - in production you'd want a more comprehensive holiday calendar
 */
export function isLikelyMarketHoliday(date: Date): boolean {
	const month = date.getMonth(); // 0-based
	const dayOfMonth = date.getDate();
	const year = date.getFullYear();
	
	// New Year's Day
	if (month === 0 && dayOfMonth === 1) return true;
	
	// Independence Day
	if (month === 6 && dayOfMonth === 4) return true;
	
	// Christmas Day
	if (month === 11 && dayOfMonth === 25) return true;
	
	// Thanksgiving (4th Thursday of November)
	if (month === 10) {
		const firstDay = new Date(year, 10, 1);
		const firstThursday = 1 + (4 - firstDay.getDay() + 7) % 7;
		const fourthThursday = firstThursday + 21;
		if (dayOfMonth === fourthThursday) return true;
	}
	
	// Memorial Day (last Monday of May)
	if (month === 4) {
		const lastDay = new Date(year, 5, 0).getDate(); // Last day of May
		const lastDayOfWeek = new Date(year, 4, lastDay).getDay();
		const lastMonday = lastDay - (lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1);
		if (dayOfMonth === lastMonday) return true;
	}
	
	// Labor Day (first Monday of September)
	if (month === 8) {
		const firstDay = new Date(year, 8, 1);
		const firstMonday = 1 + (1 - firstDay.getDay() + 7) % 7;
		if (dayOfMonth === firstMonday) return true;
	}
	
	return false;
}

/**
 * Check if a given date is a trading day (not weekend or holiday)
 */
export function isTradingDay(date: Date): boolean {
	return !isWeekend(date) && !isLikelyMarketHoliday(date);
}

/**
 * Get the most recent trading day from a given date
 */
export function getMostRecentTradingDay(fromDate: Date = new Date()): Date {
	const date = new Date(fromDate);
	
	// Go back day by day until we find a trading day
	while (!isTradingDay(date)) {
		date.setDate(date.getDate() - 1);
	}
	
	return date;
}

export function calculateOptimalDateRange(
	requestedDays: number,
	useBusinessDays: boolean = true,
	endDate: Date = new Date()
): DateRange {
	if (!useBusinessDays) {
		const startDate = new Date(endDate);
		// For very short periods, add a small buffer to account for weekends/holidays
		const bufferDays = requestedDays <= 3 ? Math.ceil(requestedDays * 1.5) : Math.ceil(requestedDays * 0.3);
		startDate.setDate(startDate.getDate() - requestedDays - bufferDays);
		
		return {
			startDate: Math.floor(startDate.getTime() / 1000),
			endDate: Math.floor(endDate.getTime() / 1000),
			actualDays: requestedDays + bufferDays
		};
	}
	
	const endTradingDay = getMostRecentTradingDay(endDate);
	
	// Special case for single day requests - get at least 2 trading days for chart rendering
	if (requestedDays === 1) {
		const startDate = new Date(endTradingDay);
		let tradingDaysFound = 0;
		// Go back until we find at least 1 previous trading day (so we have 2 total)
		while (tradingDaysFound < 1) {
			startDate.setDate(startDate.getDate() - 1);
			if (isTradingDay(startDate)) {
				tradingDaysFound++;
			}
		}
		
		return {
			startDate: Math.floor(startDate.getTime() / 1000),
			endDate: Math.floor(endTradingDay.getTime() / 1000),
			actualDays: 2
		};
	}
	
	const startDate = new Date(endTradingDay);
	
	let businessDaysFound = 0;
	let totalDaysBack = 0;
	
	// Go back day by day until we have enough business days
	while (businessDaysFound < requestedDays) {
		startDate.setDate(startDate.getDate() - 1);
		totalDaysBack++;
		
		if (isTradingDay(startDate)) {
			businessDaysFound++;
		}
		
		// Safety valve to prevent infinite loops
		if (totalDaysBack > requestedDays * 4) {
			break;
		}
	}
	
	return {
		startDate: Math.floor(startDate.getTime() / 1000),
		endDate: Math.floor(endTradingDay.getTime() / 1000),
		actualDays: totalDaysBack
	};
}

/**
 * Get a human-readable description of the time period
 */
export function getTimeRangeDescription(
	requestedDays: number,
	useBusinessDays: boolean,
	actualRange: DateRange
): string {
	const startDate = new Date(actualRange.startDate * 1000);
	const endDate = new Date(actualRange.endDate * 1000);
	
	const startStr = startDate.toLocaleDateString('en-US', { 
		month: 'short', 
		day: 'numeric' 
	});
	const endStr = endDate.toLocaleDateString('en-US', { 
		month: 'short', 
		day: 'numeric' 
	});
	
	// For single day requests, show a more specific description
	if (requestedDays === 1) {
		if (useBusinessDays) {
			return `Last business day (${endStr})`;
		} else {
			return `Last day (${endStr})`;
		}
	}
	
	// For multi-day requests, show the range
	const dayType = useBusinessDays ? 'business day' : 'day';
	const dayTypePlural = useBusinessDays ? 'business days' : 'days';
	
	return `Last ${requestedDays} ${requestedDays === 1 ? dayType : dayTypePlural} (${startStr} - ${endStr})`;
}
