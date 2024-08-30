export interface Memo {
	readonly id?: number;
	readonly date: number;
	readonly audio: Blob;
	readonly transcript: { timestamp: number; text: string }[];
}

export type Transcript = { timestamp: number; text: string }[];
