export async function fetchWithProgress(
	url: string,
	options: RequestInit,
	onProgress: (progress: number) => void,
) {
	const response = await fetch(url, options);
	const reader = response.body!.getReader();
	const contentLength = Number(response.headers.get("Content-Length"));
	let receivedLength = 0;
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		chunks.push(value);
		receivedLength += value.length;
		onProgress(receivedLength / contentLength);
	}
	return new Response(
		new Blob(chunks, {
			type: response.headers.get("Content-Type") ?? undefined,
		}),
	);
}
