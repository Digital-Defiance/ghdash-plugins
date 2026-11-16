import type { PortableTextBlockConfig } from "emdash";

export const donationBlockType: "gitdashDonation";
export const embeddedDonationBlockType: "gitdashEmbeddedDonation";

export interface GiveLabels {
	block?: string;
	embeddedBlock?: string;
	presets?: string;
	choices?: string;
	choice?: string;
	linkLabel?: string;
	linkUrl?: string;
}

export function giveStudioPlugin(labels?: GiveLabels): {
	id: "gitdash-give";
	version: string;
	admin: { portableTextBlocks: PortableTextBlockConfig[] };
};
