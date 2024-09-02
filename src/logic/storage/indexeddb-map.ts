export class IndexedDBMapDatabase<
	MapDataFormats extends {
		[storeName: string]: { [key: number | string]: any };
	},
> {
	static async create<
		MapDataFormats extends {
			[storeName: string]: { [key: number | string]: any };
		},
	>(
		dbName: string,
		maps: (
			| MapDBKey<MapDataFormats>
			| { name: MapDBKey<MapDataFormats>; options: IDBObjectStoreParameters }
		)[],
		version = 1,
	): Promise<IndexedDBMapDatabase<MapDataFormats>> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, version);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				resolve(new IndexedDBMapDatabase(db));
			};
			request.onupgradeneeded = () => {
				const db = request.result;
				for (const map of maps) {
					if (typeof map === "string") {
						db.createObjectStore(map);
					} else {
						db.createObjectStore(map.name, map.options);
					}
				}
			};
		});
	}

	#db: IDBDatabase;

	constructor(db: IDBDatabase) {
		this.#db = db;
	}

	get<MapName extends MapDBKey<MapDataFormats>>(mapName: MapName) {
		return new IndexedDBMap<MapDataFormats[MapName]>(this.#db, mapName);
	}
}

type MapDBKey<MapDataFormats extends { [storeName: string]: any }> =
	keyof MapDataFormats & string;

export class IndexedDBMap<DataFormat extends { [key: number | string]: any }> {
	static create<DataFormat extends { [key: number | string]: any }>(
		name: string,
		storeName: string,
	) {
		return new Promise<IndexedDBMap<DataFormat>>((resolve, reject) => {
			const request = indexedDB.open(name, 1);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				resolve(new IndexedDBMap<DataFormat>(db, storeName));
			};
			request.onupgradeneeded = () => {
				const db = request.result;
				db.createObjectStore(storeName);
			};
		});
	}

	#db: IDBDatabase;
	#storeName: string;

	constructor(db: IDBDatabase, storeName: string) {
		this.#db = db;
		this.#storeName = storeName;
	}

	async get<const Key extends DataKey<DataFormat>>(key: Key) {
		const request = this.#db
			.transaction(this.#storeName)
			.objectStore(this.#storeName)
			.get(key);
		return new Promise<DataFormat[Key]>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	async set<const Key extends DataKey<DataFormat>>(
		key: Key,
		value: DataFormat[Key],
	) {
		const request = this.#db
			.transaction(this.#storeName, "readwrite")
			.objectStore(this.#storeName)
			.put(value, key);
		return new Promise<void>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	/**
	 * Automatically insert a value without a key.
	 * For this to work a key path must be defined and the key must be set or auto increment must be enabled.
	 */
	async put(value: DataValue<DataFormat>) {
		const request = this.#db
			.transaction(this.#storeName, "readwrite")
			.objectStore(this.#storeName)
			.put(value);
		return new Promise<DataKey<DataFormat>>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result as DataKey<DataFormat>);
		});
	}

	async delete<Key extends DataKey<DataFormat>>(key: Key) {
		const request = this.#db
			.transaction(this.#storeName, "readwrite")
			.objectStore(this.#storeName)
			.delete(key);
		return new Promise<void>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async keys() {
		const request = this.#db
			.transaction(this.#storeName)
			.objectStore(this.#storeName)
			.getAllKeys();
		return new Promise<DataKey<DataFormat>[]>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () =>
				resolve(request.result as DataKey<DataFormat>[]);
		});
	}

	async values() {
		const request = this.#db
			.transaction(this.#storeName)
			.objectStore(this.#storeName)
			.getAll();
		return new Promise<DataValue<DataFormat>[]>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () =>
				resolve(request.result as DataValue<DataFormat>[]);
		});
	}

	async clear() {
		const request = this.#db
			.transaction(this.#storeName, "readwrite")
			.objectStore(this.#storeName)
			.clear();
		return new Promise<void>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async count() {
		const request = this.#db
			.transaction(this.#storeName)
			.objectStore(this.#storeName)
			.count();
		return new Promise<number>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	async has<Key extends DataKey<DataFormat>>(key: Key) {
		const request = this.#db
			.transaction(this.#storeName)
			.objectStore(this.#storeName)
			.getKey(key);
		return new Promise<boolean>((resolve, reject) => {
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result !== undefined);
		});
	}
}

type DataKey<DataFormat extends { [key: number | string]: any }> =
	keyof DataFormat & (string | number);

type DataValue<DataFormat extends { [key: number | string]: any }> =
	DataFormat[DataKey<DataFormat>];
