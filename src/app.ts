import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import arrowDown from "./assets/icons/arrow-down.svg";
import "./view/memo-recorder";
import "./view/memo-overview";

@customElement("app-root")
export class App extends LitElement {
	render() {
		return html`
			<main>
				<div class="main">
					<img src=${arrowDown} alt="Scroll down" />
					<memo-recorder></memo-recorder>
				</div>
				<div class="scroll-back">
					<memo-overview></memo-overview>
				</div>
			</main>
		`;
	}

	static styles = css`
		:host {
			display: blocK;
			height: 100%;
			width: 100%;
			container-type: size;
		}

		main {
			display: flex;
			height: 100%;
			scroll-snap-type: y mandatory;
			overflow: auto;
			flex-direction: column-reverse;

			> * {
				scroll-snap-align: start;
			}
		}

		.main {
			height: 100cqh;
			min-height: 100cqh;
			display: grid;
			grid-template-rows: auto 1fr;

			img {
				place-self: center;
				width: 2em;

				@media (prefers-color-scheme: light) {
					filter: invert(1);
				}
			}
		}
	`;
}
