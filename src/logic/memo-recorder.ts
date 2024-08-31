import { Memo } from "./memo";

const SpeechRecognition =
	window.SpeechRecognition || window.webkitSpeechRecognition;

export class MemoRecorder extends EventTarget {
	#stream?: MediaStream;
	#mediaRecorder?: MediaRecorder;
	#audio?: Blob;
	#recordingFinished = Promise.resolve();

	constructor() {
		super();
	}

	get recording() {
		return !!this.#stream;
	}

	async start() {
		if (this.#stream) {
			throw new Error("Already recording");
		}
		this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const mediaRecorder = (this.#mediaRecorder = new MediaRecorder(
			this.#stream,
		));
		const chunks: Blob[] = [];
		mediaRecorder.ondataavailable = (event) => {
			chunks.push(event.data);
		};
		const completer = Promise.withResolvers<void>();
		this.#recordingFinished = completer.promise;
		mediaRecorder.onstop = () => {
			this.#audio = new Blob(chunks, { type: mediaRecorder.mimeType });
			completer.resolve();
		};
		mediaRecorder.start();
	}

	async stop() {
		this.#mediaRecorder?.stop();
		this.#stream?.getTracks().forEach((track) => track.stop());
		await this.#recordingFinished;
		this.#stream = undefined;
		this.#mediaRecorder = undefined;
		this.dispatchEvent(new CustomEvent("update"));
	}

	getMemo(): Memo {
		if (!this.#audio) {
			throw new Error("No audio recorded");
		}
		return {
			date: Date.now(),
			audio: this.#audio!,
		};
	}
}

export class SpeechRecorder extends EventTarget {
	#transcript: SpeechRecognitionResult[] = [];
	#currentTranscript?: SpeechRecognitionResultList;
	#speechRecognition?: SpeechRecognition;
	#finished = Promise.resolve();

	async start() {
		if (this.#speechRecognition) {
			throw new Error("Already recording");
		}
		const speechRecognition = (this.#speechRecognition = SpeechRecognition
			? new SpeechRecognition()
			: undefined);
		if (speechRecognition) {
			speechRecognition.continuous = true;
			speechRecognition.interimResults = true;
			speechRecognition.maxAlternatives = 3;
			speechRecognition.lang = "en-US"; // TODO make this configurable
			speechRecognition.addEventListener("result", (event) => {
				const results = event.results;
				this.#currentTranscript = results;
				this.dispatchEvent(new CustomEvent("result", { detail: results }));
			});
			const completer = Promise.withResolvers<void>();
			this.#finished = completer.promise;
			speechRecognition.addEventListener("end", () => {
				if (this.#speechRecognition) {
					this.#speechRecognition.start();
				} else {
					if (this.#currentTranscript) {
						this.#transcript = this.#transcript.concat(
							Array.from(this.#currentTranscript),
						);
					}
					this.#currentTranscript = undefined;
					completer.resolve();
				}
			});

			speechRecognition.start();
		}
	}

	async stop() {
		this.#speechRecognition?.stop();
		this.#speechRecognition = undefined;
		await this.#finished;
	}

	getCurrentTranscript(): SpeechRecognitionResult[] {
		return this.#currentTranscript
			? this.#transcript.concat(Array.from(this.#currentTranscript))
			: this.#transcript;
	}
}
