import type { CheckoutChoice } from "./checkout.mjs";

interface DonationBlock {
	_type: "gitdashDonation";
	_key?: string;
	choices: CheckoutChoice[];
}

interface EmbeddedStripeOptions {
	embeddedStripe: true;
	presets?: string;
}

interface EmbeddedDonationBlock {
	_type: "gitdashEmbeddedDonation";
	_key?: string;
	presets: string;
}

export function migrateGiveWpBlocks<T extends { _key?: string }>(
	blocks: readonly T[],
	forms: Readonly<Record<string, readonly CheckoutChoice[]>>,
): {
	content: (T | DonationBlock)[];
	unresolvedFormIds: string[];
};

export function migrateGiveWpBlocks<T extends { _key?: string }>(
	blocks: readonly T[],
	forms: Readonly<Record<string, readonly CheckoutChoice[] | EmbeddedStripeOptions>>,
): {
	content: (T | DonationBlock | EmbeddedDonationBlock)[];
	unresolvedFormIds: string[];
};
