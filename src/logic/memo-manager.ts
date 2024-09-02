import { showToast } from "../view/modal/toast";
import { fetchWithProgress } from "./fetch-util";
import { Memo, Transcript } from "./memo";
import { ModelManager } from "./speech-recognition/whisper";
import { IndexedDBMap } from "./storage/indexeddb-map";
import { singleton } from "./storage/instance";
import { getMemoStorage, MemoStorage } from "./storage/storage";

export class MemoManager extends EventTarget {
	static getInstance = singleton(async () => {
		const storage = await getMemoStorage();
		return new MemoManager(storage);
	});
	static get instance() {
		return this.getInstance();
	}

	#storage: IndexedDBMap<MemoStorage>;
	#generatingTranscript = new Map<number, Transcript>();

	constructor(storage: IndexedDBMap<MemoStorage>) {
		super();
		this.#storage = storage;
		this.init();
	}

	async init() {
		await this.generateTranscriptForMemosWhereMissing();
	}

	async generateTranscriptForMemosWhereMissing() {
		const values = await this.#storage.values();
		for (const memo of values) {
			if (!memo.transcript && memo.id) {
				this.generateMemoTranscript(memo.id);
			}
		}
	}

	async addMemo(memo: Memo) {
		const result = this.#storage.put(memo);
		result.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		return await result;
	}

	async updateMemoTranscript(id: number, transcript: Memo["transcript"]) {
		const memo = await this.getMemo(id);
		if (!memo) {
			throw new Error("Memo not found");
		}
		memo.transcript = transcript;
		const result = this.#storage.put(memo);
		result.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		await result;
	}

	async deleteMemo(id: number) {
		const result = this.#storage.delete(id);
		result.finally(() => {
			this.dispatchEvent(new Event("change"));
		});
		await result;
	}

	async getMemo(id: number) {
		return await this.#storage.get(id);
	}

	async getMemos() {
		return await this.#storage.values();
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
