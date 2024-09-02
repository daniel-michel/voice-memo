import { TranscriptEntry } from "../memo";
import { singleton } from "../storage/instance";
import { getWhisperModelStorage } from "../storage/storage";
// From: https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper.wasm
// this file may not be bundled therefore it is separately in the public folder
const { Module, Output } = await import(
	/* @vite-ignore */ new URL("libmain.js", location.href).href
);

export class ModelManager {
	static getInstance = singleton(() => new ModelManager());
	static get instance() {
		return this.getInstance();
	}

	#models = new Map<string, Promise<WhisperModel>>();

	async isModelCached(name: string) {
		if (this.#models.has(name)) {
			return true;
		}
		const storage = await getWhisperModelStorage();
		return await storage.has(name);
	}

	async getModel(name: string) {
		const fromCache = this.#models.get(name);
		if (fromCache) {
			return fromCache;
		}
		const storage = await getWhisperModelStorage();
		const data = await storage.get(name);
		if (!data) {
			return;
		}
		const model = new WhisperModel(name, data);
		this.#models.set(name, Promise.resolve(model));
		return model;
	}

	async cacheModel(name: string, model: WhisperModel) {
		this.#models.set(name, Promise.resolve(model));
		const storage = await getWhisperModelStorage();
		await storage.set(name, model.data);
	}

	async loadModel(
		name: string,
		loader: () => Promise<ArrayBuffer>,
	): Promise<WhisperModel> {
		const loading = this.#models.get(name);
		if (loading) {
			return loading;
		}
		const promise = (async () => {
			const cachedModel = await this.getModel(name);
			if (cachedModel) {
				return cachedModel;
			}
			const data = await loader();
			const model = new WhisperModel(name, data);
			await this.cacheModel(name, model);
			return model;
		})();
		this.#models.set(name, promise);
		return promise;
	}
}

class WhisperModel {
	readonly name: string;
	readonly data: ArrayBuffer;

	constructor(name: string, data: ArrayBuffer) {
		this.name = name;
		this.data = data;
		Module.FS_createDataFile(
			"/",
			this.name,
			new Uint8Array(this.data),
			true,
			true,
		);
	}

	dispose() {
		Module.FS_unlink(this.name);
	}

	async transcribe(buffer: Float32Array) {
		return transcribe(this, buffer);
	}
}

type WhisperEvent =
	| {
			type: "transcript";
			start: number;
			end: number;
			transcript: string;
			next: Promise<WhisperEvent>;
	  }
	| { type: "end" };

let lastTranscribe = Promise.resolve();

async function transcribe(model: WhisperModel, buffer: Float32Array) {
	const finishCompleter = Promise.withResolvers<void>();
	const previous = lastTranscribe;
	lastTranscribe = finishCompleter.promise;
	try {
		await previous;
	} catch (error) {
		// ignore
	}

	let eventCompleter = Promise.withResolvers<WhisperEvent>();

	const handlePrint = (text: string) => {
		const match = text.match(
			/^\[(?<start>\d\d:\d\d:\d\d\.\d\d\d) --> (?<end>\d\d:\d\d:\d\d\.\d\d\d)\]\s*(?<transcript>.*)$/,
		);
		if (match) {
			const newCompleter = Promise.withResolvers<WhisperEvent>();
			const start = parseTimestamp(match.groups!.start);
			const end = parseTimestamp(match.groups!.end);
			const transcript = match.groups!.transcript;
			eventCompleter.resolve({
				type: "transcript",
				start,
				end,
				transcript,
				next: newCompleter.promise,
			});
			eventCompleter = newCompleter;
		}
	};
	const handlePrintErr = (text: string) => {
		if (/^whisper_print_timings:\s*total time/.test(text)) {
			eventCompleter.resolve({ type: "end" });
		}
	};
	Output["print"] = handlePrint;
	Output["error"] = handlePrintErr;
	const threads = navigator.hardwareConcurrency || 2;
	return (async function* () {
		const instance = Module.init(model.name);
		Module.full_default(instance, buffer, "en", threads, false);

		let nextEvent = eventCompleter.promise;
		while (true) {
			const event = await nextEvent;
			if (event.type === "end") {
				break;
			}
			yield {
				timeRange: [event.start, event.end],
				text: event.transcript,
			} satisfies TranscriptEntry;
			nextEvent = event.next;
		}

		Module["print"] = () => {};
		Module["printErr"] = () => {};
		Module.free(instance);
		finishCompleter.resolve();
	})();
}

function parseTimestamp(timestamp: string) {
	const match = timestamp.match(/(\d\d):(\d\d):(\d\d)\.(\d\d\d)/);
	if (!match) {
		throw new Error(`Invalid timestamp: ${timestamp}`);
	}
	const [, hours, minutes, seconds, milliseconds] = match;
	return (
		parseInt(hours, 10) * 3600 +
		parseInt(minutes, 10) * 60 +
		parseInt(seconds, 10) +
		parseInt(milliseconds, 10) / 1000
	);
}
