import { Memo } from "../memo";
import { IndexedDBMapDatabase } from "./indexeddb-map";
import { singleton } from "./instance";

export type Storage = {
	memo: MemoStorage;
	"whisper-model": WhisperModelStorage;
};

export type MemoStorage = { [id: number]: Memo };
export type WhisperModelStorage = { [name: string]: ArrayBuffer };

export const getStorage = singleton(() =>
	IndexedDBMapDatabase.create<Storage>("voice-memo", [
		"whisper-model",
		{
			name: "memo",
			options: { keyPath: "id", autoIncrement: true },
		},
	]),
);

export const getMemoStorage = singleton(async () => {
	const storage = await getStorage();
	return storage.get("memo");
});

export const getWhisperModelStorage = singleton(async () => {
	const storage = await getStorage();
	return storage.get("whisper-model");
});
