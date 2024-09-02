import { LitElement, css, html } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property } from "lit/decorators.js";
import { sleep } from "../../logic/async-util";

@customElement("toast-modal")
export class ToastModal extends LitElement {
	@property({ type: String })
	text?: string;

	@property({ type: Number })
	progress?: number;

	@property({ type: Boolean })
	open = true;

	render() {
		return html`
			<dialog ?open=${this.open}>
				<p>${this.text}</p>
				${this.progress
					? html`<div
							class="progress"
							style=${styleMap({
								"--progress": this.progress,
							})}
						></div>`
					: ""}
			</dialog>
		`;
	}

	static styles = css`
		dialog {
			background-color: var(--color-modal-bg);
			border: none;
			border-radius: 0.5em;
			padding: 0.8em 1em;
			position: fixed;
			bottom: 0;
			right: 0;
			margin: 1em;
			box-shadow: 0 0 2em rgba(0, 0, 0, 0.4);
			transition-property: opacity, scale, overlay, display;
			transition-duration: 0.3s;
			transition-behavior: allow-discrete;

			opacity: 0;
			scale: 0.8;
		}

		dialog[open] {
			opacity: 1;
			scale: 1;

			@starting-style {
				opacity: 0;
				scale: 0.8;
			}
		}

		p {
			margin: 0;
		}

		.progress {
			height: 0.5em;
			background-color: var(--color-bg);
			border-radius: 1em;
			margin-top: 0.5em;
			width: 100%;
			overflow: hidden;

			&::after {
				content: "";
				display: block;
				background-color: var(--color-primary);
				width: calc(var(--progress, 0) * 100%);
				height: 100%;
				border-radius: 1em;
			}
		}
	`;
}

export function showToast(text: string) {
	const toast = new ToastModal();
	toast.text = text;
	document.body.append(toast);

	const close = async () => {
		if (!toast.open) {
			return;
		}
		toast.open = false;
		await sleep(1_000);
		document.body.removeChild(toast);
	};
	return {
		toast,
		close,
	};
}
