import * as fs from 'fs';
import { MessageEvent, peerSocket } from 'messaging';
import { Config, defaultConfig, emptyConfig } from '../common/config';
import { debounce, Event, EventEmitter, log } from '../common/system';

export interface ConfigChanged {
	key: keyof Config;
}

class Configuration {
	private readonly _onDidChange = new EventEmitter<ConfigChanged>();
	get onDidChange(): Event<any> {
		return this._onDidChange.event;
	}

	private _config: Config;

	constructor() {
		this._config = this.load() ?? { ...emptyConfig };

		peerSocket.addEventListener('message', e => this.onMessageReceived(e));
	}

	@log('Configuration', {
		0: e => `key=${e.data.key}, value=${e.data.value}`
	})
	private onMessageReceived(e: MessageEvent) {
		if (e.data.key != null && this._config[e.data.key] === e.data.value) return;

		// If the key is `null` assume a reset
		if (e.data.key == null) {
			this._config = {
				...emptyConfig,
				unlocked: this._config.unlocked
			};
		} else {
			this._config[e.data.key] = e.data.value;
		}

		this.save();
		this._onDidChange.fire({ key: e.data.key });
	}

	get<T extends keyof Config>(key: T): NonNullable<Config[T]> {
		return (this._config[key] ?? defaultConfig[key]) as NonNullable<Config[T]>;
	}

	set<T extends keyof Config>(key: T, value: Config[T]): void {
		if (this._config[key] === value) return;

		this._config[key] = value;

		// TODO: To get this to work for companion exposed settings, need to send a message to the companion
		this.save();
		this._onDidChange.fire({ key: key });
	}

	@log('Configuration')
	private load(): Config | undefined {
		try {
			const config = fs.readFileSync('pure.settings', 'json') as Config;
			// console.log(`Configuration.load: loaded; json=${JSON.stringify(config)}`);
			return config;
		} catch (ex) {
			// console.log(`Configuration.load: failed; ex=${ex}`);
			return undefined;
		}
	}

	@debounce(500)
	@log('Configuration')
	private save() {
		try {
			fs.writeFileSync('pure.settings', this._config, 'json');
			// console.log(`Configuration.save: saved; json=${JSON.stringify(this._config)}`);
		} catch (ex) {
			console.log(`Configuration.save: failed; ex=${ex}`);
		}
	}
}

export const configuration = new Configuration();
