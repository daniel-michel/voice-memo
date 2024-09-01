import { LitElement, css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { customElement } from "lit/decorators.js";
import micIcon from "../assets/icons/mic.svg";
import { MemoRecorder } from "../logic/memo-recorder";
import { MemoManager } from "../logic/memo-manager";
import { observeResize } from "./directives/observe-resize";
import { createRef, ref } from "lit/directives/ref.js";
import { Memo } from "../logic/memo";

@customElement("memo-recorder")
export class MemoRecorderView extends LitElement {
	#recorder?: MemoRecorder;
	#memo?: Memo;
	#animationFrameRequest?: number;
	#requestUpdateCallback = () => this.requestUpdate();
	#audioCanvasRef = createRef<HTMLCanvasElement>();

	constructor() {
		super();
		MemoManager.instance.then((manager) => {
			manager.addEventListener("change", async () => {
				if (this.#memo?.id) {
					this.#memo = await manager.getMemo(this.#memo.id);
				}
				this.requestUpdate();
			});
		});
	}

	render() {
		return html`<canvas
				class="audio"
				${ref(this.#audioCanvasRef)}
				${observeResize(() => this.#renderAudio())}
			></canvas>
			<div class="transcript">
				${this.#memo
					? html`<memo-transcript .memo=${this.#memo}></memo-transcript>`
					: ""}
			</div>
			<button
				class=${classMap({
					record: true,
					recording: this.#recorder?.recording ?? false,
				})}
				@click=${this.#toggleRecording}
			>
				<img src=${micIcon} alt="Record" />
			</button>`;
	}

	async #toggleRecording() {
		if (this.#recorder?.recording) {
			await this.#recorder.stop();
			const memo = this.#recorder.getMemo();
			this.#recorder.removeEventListener("update", this.#requestUpdateCallback);
			const manager = await MemoManager.instance;
			const id = await manager.addMemo(memo);
			manager.generateMemoTranscript(id);
			this.#memo = await manager.getMemo(id);
		} else {
			this.#recorder = new MemoRecorder();
			this.#recorder.addEventListener("update", this.#requestUpdateCallback);
			await this.#recorder.start();
			if (!this.#animationFrameRequest) {
				this.#animationLoop();
			}
		}
		this.requestUpdate();
	}

	#animationLoop() {
		this.#animationFrameRequest = undefined;
		if (this.#recorder?.recording) {
			this.#animationFrameRequest = requestAnimationFrame(() =>
				this.#animationLoop(),
			);
		}
		this.#renderAudio();
	}

	#renderAudio() {
		const canvas = this.#audioCanvasRef.value;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) {
			return;
		}
		canvas.width = canvas.clientWidth * devicePixelRatio;
		canvas.height = canvas.clientHeight * devicePixelRatio;

		const recorder = this.#recorder;
		if (!recorder) {
			return;
		}
		const audioLevels = recorder.audioLevels;
		const time = recorder.duration;
		const visibleTime = 3_000;
		const timeScale = canvas.width / visibleTime;
		const barDistance = timeScale / (recorder.audioLevelSampleRate / 1_000);
		const maxBars = Math.ceil(canvas.width / barDistance);

		context.lineWidth = barDistance * 0.5;
		context.lineCap = "round";

		for (let i = 0; i < maxBars; i++) {
			const index = audioLevels.length - i - 1;
			if (index < 0) {
				break;
			}
			const audioLevel = audioLevels[index];
			const sampleTimeInPast =
				time - (index * 1_000) / recorder.audioLevelSampleRate;
			const fadeInPercent = Math.min(1, sampleTimeInPast / 200);
			const fadeInFactor = 0.5 * -Math.cos(fadeInPercent * Math.PI) + 0.5;
			const displayStrength = (audioLevel / 255) ** 2 * fadeInFactor;
			const x = canvas.width - sampleTimeInPast * timeScale;
			const height = displayStrength * canvas.height;
			context.strokeStyle = `hsl(0, 0%, ${50 + displayStrength * 50}%)`;
			context.beginPath();
			context.moveTo(x, canvas.height / 2 - height / 2);
			context.lineTo(x, canvas.height / 2 + height / 2);
			context.stroke();
		}
	}

	static styles = css`
		:host {
			display: grid;
			grid-template-rows: auto 1fr auto;
			min-height: 0;
			padding: 1em;
			gap: 1em;
		}

		.audio {
			background-color: var(--color-input-bg);
			width: 100%;
			min-height: 0;
			max-height: 30vh;
			aspect-ratio: 3 / 1;
			border-radius: 0.5em;
		}

		.transcript {
			overflow-y: auto;
			padding: 1em;
			box-sizing: border-box;
			background-color: var(--color-input-bg);
			border-radius: 0.5em;

			.interim-wrapper {
				display: inline-block;
				margin: 0 0.2em;
				height: 1.5em;
			}

			.interim {
				display: grid;
				background-color: oklch(from var(--color-theme) 35% 0.01 h);
				border-radius: 0.5em;
				overflow: clip;
				box-shadow: 0.1em 0.1em 0.5em hsla(0, 0%, 0%, 0.3);

				.alternative {
					position: relative;
					z-index: 1;
					padding: 0.2em 0.5em;

					&:not(:last-child) {
						border-bottom: 0.1em solid hsl(0, 0%, 50%);
					}

					&::before {
						content: "";
						z-index: -1;
						display: block;
						position: absolute;
						top: 0;
						left: 0;
						width: calc(var(--confidence) * 100%);
						height: 100%;
						background-color: oklch(from var(--color-theme) 35% 0.07 h);
					}
				}
			}
		}

		.record {
			font-size: 1rem;
			place-self: center;
			width: 5em;
			height: 5em;
			border: none;
			border-radius: 50%;
			display: grid;
			place-items: center;
			background-color: light-dark(hsl(0, 0%, 50%), hsl(0, 0%, 20%));
			transition: background-color 0.2s;
			margin: 1.5em;

			img {
				width: 2.5em;
				height: 2.5em;
			}

			&:hover {
				background-color: hsl(0, 40%, 53%);
			}

			&.recording {
				animation: recording 0.5s ease-out infinite alternate;
			}
		}

		@keyframes recording {
			from {
				background-color: hsl(0, 100%, 40%);
				box-shadow: 0 0 0 0em rgba(255, 31, 31, 0.5);
			}
			to {
				background-color: hsl(0, 100%, 65%);
				box-shadow: 0 0 0 1em rgba(255, 31, 31, 0.5);
			}
		}
	`;
}
