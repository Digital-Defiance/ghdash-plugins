import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { adobeImport, families, fileName, fontFaceCss, googleCssUrl, parseGoogleCss, readSettings, rulesCss } from "./css.mjs";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const out = "public/fonts";
const dir = "content/ec_fonts";

function findRow() {
	if (!existsSync(dir)) return undefined;
	return readdirSync(dir)
		.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
		.filter((r) => r.status === "published" && !r.deleted_at)
		.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
}

async function get(url, binary) {
	const res = await fetch(url, { headers: { "user-agent": UA } });
	if (!res.ok) return { status: res.status };
	return { status: 200, body: binary ? Buffer.from(await res.arrayBuffer()) : await res.text() };
}

rmSync(out, { recursive: true, force: true });
const row = findRow();
if (!row) {
	console.log("ghdash-fonts: no published entry in the fonts collection, skipping");
	process.exit(0);
}
const { settings, warnings } = readSettings(row);
for (const w of warnings) console.warn("ghdash-fonts: WARNING:", w);

mkdirSync(out, { recursive: true });
const faces = [];
for (const family of families(settings)) {
	let res = await get(googleCssUrl(family, settings.weights));
	if (res.status === 400) res = await get(googleCssUrl(family));
	if (res.status !== 200) {
		console.warn(`ghdash-fonts: WARNING: could not find "${family}" on Google Fonts (HTTP ${res.status}); skipped`);
		continue;
	}
	const parsed = parseGoogleCss(res.body).filter((f) => settings.subsets.includes(f.subset));
	for (const face of parsed) {
		const file = await get(face.url, true);
		if (file.status !== 200) throw new Error(`could not download ${face.url}`);
		writeFileSync(join(out, fileName(face)), file.body);
		faces.push(face);
	}
	console.log(`ghdash-fonts: ${family}: ${parsed.length} file(s)`);
}
writeFileSync(join(out, "fonts.css"), `${adobeImport(settings)}${fontFaceCss(faces)}\n${rulesCss(settings)}\n`);
console.log(`ghdash-fonts: wrote ${out}/fonts.css with ${faces.length} font file(s)`);
