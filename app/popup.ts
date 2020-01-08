import { display, Display } from 'display';
import { addEventListener, Disposable, log } from '../common/system';
import { configuration } from './configuration';

interface ComboButtonElement extends Element, Styled {}

interface TumblerViewElement extends ContainerElement, Styled {
	value: number;
}

export class UnlockPopup implements Disposable {
	private readonly $button: ComboButtonElement;
	private readonly $tumblers: TumblerViewElement[];

	private readonly _code: number[];
	private _disposable: Disposable | undefined;

	constructor(private readonly $popup: GroupElement) {
		this._code = decode('MTIzNA==')
			.split('')
			.map(Number);

		this.$tumblers = [
			$popup.getElementById('popup-code-digit-1') as TumblerViewElement,
			$popup.getElementById('popup-code-digit-2') as TumblerViewElement,
			$popup.getElementById('popup-code-digit-3') as TumblerViewElement,
			$popup.getElementById('popup-code-digit-4') as TumblerViewElement
		];

		this.$button = $popup.getElementById('popup-code-button') as ComboButtonElement;
		this._disposable = Disposable.from(
			addEventListener(display, 'change', () => this.onDisplayChanged(display)),
			addEventListener(this.$button, 'click', () => this.onButtonClick())
		);
	}

	dispose() {
		this._disposable?.dispose();
	}

	@log('UnlockPopup')
	private onButtonClick() {
		if (this.$tumblers.every(($, index) => $.value === this._code[index])) {
			this.accept();
		} else {
			this.reject();
		}
	}

	@log('ActivityDisplay', {
		0: sensor => `on=${sensor.on}, aodActive=${sensor.aodActive}`
	})
	private onDisplayChanged(sensor: Display) {
		if (!sensor.on || sensor.aodActive) {
			this.hide(true);
		}
	}

	show() {
		this.$popup.style.display = 'inline';
		this.$popup.animate('load');
	}

	hide(immediate: boolean = false) {
		if (immediate) {
			this.$popup.style.display = 'none';

			return;
		}

		this.$popup.animate('unload');
	}

	private accept() {
		configuration.set('unlocked', true);
		this.hide();
	}

	private reject() {
		// Show an error state on the button for a short time
		this.$button.animate('enable');
	}
}

const decodeKey = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function decode(input: string) {
	input = input.replace(/[^A-Za-z0-9+/=]/g, '');

	let chr1: number;
	let chr2: number;
	let chr3: number;
	let enc1: number;
	let enc2: number;
	let enc3: number;
	let enc4: number;

	let output = '';

	let i = 0;
	while (i < input.length) {
		enc1 = decodeKey.indexOf(input.charAt(i++));
		enc2 = decodeKey.indexOf(input.charAt(i++));
		enc3 = decodeKey.indexOf(input.charAt(i++));
		enc4 = decodeKey.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		output += String.fromCharCode(chr1);

		if (enc3 != 64) {
			output += String.fromCharCode(chr2);
		}

		if (enc4 != 64) {
			output += String.fromCharCode(chr3);
		}
	}

	return output;
}
