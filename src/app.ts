import { LitElement, css, html } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { customElement, property } from "lit/decorators.js";
import { choose } from "lit/directives/choose.js";
import "./view/memo-recorder";
import "./view/memo-overview";

@customElement("app-root")
export class App extends LitElement {
	@property({ type: String })
	tab: "record" | "memos" = "record";

	tabs = [
		{
			name: "record",
			label: "Record",
		},
		{
			name: "memos",
			label: "Memos",
		},
	];

	render() {
		return html`
			<main>
				${choose(this.tab, [
					["record", () => html`<memo-recorder></memo-recorder>`],
					["memos", () => html`<memo-overview></memo-overview>`],
				])}
			</main>
			<nav>
				${this.tabs.map(
					(tab) => html`
						<button
							@click=${() => (this.tab = tab.name as any)}
							class=${classMap({ active: this.tab === tab.name })}
						>
							${tab.label}
						</button>
					`,
				)}
			</nav>
		`;
	}

	static styles = css`
		:host {
			background-color: var(--color-bg);
			height: 100%;
			display: grid;
			grid-template-rows: 1fr auto;
		}

		main {
			min-height: 0;
			display: grid;
		}

		nav {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			background-color: #141414;

			button {
				font-size: 1.5rem;
				background-color: transparent;
				border: none;
				padding: 0.8em;
				cursor: pointer;

				&.active {
					background-color: var(--color-theme-bg);
					color: var(--color-theme-text);
				}
			}
		}
	`;
}
