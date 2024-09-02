import {
	LitElement,
	PropertyDeclaration,
	PropertyValues,
	css,
	html,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { sleep } from "../../logic/async-util";

@customElement("dialog-modal")
export class DialogModal extends LitElement {
	@property({ type: String })
	text?: string;

	@property({ type: Array })
	options: {
		text: string;
		callback: () => void;
	}[] = [];

	@property({ type: Boolean })
	open = true;

	#dialogRef = createRef<HTMLDialogElement>();

	render() {
		const options = this.options.map(
			(option) => html`
				<button @click=${option.callback}>${option.text}</button>
			`,
		);
		return html`
			<dialog
				${ref(this.#dialogRef)}
				@cancel=${this.#preventCancel}
				@keydown=${this.#preventCancel}
			>
				<p>${this.text}</p>
				<div class="options">${options}</div>
			</dialog>
		`;
	}

	#preventCancel = (event: Event) => {
		event.preventDefault();
	};

	protected firstUpdated(_changedProperties: PropertyValues): void {
		super.firstUpdated(_changedProperties);
		if (this.open) {
			this.#dialogRef.value?.showModal();
		}
	}

	requestUpdate(
		name?: PropertyKey,
		oldValue?: unknown,
		options?: PropertyDeclaration,
	): void {
		super.requestUpdate(name, oldValue, options);
		try {
			if (name === "open" && this.open !== undefined && this.#dialogRef.value) {
				if (this.open) {
					this.#dialogRef.value.showModal();
				} else {
					this.#dialogRef.value.close();
				}
			}
		} catch (error) {}
	}

	static styles = css`
		dialog {
			background-color: var(--color-modal-bg);
			border: none;
			border-radius: 1em;
			padding: 0em;
			transition-property: opacity, scale, overlay, display;
			transition-duration: 0.3s;
			transition-behavior: allow-discrete;

			opacity: 0;
			scale: 0.8;

			&::backdrop {
				backdrop-filter: blur(0.3em);
				transition-property: opacity display;
				transition-duration: 0.3s;
				transition-behavior: allow-discrete;

				opacity: 0;
			}
		}

		dialog[open] {
			opacity: 1;
			scale: 1;

			&::backdrop {
				opacity: 1;
			}

			@starting-style {
				opacity: 0;
				scale: 0.8;

				&::backdrop {
					opacity: 0;
				}
			}
		}

		p {
			margin: 1.5em;
			margin-bottom: 0em;
		}

		.options {
			padding: 1.5em;
			display: flex;
			flex-direction: row-reverse;
			justify-content: right;
			overflow-x: auto;
			gap: 1em;
		}

		button {
			font: inherit;
			padding: 0.5em 1em;
			background-color: var(--color-input-bg);
			/* color: ; */
			border: none;
			border-radius: 2em;
		}
		button:first-child {
			background-color: var(--color-primary);
			color: var(--color-text-on-primary);
		}
	`;
}

export async function showDialog<const Option extends string>(
	text: string,
	options: {
		text: Option;
		callback?: () => void;
	}[],
) {
	const dialog = new DialogModal();
	return new Promise<Option>((resolve) => {
		dialog.text = text;
		const close = async () => {
			dialog.open = false;
			await sleep(1_000);
			document.body.removeChild(dialog);
		};
		dialog.options = options.map((option) => ({
			...option,
			callback: () => {
				if (!dialog.open) {
					return;
				}
				resolve(option.text);
				option.callback?.();
				close();
			},
		}));
		document.body.append(dialog);
	});
}
