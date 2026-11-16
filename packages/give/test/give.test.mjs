import assert from "node:assert/strict";
import { test } from "node:test";

import { checkoutChoices } from "../lib/checkout.mjs";
import { donationBlockType, embeddedDonationBlockType, giveStudioPlugin } from "../lib/studio.mjs";
import { migrateGiveWpBlocks } from "../lib/wordpress.mjs";

const stripe = "https://buy.stripe.com/test_example";
const paypal = "https://www.paypal.com/donate/?hosted_button_id=EXAMPLE";
const choices = [
	{ label: "Give $25", url: stripe },
	{ label: "Choose an amount with PayPal", url: paypal },
];

function paragraph(text, key = "paragraph") {
	return {
		_type: "block",
		_key: key,
		style: "normal",
		children: [{ _type: "span", text, marks: [] }],
		markDefs: [],
	};
}

test("renders valid checkout choices in author order and filters duplicate links", () => {
	const links = checkoutChoices([
		{ label: "  Give $25  ", url: ` ${stripe} ` },
		{ label: "Duplicate", url: stripe },
		{ label: "   ", url: "https://buy.stripe.com/test_blank" },
		null,
		choices[1],
	]);
	assert.deepEqual(links, choices);
	assert.deepEqual(checkoutChoices({ choices }), []);
});

test("filters URLs that are outside the supported checkout pages", () => {
	const invalidUrls = [
		"/donate",
		"javascript:alert(1)",
		"http://buy.stripe.com/test_example",
		"https://buy.stripe.com.evil.example/test_example",
		"https://donate.stripe.com.evil.example/test_example",
		"https://buy.stripe.com@evil.example/test_example",
		"https://user@buy.stripe.com/test_example",
		"https://buy.stripe.com:444/test_example",
		"https://buy.stripe.com/test_example?prefilled_email=donor%40example.com",
		"https://buy.stripe.com/test_example#fragment",
		"https://buy.stripe.com/test_example/more",
		"https://www.paypal.com/signin?hosted_button_id=EXAMPLE",
		"https://www.paypal.com/donate",
		`${paypal}&hosted_button_id=OTHER`,
		`${paypal}&return=https://evil.example`,
	];
	assert.deepEqual(
		checkoutChoices(invalidUrls.map((url) => ({ label: "Donate", url }))),
		[],
	);
});

test("accepts Stripe-hosted donation links", () => {
	const choice = { label: "Choose your own amount", url: "https://donate.stripe.com/test_example" };
	assert.deepEqual(checkoutChoices([choice]), [choice]);
});

test("allows PayPal's sandbox for a checkout smoke test", () => {
	const sandbox = { label: "Donate", url: paypal.replace("www.paypal", "www.sandbox.paypal") };
	assert.deepEqual(checkoutChoices([sandbox]), [sandbox]);
});

test("the studio registers the same block and choices that the migration creates", () => {
	const studio = giveStudioPlugin({ block: "Spenden", linkLabel: "Linktext" });
	const [block] = studio.admin.portableTextBlocks;
	const [choiceList] = block.fields;
	const migrated = migrateGiveWpBlocks([paragraph('[give_form id="1027"]')], {
		1027: choices,
	});

	assert.deepEqual(JSON.parse(JSON.stringify(studio)), studio);
	assert.equal(block.type, migrated.content[0]._type);
	assert.deepEqual(migrated.content[0][choiceList.action_id], choices);
	assert.equal(block.label, "Spenden");
	assert.equal(choiceList.fields[0].label, "Linktext");
});

test("replaces the form on the Donate page and preserves surrounding blocks and keys", () => {
	const intro = paragraph("Support the work.", "intro");
	const form = paragraph('[give_form id="1027"]', "form");
	const outro = paragraph("Thank you.", "outro");

	const result = migrateGiveWpBlocks([intro, form, outro], { 1027: choices });

	assert.deepEqual(result, {
		content: [intro, { _type: donationBlockType, _key: "form", choices }, outro],
		unresolvedFormIds: [],
	});
	assert.equal(result.content[0], intro);
	assert.equal(result.content[2], outro);
	assert.deepEqual(migrateGiveWpBlocks(result.content, { 1027: choices }), result);
	assert.equal(form.children[0].text, '[give_form id="1027"]');
});

test("recognizes Gutenberg's GiveWP block and imported shortcode blocks", () => {
	const blocks = [
		{
			_type: "htmlBlock",
			_key: "gutenberg",
			originalBlockName: "givewp/donation-form",
			originalAttrs: { formId: "1027" },
		},
		{
			_type: "htmlBlock",
			_key: "shortcode",
			originalBlockName: "core/shortcode",
			html: "[give_form display_style='button' id='1027' /]",
		},
		paragraph("[give_form id=1027/]", "unquoted"),
	];
	const result = migrateGiveWpBlocks(blocks, { 1027: choices });
	assert.deepEqual(
		result.content,
		blocks.map(({ _key }) => ({ _type: donationBlockType, _key, choices })),
	);
	assert.deepEqual(result.unresolvedFormIds, []);
});

test("reports unresolved form IDs once and leaves inline or unrelated content intact", () => {
	const blocks = [
		paragraph("[give_form id=12]"),
		paragraph("[give_form id=12]"),
		paragraph("[give_form id=34]"),
		paragraph('Read about [give_form id="56"] for documentation.'),
		paragraph("[give_receipt]"),
		paragraph('[give_form title="See id=56 for reference"]'),
		{ _type: "htmlBlock", originalBlockName: "give/donor-dashboard" },
	];
	const result = migrateGiveWpBlocks(blocks, { 34: [{ label: "Donate", url: "/donate" }] });
	assert.deepEqual(result, { content: blocks, unresolvedFormIds: ["12", "34"] });
});

test("migrates an imported shortcode split across spans with escaped quotes", () => {
	const block = paragraph("", "imported");
	block.children = ["[", "give", "_", String.raw`form id=\"1027\"`, "]"].map((text) => ({
		_type: "span",
		text,
		marks: [],
	}));

	assert.deepEqual(migrateGiveWpBlocks([block], { 1027: choices }), {
		content: [{ _type: donationBlockType, _key: "imported", choices }],
		unresolvedFormIds: [],
	});
});

test("migrates an existing GiveWP form to the embedded Stripe Studio block", () => {
	const presets = "10, 25, 100";
	const result = migrateGiveWpBlocks([paragraph("[give_form id=1027]", "give")], {
		1027: { embeddedStripe: true, presets },
	});
	assert.deepEqual(result, {
		content: [{ _type: embeddedDonationBlockType, _key: "give", presets }],
		unresolvedFormIds: [],
	});
	assert.equal(
		giveStudioPlugin().admin.portableTextBlocks.find((block) => block.type === embeddedDonationBlockType).fields[0].action_id,
		"presets",
	);
});
