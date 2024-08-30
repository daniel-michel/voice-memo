import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Memo } from "../logic/memo";
import { MemoManager } from "../logic/memo-manager";
import "./memo-details";
import { repeat } from "lit/directives/repeat.js";

@customElement("memo-overview")
export class MemoOverview extends LitElement {
	selectedMemo?: Memo;

	memos?: Memo[];

	constructor() {
		super();
		this.init();
	}

	async init() {
		const manager = await MemoManager.instance;
		manager.addEventListener("change", () => {
			this.updateMemos();
		});
		await this.updateMemos();
	}

	render() {
		if (!this.memos) {
			return html`<div class="loading">Loading...</div>`;
		}
		if (this.memos.length === 0) {
			return html`<div class="none">Your memos will appear here</div>`;
		}
		return html`<div class="list">
			${repeat(
				this.memos,
				(memo) => memo.id,
				(memo) =>
					html`<div class="memo-item">
						<memo-details .memo=${memo}></memo-details>
					</div>`,
			)}
		</div>`;
	}

	async updateMemos() {
		const manager = await MemoManager.instance;
		this.memos = await manager.getMemos();
		this.memos.sort((a, b) => a.date - b.date);
		this.requestUpdate();
	}

	static styles = css`
		:host {
			display: block;
			height: 100%;
			overflow: auto;
		}

		.loading,
		.none {
			display: grid;
			place-content: center;
			padding: 1em;
		}

		.loading {
			animation: pulse 1s backwards ease-in-out infinite alternate;
			animation-delay: 0.5s;
		}

		@keyframes pulse {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		.list {
			display: grid;
			padding: 1em;
			gap: 1em;
		}
	`;
}
