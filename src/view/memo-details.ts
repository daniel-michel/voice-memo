import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Memo } from "../logic/memo";
import shareIcon from "../assets/icons/share.svg";
import trashIcon from "../assets/icons/trash.svg";
import { MemoManager } from "../logic/memo-manager";
import "./transcript";
import { showDialog } from "./modal/dialog";
import { dateTimeToString } from "../logic/time-util";

@customElement("memo-details")
export class MemoDetails extends LitElement {
	@property({ type: Object })
	memo?: Memo;

	#memoManager?: MemoManager;

	constructor() {
		super();
		MemoManager.instance.then((manager) => {
			this.#memoManager = manager;
		});
	}

	render() {
		if (!this.memo) {
			return html`Loading...`;
		}
		const date = new Date(this.memo.date);
		const dateStr = dateTimeToString(date);
		const hasTranscript =
			this.memo.transcript?.some((entry) => entry.text.length > 0) ?? false;
		const generatingTranscript = this.memo?.id
			? this.#memoManager?.getGeneratingTranscript(this.memo.id)
			: undefined;
		const transcriptElement = generatingTranscript
			? html`
					<memo-transcript
						.transcript=${generatingTranscript}
						generating
					></memo-transcript>
				`
			: hasTranscript
				? html`<memo-transcript
						.transcript=${this.memo.transcript}
					></memo-transcript>`
				: nothing;
		return html`<header>
				<h2>${dateStr}</h2>
				<div class="actions">
					${!!navigator.share
						? html`<button @click=${this.shareMemo}>
								<img src=${shareIcon} alt="Share" />
							</button>`
						: nothing}
					<button @click=${this.deleteMemo}>
						<img src=${trashIcon} alt="Delete" />
					</button>
				</div>
			</header>
			<div class="content">
				<audio src=${URL.createObjectURL(this.memo.audio)} controls></audio>
				${transcriptElement}
			</div>`;
	}

	async deleteMemo() {
		if (this.memo?.id) {
			const result = await showDialog(
				"Are you sure you want to delete this memo?",
				[{ text: "Delete" }, { text: "Cancel" }],
			);
			if (result === "Delete") {
				const manager = await MemoManager.instance;
				await manager.deleteMemo(this.memo.id);
			}
		} else {
		}
	}

	async shareMemo() {
		if (!navigator.share || !this.memo) {
			return;
		}
		const audio = this.memo.audio;
		const date = new Date(this.memo.date);
		const fileName = `memo-${date.toISOString()}`;
		const files = [new File([audio], fileName, { type: audio.type })];
		const text = this.memo.transcript?.map((entry) => entry.text).join("\n");
		const shareData = {
			title: `Memo ${dateTimeToString(date)}`,
			text,
			files,
		};
		console.log(shareData);
		await navigator.share(shareData);
	}

	static styles = css`
		:host {
			background-color: var(--color-card-bg);
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
				text-wrap: balance;
			}

			.actions {
				display: flex;
				gap: 0.3em;
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

				img {
					@media (prefers-color-scheme: light) {
						filter: invert(1);
					}
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
			font: inherit;
			margin: 0;
			background-color: var(--color-input-bg);
			padding: 0.5em 0.7em;
			border-radius: 0.5em;
			min-width: 0;
			white-space: pre-wrap;
			word-break: break-word;
		}
	`;
}
