import { LitElement, css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { customElement } from "lit/decorators.js";
import micIcon from "../assets/mic.svg";
import { MemoRecorder } from "../logic/memo-recorder";
import { MemoManager } from "../logic/memo-manager";

@customElement("memo-recorder")
export class MemoRecorderView extends LitElement {
	#recorder?: MemoRecorder;

	#requestUpdateCallback = () => this.requestUpdate();

	render() {
		return html` <!-- <div class="audio"></div> -->
			<div class="transcript">
				${this.#recorder?.getCurrentTranscript().map((result) =>
					result.isFinal
						? result[0].transcript
						: html`<span class="interim-wrapper"
								><span class="interim"
									>${[...result].map(
										(alternative) => html`
											<span
												class="alternative"
												style=${styleMap({
													"--confidence": alternative.confidence,
												})}
												>${alternative.transcript}</span
											>
										`,
									)}</span
								></span
							>`,
				)}
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
			const manager = await MemoManager.instance;
			manager.addMemo(memo);
			this.#recorder.removeEventListener("update", this.#requestUpdateCallback);
			this.#recorder = undefined;
		} else {
			this.#recorder = new MemoRecorder();
			this.#recorder.addEventListener("update", this.#requestUpdateCallback);
			await this.#recorder.start();
		}
		this.requestUpdate();
	}

	static styles = css`
		:host {
			display: grid;
			grid-template-rows: 1fr auto;
			padding: 1em;
			gap: 1em;
		}

		.audio {
			background-color: var(--color-primary);
		}

		.transcript {
			overflow-y: auto;
			padding: 1em;
			box-sizing: border-box;
			background-color: oklch(from var(--color-theme) 25% 0.01 h);
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
			background-color: hsl(0, 0%, 20%);
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
				box-shadow:
					0 0 0 0em rgba(255, 31, 31, 0.5),
					0.1em 0.1em 0.4em rgba(0, 0, 0, 0.315);
			}
			to {
				background-color: hsl(0, 100%, 65%);
				box-shadow:
					0 0 0 1em rgba(255, 31, 31, 0.5),
					0.1em 0.1em 0.4em rgba(0, 0, 0, 0.315);
			}
		}
	`;
}
