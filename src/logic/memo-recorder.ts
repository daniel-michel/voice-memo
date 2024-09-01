import { Memo } from "./memo";

export class MemoRecorder extends EventTarget {
	#stream?: MediaStream;
	#mediaRecorder?: MediaRecorder;
	#audio?: Blob;
	#recordingStarted?: number;
	#recordingDuration = 0;
	#audioLevels: number[] = [];
	#audioLevelSampleRate = 15;
	#audioLevelInterval?: number;
	#recordingFinished = Promise.resolve();

	constructor() {
		super();
	}

	get recording() {
		return !!this.#stream;
	}

	get audioLevels() {
		return this.#audioLevels;
	}

	get audioLevelSampleRate() {
		return this.#audioLevelSampleRate;
	}

	get duration() {
		return this.#recordingStarted
			? Date.now() - this.#recordingStarted + this.#recordingDuration
			: this.#recordingDuration;
	}

	async start() {
		if (this.#stream) {
			throw new Error("Already recording");
		}
		this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		{
			// Audio level
			const audioContext = new AudioContext();
			const source = audioContext.createMediaStreamSource(this.#stream);
			const analyser = audioContext.createAnalyser();
			source.connect(analyser);
			analyser.fftSize = 32;
			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);
			const updateAudioLevel = () => {
				analyser.getByteFrequencyData(dataArray);
				const audioLevel =
					dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
				this.#audioLevels.push(audioLevel);
				this.dispatchEvent(new CustomEvent("update"));
			};
			this.#audioLevelInterval = setInterval(
				updateAudioLevel,
				1000 / this.#audioLevelSampleRate,
			);
		}

		const completer = Promise.withResolvers<void>();
		this.#recordingFinished = completer.promise;
		const chunks: Blob[] = [];
		const mediaRecorder = (this.#mediaRecorder = new MediaRecorder(
			this.#stream,
		));
		mediaRecorder.ondataavailable = (event) => {
			chunks.push(event.data);
		};
		mediaRecorder.onstop = () => {
			this.#audio = new Blob(chunks, { type: mediaRecorder.mimeType });
			completer.resolve();
		};
		mediaRecorder.start();
		this.#recordingStarted = Date.now();
	}

	async stop() {
		this.#mediaRecorder?.stop();
		clearInterval(this.#audioLevelInterval);
		this.#stream?.getTracks().forEach((track) => track.stop());
		this.#recordingDuration = this.duration;
		this.#recordingStarted = undefined;
		await this.#recordingFinished;
		this.#stream = undefined;
		this.#mediaRecorder = undefined;
		this.#audioLevelInterval = undefined;
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
