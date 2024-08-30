import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Memo } from "../logic/memo";
import trashIcon from "../assets/trash.svg";
import { MemoManager } from "../logic/memo-manager";

@customElement("memo-details")
export class MemoDetails extends LitElement {
	@property({ type: Object })
	memo?: Memo;

	render() {
		if (!this.memo) {
			return html`Loading...`;
		}
		const date = new Date(this.memo.date);
		const dateStr = `${date.toDateString()} ${date.toLocaleTimeString()}`;
		return html` <header>
				<h2>${dateStr}</h2>
				<button @click=${this.deleteMemo}>
					<img src=${trashIcon} alt="Delete" />
				</button>
			</header>
			<div class="content">
				<audio src=${URL.createObjectURL(this.memo.audio)} controls></audio>
				<pre class="transcript">
${this.memo.transcript.map((entry) => entry.text).join("\n")}</pre
				>
			</div>`;
	}

	async deleteMemo() {
		if (this.memo?.id) {
			const manager = await MemoManager.instance;
			await manager.deleteMemo(this.memo.id);
		}
	}

	static styles = css`
		:host {
			background-color: #262d30;
			display: grid;
			border-radius: 0.5em;
		}

		header {
			display: flex;
			justify-content: space-between;
			align-items: start;
			padding: 0.5em;

			h2 {
				margin: 0;
				font-size: 1.2em;
				padding: 0.5em;
			}

			button {
				border: none;
				border-radius: 0.5em;
				cursor: pointer;
				padding: 0.5em;
				background-color: transparent;

				button:active {
					background-color: #444;
				}

				button:hover {
					background-color: #1b1b1b;
				}
			}
		}

		.content {
			display: grid;
			padding: 1em;
			padding-top: 0;
			gap: 1em;
		}

		audio {
			display: block;
			width: 100%;
			height: 2em;
		}

		.transcript {
			margin: 0;
			background-color: oklch(from var(--color-theme) 25% 0.01 h);
			padding: 0.5em;
			border-radius: 0.5em;
			min-width: 0;
			white-space: pre-wrap;
			word-break: break-word;
		}
	`;
}
