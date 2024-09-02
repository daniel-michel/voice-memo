export function singleton<T>(initialize: () => T): () => T {
	let instance: T | undefined;
	return () => {
		if (instance === undefined) {
			instance = initialize();
		}
		return instance;
	};
}
