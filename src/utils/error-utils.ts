export function getErrorMessage(error: unknown, fallback: string = 'Unknown error'): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error.length > 0) {
		return error;
	}

	return fallback;
}
