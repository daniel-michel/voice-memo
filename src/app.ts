import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import arrowDown from "./assets/arrow-down.svg";
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
			height: 100%;
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
			height: 100vh;
			min-height: 100vh;
			display: grid;
			grid-template-rows: auto 1fr;

			img {
				place-self: center;
				width: 2em;
			}
		}
	`;
}
