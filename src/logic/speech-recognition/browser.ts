const SpeechRecognition =
	window.SpeechRecognition || window.webkitSpeechRecognition;

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
