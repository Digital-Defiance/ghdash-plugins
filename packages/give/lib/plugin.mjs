import { definePlugin } from "emdash";

import { giveStudioPlugin } from "./studio.mjs";

export function givePlugin({ labels } = {}) {
	const { id, version } = giveStudioPlugin();
	return {
		id,
		version,
		entrypoint: "@digitaldefiance/gitdash-give",
		componentsEntry: "@digitaldefiance/gitdash-give/astro",
		options: { labels },
	};
}

export function createPlugin({ labels } = {}) {
	return definePlugin(giveStudioPlugin(labels));
}

export default createPlugin;
