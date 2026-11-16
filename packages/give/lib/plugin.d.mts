import type { PluginDescriptor, ResolvedPlugin } from "emdash";

import type { GiveLabels } from "./studio.mjs";

export interface GivePluginOptions {
	labels?: GiveLabels;
}

export function givePlugin(options?: GivePluginOptions): PluginDescriptor<GivePluginOptions>;
export function createPlugin(options?: GivePluginOptions): ResolvedPlugin;

export default createPlugin;
