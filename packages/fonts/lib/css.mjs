// Pure helpers: validate the settings, parse Google's CSS, and write the rules that apply the fonts.

const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 -]{0,60}$/;
const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(rgb|hsl)a?\([0-9.,%\s/]+\))$/;
const LENGTH = /^[0-9.]+(px|rem|em|%)?$/;
const ADOBE_KIT = /^[a-zA-Z0-9]{5,12}$/;
const ADOBE_FAMILY = /^[a-zA-Z0-9][a-zA-Z0-9 -]{0,60}$/;
const SELECTOR = /^[^{};@\\<>]+$/;
export const SUBSETS = ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "vietnamese"];
export const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];

const text = (v) => (typeof v === "string" ? v.trim() : "");

export function readSettings(row) {
	const warnings = [];
	const pick = (name, value, test, label) => {
		if (!value) return undefined;
		if (test(value)) return value;
		warnings.push(`${label} "${value}" is not valid and was ignored`);
		return undefined;
	};
	const family = (name, label) => pick(name, text(row[name]), (v) => FAMILY.test(v), label);
	const weights = [
		...new Set(
			text(row.weights || "400,700")
				.split(/[,\s]+/)
				.filter(Boolean),
		),
	].filter((w) => {
		const ok = /^[1-9]00$/.test(w);
		if (!ok) warnings.push(`weight "${w}" is not valid and was ignored`);
		return ok;
	});
	const subsets = text(row.subsets || "latin")
		.split(/[,\s]+/)
		.filter((s) => SUBSETS.includes(s));
	const custom = text(row.custom_selectors)
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean)
		.flatMap((line) => {
			const [selector, fam, weight] = line.split("|").map((p) => p.trim());
			if (!selector || !SELECTOR.test(selector) || !FAMILY.test(fam ?? "")) {
				warnings.push(`custom selector line "${line}" is not valid and was ignored`);
				return [];
			}
			return [{ selector, family: fam, weight: /^[1-9]00$/.test(weight ?? "") ? weight : undefined }];
		});
	const transform = text(row.heading_transform);
	const adobeKit = pick("adobe_kit", text(row.adobe_kit), (v) => ADOBE_KIT.test(v), "Adobe project ID");
	const adobeFamilies = text(row.adobe_families)
		.split(",")
		.map((f) => f.trim())
		.filter(Boolean)
		.filter((f) => {
			const ok = ADOBE_FAMILY.test(f);
			if (!ok) warnings.push(`Adobe font "${f}" is not valid and was ignored`);
			return ok;
		});
	return {
		settings: {
			headingFont: family("heading_font", "heading font"),
			bodyFont: family("body_font", "body font"),
			adobeKit,
			adobeFamilies,
			weights: weights.length ? weights : ["400", "700"],
			subsets: subsets.length ? subsets : ["latin"],
			headingWeight: pick("heading_weight", text(row.heading_weight), (v) => /^[1-9]00$/.test(v), "heading weight"),
			bodyWeight: pick("body_weight", text(row.body_weight), (v) => /^[1-9]00$/.test(v), "body weight"),
			baseSize: pick("base_size", text(row.base_size), (v) => LENGTH.test(v), "base size"),
			lineHeight: pick("line_height", text(row.line_height), (v) => /^[0-9.]+$/.test(v), "line height"),
			letterSpacing: pick("letter_spacing", text(row.letter_spacing), (v) => /^-?[0-9.]+(px|em|rem)$/.test(v), "letter spacing"),
			headingColor: pick("heading_color", text(row.heading_color), (v) => COLOR.test(v), "heading color"),
			bodyColor: pick("body_color", text(row.body_color), (v) => COLOR.test(v), "body color"),
			headingTransform: TRANSFORMS.includes(transform) ? transform : undefined,
			custom,
		},
		warnings,
	};
}

const FORMATS = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

