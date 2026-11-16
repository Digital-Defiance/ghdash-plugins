import assert from "node:assert/strict";
import { test } from "node:test";
import { adobeImport, customFaceCss, parseCustomFontName, families, fileName, fontFaceCss, googleCssUrl, parseGoogleCss, readSettings, rulesCss } from "../lib/css.mjs";

const GOOGLE = `/* cyrillic */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/aaa.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/bbb.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}`;

test("parses Google's CSS into one face per character set", () => {
	const faces = parseGoogleCss(GOOGLE);
	assert.deepEqual(faces.map((f) => f.subset), ["cyrillic", "latin"]);
	assert.equal(faces[1].url, "https://fonts.gstatic.com/s/inter/v20/bbb.woff2");
	assert.equal(fileName(faces[1]), "inter-normal-400-latin.woff2");
	assert.match(fontFaceCss([faces[1]]), /src:url\(\.\/inter-normal-400-latin\.woff2\) format\('woff2'\)/);
});

test("builds the Google Fonts URL with sorted weights", () => {
	assert.equal(googleCssUrl("Open Sans", ["700", "400"]), "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap");
});

test("applies body and heading settings, falling back to the body font for headings", () => {
	const { settings } = readSettings({ body_font: "Lora", base_size: "18px", heading_transform: "uppercase", heading_color: "#123456" });
	const css = rulesCss(settings);
	assert.match(css, /body\{font-family:'Lora',system-ui,sans-serif;font-size:18px\}/);
	assert.match(css, /h1,h2,h3,h4,h5,h6\{color:#123456;text-transform:uppercase\}/);
	assert.match(css, /--gitdash-heading-font:'Lora'/);
	assert.match(css, /--ghdash-heading-font:'Lora'/);
});

test("rejects values that could break out of the stylesheet", () => {
	const { settings, warnings } = readSettings({
		body_font: "Inter'; } body { display:none",
		heading_color: "red; } * { display:none",
		base_size: "1px;}",
		weights: "400,bold",
		custom_selectors: "h1 { color:red } | Inter\n.quote | Lora | 300\nnav a | Inter'x",
	});
	assert.equal(settings.bodyFont, undefined);
	assert.equal(settings.headingColor, undefined);
	assert.equal(settings.baseSize, undefined);
	assert.deepEqual(settings.weights, ["400"]);
	assert.deepEqual(settings.custom, [{ selector: ".quote", family: "Lora", weight: "300" }]);
	assert.equal(warnings.length, 6);
	assert.deepEqual(families(settings), ["Lora"]);
	assert.doesNotMatch(rulesCss(settings), /display:none/);
});

test("Adobe fonts load from Adobe and are not downloaded from Google", () => {
	const { settings, warnings } = readSettings({ body_font: "Lora", heading_font: "proxima-nova", adobe_kit: "abc1def", adobe_families: "proxima-nova" });
	assert.deepEqual(families(settings), ["Lora"]);
	assert.equal(adobeImport(settings), '@import url("https://use.typekit.net/abc1def.css");\n');
	assert.match(rulesCss(settings), /h1,h2,h3,h4,h5,h6\{font-family:'proxima-nova'/);
	assert.deepEqual(warnings, []);
});

test("an invalid Adobe project ID is ignored", () => {
	const { settings, warnings } = readSettings({ adobe_kit: "x/../y" });
	assert.equal(adobeImport(settings), "");
	assert.equal(warnings.length, 1);
});

test("reads the family, weight and style from a custom font file name", () => {
	assert.deepEqual(parseCustomFontName("Acme Sans-700-italic.woff2"), { file: "Acme Sans-700-italic.woff2", family: "Acme Sans", weight: "700", style: "italic", format: "woff2" });
	assert.equal(parseCustomFontName("Acme-bold.woff2"), undefined);
	assert.equal(parseCustomFontName("Acme-400.exe"), undefined);
	assert.match(customFaceCss([parseCustomFontName("Acme Sans-400.ttf")]), /src:url\(\.\/custom-Acme%20Sans-400\.ttf\) format\('truetype'\)/);
});

test("custom fonts are not looked up on Google", () => {
	const { settings } = readSettings({ body_font: "Acme Sans", heading_font: "Lora" });
	assert.deepEqual(families(settings, ["Acme Sans"]), ["Lora"]);
});
