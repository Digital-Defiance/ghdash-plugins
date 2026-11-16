import packageJson from "../package.json" with { type: "json" };

export const donationBlockType = "gitdashDonation";
export const embeddedDonationBlockType = "gitdashEmbeddedDonation";

export function giveStudioPlugin(labels = {}) {
	return {
		id: "gitdash-give",
		version: packageJson.version,
		admin: {
			portableTextBlocks: [
				{
					type: donationBlockType,
					label: labels.block ?? "Donation choices",
					icon: "link-external",
					fields: [
						{
							type: "repeater",
							action_id: "choices",
							label: labels.choices ?? "Checkout links",
							item_label: labels.choice ?? "checkout link",
							min_items: 1,
							fields: [
								{
									type: "text_input",
									action_id: "label",
									label: labels.linkLabel ?? "Link text",
								},
								{
									type: "text_input",
									action_id: "url",
									label: labels.linkUrl ?? "Stripe Payment Link or PayPal Donate URL",
								},
							],
						},
					],
				},
				{
					type: embeddedDonationBlockType,
					label: labels.embeddedBlock ?? "Embedded Stripe donation",
					icon: "credit-card",
					fields: [
						{
							type: "text_input",
							action_id: "presets",
							label: labels.presets ?? "Preset amounts in USD, separated by commas",
							placeholder: "10, 25, 50, 100, 250, 500",
						},
					],
				},
			],
		},
	};
}
