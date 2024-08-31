import { LitElement, css, html } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property } from "lit/decorators.js";
import { Transcript } from "../logic/memo";

@customElement("memo-transcript")
export class MemoTranscript extends LitElement {
	@property({ type: Array })
	transcript?: Transcript;

	@property({ type: Boolean })
	generating: boolean = false;

	render() {
		if (!this.transcript) {
			return html`Loading...`;
		}
		const hasTranscript =
			this.transcript.some((entry) => entry.text.length > 0) || this.generating;
		if (!hasTranscript) {
			return html`No transcript available`;
		}
		const transcript = this.transcript.map(
			(entry) => html`
				<div class="entry">
					<div class="time">
						<div class="start">${this.formatTime(entry.timeRange[0])}</div>
						<div class="end">${this.formatTime(entry.timeRange[1])}</div>
					</div>
					<pre class="text">${entry.text}</pre>
				</div>
			`,
		);
		return html`${transcript}${this.generating
			? html`<div class="generating">
					${[1, 2, 3].map(
						(n) =>
							html`<div
								style=${styleMap({
									"--n": n,
								})}
							></div>`,
					)}
				</div>`
			: ""}`;
	}

	formatTime(time: number) {
		return `${time.toFixed(1)}s`;
	}

	static styles = css`
		:host {
			display: grid;
			gap: 0.8em;
			margin: 0;
			background-color: var(--color-input-bg);
			padding: 0.5em 0.7em;
			border-radius: 0.5em;
			line-height: 1.5;

			grid-template-columns: auto 1fr;
		}

		.entry {
			display: grid;
			grid-auto-flow: column;
			grid-template-columns: subgrid;
			grid-column: 1 / -1;
			gap: 0.5em;
			align-items: center;
		}

		.time {
			font-size: 0.8em;
			color: var(--color-text-muted);
			height: 100%;
			min-height: 3em;
			position: relative;

			.start {
				font: inherit;
				position: absolute;
				top: 0;
				translate: 0 0%;
			}
			.end {
				position: relative;
				top: 100%;
				left: 0;
				translate: 0 -100%;
			}
		}

		.text {
			font: inherit;
			margin: 0;
			min-width: 0;
			white-space: pre-wrap;
			word-break: break-word;
		}

		.generating {
			grid-column: 1 / -1;
			margin-top: 0.5em;
			display: grid;
			gap: 0.5em;
			grid-auto-flow: column;
			justify-content: center;
			align-items: center;

			div {
				width: 0.5em;
				height: 0.5em;
				background-color: var(--color-text-muted);
				border-radius: 50%;
				animation: bounce 0.4s infinite alternate;
				animation-delay: calc(var(--n) * 0.13s);
			}
		}

		@keyframes bounce {
			100% {
				transform: translateY(-0.4em);
			}
		}
	`;
}
