interface RequestOptions {
	url: string;
}

interface RequestResponse {
	json: unknown;
}

type RequestHandler = (options: RequestOptions) => Promise<RequestResponse>;

let requestHandler: RequestHandler = () => Promise.reject(new Error('No request handler configured'));

export function setRequestHandler(handler: RequestHandler): void {
	requestHandler = handler;
}

export async function requestUrl(options: RequestOptions): Promise<RequestResponse> {
	return await requestHandler(options);
}
