import { checkoutChoices } from "./checkout.mjs";
import { donationBlockType, embeddedDonationBlockType } from "./studio.mjs";

const formId = /^[1-9]\d*$/;
const shortcode = /^\[give_form\b([^\]]*?)\/?\](?:\s*\[\/give_form\])?$/i;
const shortcodeAttribute = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
const escapedFormId = /^\\(["'])([1-9]\d*)\\\1$/;

function shortcodeText(block) {
	if (block?._type === "htmlBlock" && block.originalBlockName === "core/shortcode") {
		return typeof block.html === "string" ? block.html : "";
	}

	if (
		block?._type !== "block" ||
		(block.style && block.style !== "normal") ||
		block.listItem ||
		!Array.isArray(block.children) ||
		block.children.some(
			(span) => span?._type !== "span" || typeof span.text !== "string" || span.marks?.length,
		)
	) {
		return "";
	}

	return block.children.map((span) => span.text).join("");
}

function findFormId(block) {
	if (block?._type === "htmlBlock" && block.originalBlockName === "givewp/donation-form") {
		const id = String(block.originalAttrs?.formId ?? "");
		return formId.test(id) ? id : null;
	}

	const match = shortcode.exec(shortcodeText(block).trim());
	if (!match) return null;

	for (const [, attribute, doubleQuoted, singleQuoted, unquoted] of match[1].matchAll(shortcodeAttribute)) {
		if (attribute.toLowerCase() !== "id") continue;
		const id = doubleQuoted ?? singleQuoted ?? unquoted.replace(escapedFormId, "$2");
		return formId.test(id) ? id : null;
	}
	return null;
}

export function migrateGiveWpBlocks(blocks, forms) {
	const unresolvedFormIds = new Set();
	const content = blocks.map((block) => {
		const id = findFormId(block);
		if (!id) return block;

		const settings = Object.hasOwn(forms, id) ? forms[id] : undefined;
		const key = block._key === undefined ? {} : { _key: block._key };
		if (settings?.embeddedStripe === true) {
			return { _type: embeddedDonationBlockType, ...key, presets: settings.presets ?? "" };
		}
		const choices = checkoutChoices(settings);
		if (choices.length === 0) {
			unresolvedFormIds.add(id);
			return block;
		}

		return {
			_type: donationBlockType,
			...key,
			choices,
		};
	});

	return { content, unresolvedFormIds: [...unresolvedFormIds] };
}
