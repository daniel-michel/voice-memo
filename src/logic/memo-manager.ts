import { showToast } from "../view/modal/toast";
import { fetchWithProgress } from "./fetch-util";
import { Memo, Transcript } from "./memo";
import { ModelManager } from "./speech-recognition/whisper";

export class MemoManager extends EventTarget {
	static #instance: Promise<MemoManager>;
	static get instance() {
		if (!this.#instance) {
			this.#instance = new Promise((resolve, reject) => {
				const request = indexedDB.open("memo", 1);
				request.onupgradeneeded = () => {
					const db = request.result;
					db.createObjectStore("memo", { keyPath: "id", autoIncrement: true });
				};
				request.onsuccess = () => {
					resolve(new MemoManager(request.result));
				};
				request.onerror = () => {
					reject(request.error);
				};
			});
		}
		return this.#instance;
	}

	#db: IDBDatabase;
	#generatingTranscript = new Map<number, Transcript>();

	constructor(db: IDBDatabase) {
		super();
		this.#db = db;
		this.init();
	}

	async init() {
		this.generateTranscriptForMemosWhereMissing();
	}

	generateTranscriptForMemosWhereMissing() {
		const store = this.#db.transaction("memo", "readonly").objectStore("memo");
		const request = store.getAll();
		request.onsuccess = () => {
			const memos = request.result as Memo[];
			for (const memo of memos) {
				if (!memo.transcript && memo.id) {
					this.generateMemoTranscript(memo.id);
				}
			}
		};
	}

	async addMemo(memo: Memo) {
		const store = this.#db.transaction("memo", "readwrite").objectStore("memo");
		const request = store.add(memo);
		const promise = new Promise<number>((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result as number);
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
		promise.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		return promise;
	}

	async updateMemoTranscript(id: number, transcript: Memo["transcript"]) {
		const transaction = this.#db.transaction("memo", "readwrite");
		const store = transaction.objectStore("memo");
		const request = store.get(id);
		const promise = new Promise<void>((resolve, reject) => {
			request.onsuccess = () => {
				const memo = request.result as Memo;
				if (memo) {
					memo.transcript = transcript;
					store.put(memo);
					resolve();
				} else {
					reject(new Error("Memo not found"));
				}
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
		promise.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		return promise;
	}

	async deleteMemo(id: number) {
		const store = this.#db.transaction("memo", "readwrite").objectStore("memo");
		const request = store.delete(id);
		const promise = new Promise<void>((resolve, reject) => {
			request.onsuccess = () => {
				resolve();
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
		promise.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		return promise;
	}

	async getMemo(id: number) {
		const store = this.#db.transaction("memo", "readonly").objectStore("memo");
		const request = store.get(id);
		return new Promise<Memo>((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result as Memo);
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async getMemos() {
		const store = this.#db.transaction("memo", "readonly").objectStore("memo");
		const request = store.getAll();
		return new Promise<Memo[]>((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result as Memo[]);
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
	}

	async generateMemoTranscript(id: number) {
		if (this.#generatingTranscript.has(id)) {
			return;
		}
		const memo = await this.getMemo(id);
		if (!memo?.audio) {
			return;
		}
		const audioDecodeContext = new OfflineAudioContext(1, 1, 16000);
		const audioBuffer = await audioDecodeContext.decodeAudioData(
			await new Response(memo.audio).arrayBuffer(),
		);
		const buffer = audioBuffer.getChannelData(0);

		const modelManager = await ModelManager.instance;
		const model = await modelManager.loadModel("tiny.en-q5_1", async () => {
			const toast = showToast("Downloading model...");
			const response = await fetchWithProgress(
				`./ggml-model-whisper-tiny.en-q5_1.bin`,
				{},
				(progress) => {
					toast.toast.progress = progress;
				},
			);
			toast.close();
			return response.arrayBuffer();
		});
		const generatingTranscript: Transcript = [];
		this.#generatingTranscript.set(id, generatingTranscript);
		this.dispatchEvent(new Event("change"));
		const iterator = await model.transcribe(buffer);
		for await (const entry of iterator) {
			generatingTranscript.push(entry);
			this.dispatchEvent(new Event("change"));
		}
		const manager = await MemoManager.instance;
		await manager.updateMemoTranscript(id, generatingTranscript);
		this.#generatingTranscript.delete(id);
		this.dispatchEvent(new Event("change"));
	}

	getGeneratingTranscript(id: number) {
		return this.#generatingTranscript.get(id);
	}
}

export class Interval {
	#id?: number;
	#callback: () => void;
	#interval: number;

	constructor(callback: () => void, interval: number) {
		this.#callback = callback;
		this.#interval = interval;
	}

	get active() {
		return this.#id !== undefined;
	}

	activate() {
		this.#id = setInterval(this.#callback, this.#interval);
	}

	deactivate() {
		if (this.#id) {
			clearInterval(this.#id);
			this.#id = undefined;
		}
	}
}
