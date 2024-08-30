import { Memo } from "./memo";

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

	constructor(db: IDBDatabase) {
		super();
		this.#db = db;
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
