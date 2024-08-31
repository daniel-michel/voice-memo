export interface Memo {
	readonly id?: number;
	readonly date: number;
	readonly audio: Blob;
	transcript?: Transcript;
}

export type Transcript = TranscriptEntry[];
export type TranscriptEntry = { timeRange: [number, number]; text: string };
