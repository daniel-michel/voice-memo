import { noChange } from "lit";
import {
	directive,
	Directive,
	Part,
	PartInfo,
	PartType,
} from "lit/async-directive.js";

export class ObserveResize extends Directive {
	#resizeListener?: ResizeObserverCallback;
	#resizeCallback: ResizeObserverCallback = (entries, observer) => {
		if (this.#resizeListener) {
			this.#resizeListener(entries, observer);
		}
	};
	#currentElement?: Element;
	#observer: ResizeObserver = new ResizeObserver(this.#resizeCallback);

	constructor(partInfo: PartInfo) {
		super(partInfo);
		if (partInfo.type !== PartType.ELEMENT) {
			throw new Error("observeResize can only be used in element bindings");
		}
	}

	render(resizeListener: ResizeObserverCallback) {
		this.#resizeListener = resizeListener;
	}

	update(part: Part, props: [ResizeObserverCallback]) {
		this.#resizeListener = props[0];
		if (part.type === PartType.ELEMENT) {
			if (this.#currentElement !== part.element) {
				this.#observer.disconnect();
				this.#observer.observe(part.element);
			}
		} else {
			this.#observer.disconnect();
		}
		return noChange;
	}
}

export const observeResize = directive(ObserveResize);