// "Acme Sans-700-italic.woff2" -> family "Acme Sans", weight 700, italic. Returns undefined for anything else.
export function parseCustomFontName(file) {
	const m = /^([A-Za-z0-9][A-Za-z0-9 ]{0,60})-([1-9]00)(-italic)?\.(woff2|woff|ttf|otf)$/.exec(file);
	if (!m) return undefined;
	return { file, family: m[1], weight: m[2], style: m[3] ? "italic" : "normal", format: FORMATS[m[4]] };
}

export const customFaceCss = (faces) =>
	faces
		.map(
			(f) =>
				`@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(./custom-${encodeURIComponent(f.file)}) format('${f.format}');}`,
		)
		.join("\n");

// Fonts that come from Google, which are downloaded and served from the site.
export function families(settings, customFamilies = []) {
	const adobe = new Set([...settings.adobeFamilies, ...customFamilies].map((f) => f.toLowerCase()));
	return [...new Set([settings.headingFont, settings.bodyFont, ...settings.custom.map((c) => c.family)].filter(Boolean))].filter(
		(f) => !adobe.has(f.toLowerCase()),
	);
}

// Adobe's licence doesn't allow self-hosting, so their stylesheet is loaded from Adobe.
export function adobeImport(settings) {
	return settings.adobeKit ? `@import url("https://use.typekit.net/${settings.adobeKit}.css");\n` : "";
}

export function googleCssUrl(family, weights) {
	const name = family.replace(/ /g, "+");
	return weights?.length
		? `https://fonts.googleapis.com/css2?family=${name}:wght@${[...weights].sort().join(";")}&display=swap`
		: `https://fonts.googleapis.com/css2?family=${name}&display=swap`;
}

// Google's CSS puts a /* subset */ comment before each @font-face.
export function parseGoogleCss(css) {
	const faces = [];
	const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
	for (const m of css.matchAll(re)) {
		const body = m[2];
		const get = (prop) => new RegExp(`${prop}:\\s*([^;]+);`).exec(body)?.[1].trim();
		const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(body)?.[1];
		const family = get("font-family")?.replace(/['"]/g, "");
		if (!url || !family) continue;
		faces.push({
			subset: m[1],
			family,
			style: get("font-style") ?? "normal",
			weight: get("font-weight") ?? "400",
			range: get("unicode-range"),
			url,
		});
	}
	return faces;
}

export const fileName = (face) =>
	`${face.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${face.style}-${face.weight.replace(/\s+/g, "-")}-${face.subset}.woff2`;

export function fontFaceCss(faces) {
	return faces
		.map(
			(f) =>
				`@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(./${fileName(f)}) format('woff2');${f.range ? `unicode-range:${f.range};` : ""}}`,
		)
		.join("\n");
}

export function rulesCss(s) {
	const stack = (f) => `'${f}',system-ui,sans-serif`;
	const decl = (pairs) =>
		pairs
			.filter(([, v]) => v)
			.map(([k, v]) => `${k}:${v}`)
			.join(";");
	const out = [];
	const root = decl([
		...["gitdash", "ghdash"].flatMap((p) => [
			[`--${p}-body-font`, s.bodyFont && stack(s.bodyFont)],
			[`--${p}-heading-font`, (s.headingFont || s.bodyFont) && stack(s.headingFont || s.bodyFont)],
		]),
	]);
	if (root) out.push(`:root{${root}}`);
	const body = decl([
		["font-family", s.bodyFont && stack(s.bodyFont)],
		["font-weight", s.bodyWeight],
		["font-size", s.baseSize],
		["line-height", s.lineHeight],
		["color", s.bodyColor],
		["letter-spacing", s.letterSpacing],
	]);
	if (body) out.push(`body{${body}}`);
	const heading = decl([
		["font-family", s.headingFont && stack(s.headingFont)],
		["font-weight", s.headingWeight],
		["color", s.headingColor],
		["text-transform", s.headingTransform],
	]);
	if (heading) out.push(`h1,h2,h3,h4,h5,h6{${heading}}`);
	for (const c of s.custom) out.push(`${c.selector}{${decl([["font-family", stack(c.family)], ["font-weight", c.weight]])}}`);
	return out.join("\n");
}
