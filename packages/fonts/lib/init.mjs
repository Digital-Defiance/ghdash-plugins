// gitdash-fonts init: adds the "fonts" collection and one entry to content/ through the browser API.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// The adapter was called ghdash-pages before the GitDash rename.
const ADAPTERS = ["gitdash-pages", "ghdash-pages"];
const pagesDir = ADAPTERS.map((n) => resolve(`node_modules/@digitaldefiance/${n}`)).find((d) => existsSync(d)) ?? resolve("node_modules/@digitaldefiance/gitdash-pages");
const bin = ADAPTERS.map((n) => join(pagesDir, `bin/${n}.mjs`)).find((f) => existsSync(f));
for (const cmd of ["build-db", "fetch-browser-api", "studio-assets"]) {
	const r = spawnSync(process.execPath, [bin, cmd], { stdio: "inherit" });
	if (r.status !== 0) process.exit(r.status ?? 1);
}
const require = createRequire(resolve("package.json"));
const sqlite3InitModule = (await import(pathToFileURL(require.resolve("@sqlite.org/sqlite-wasm")).href)).default;
const api = await import(pathToFileURL(resolve("public/studio-api/entry.js")).href);
const studioDir = join(pagesDir, "studio");
const { openDb } = await import(pathToFileURL(join(studioDir, "load-db.js")).href);
const { snapshot, filesFromContent, diffFiles } = await import(pathToFileURL(join(studioDir, "tray.js")).href);

const sqlite = await sqlite3InitModule({ print() {}, printErr() {} });
const content = JSON.parse(readFileSync("public/studio-data/content.json", "utf8"));
const { db: raw, database, freshNames } = openDb(sqlite, readFileSync("public/studio-data/empty.db"), content);
const baseFiles = filesFromContent(content);
const db = new api.Kysely({ dialect: new api.SqliteDialect({ database }) });
const fetchApi = api.createBrowserApi({ db, apiBase: "/_api", user: { id: "team", email: "team@users.noreply.github.com", name: "Team" } });
const call = async (method, path, body) => {
	const res = await fetchApi(`https://team.local/_api${path}`, {
		method,
		headers: { "content-type": "application/json", "x-emdash-request": "1" },
		body: body && JSON.stringify(body),
	});
	const json = await res.json();
	if (!json.success) throw new Error(`${method} ${path}: ${json.error?.message}`);
	return json;
};

const have = raw.selectValue("select count(*) from _emdash_collections where slug = 'fonts'");
if (!have) {
	await call("POST", "/schema/collections", {
		slug: "fonts",
		label: "Fonts",
		labelSingular: "Font settings",
		supports: ["drafts", "revisions"],
	});
}
{
	const weight = (slug, label) => ({ slug, label, type: "select", validation: { options: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] } });
	const fields = [
		{ slug: "title", label: "Name", type: "string", required: true },
		{ slug: "body_font", label: "Body font (Google Fonts family, e.g. Inter)", type: "string" },
		{ slug: "heading_font", label: "Heading font (leave empty to use the body font)", type: "string" },
		{ slug: "weights", label: "Weights to download (e.g. 400,700)", type: "string" },
		{ slug: "subsets", label: "Character sets (latin, latin-ext, cyrillic, greek, vietnamese)", type: "string" },
		weight("body_weight", "Body weight"),
		weight("heading_weight", "Heading weight"),
		{ slug: "base_size", label: "Base font size (e.g. 18px or 1.125rem)", type: "string" },
		{ slug: "line_height", label: "Line height (e.g. 1.6)", type: "string" },
		{ slug: "letter_spacing", label: "Letter spacing (e.g. 0.01em)", type: "string" },
		{ slug: "body_color", label: "Body text color", type: "string" },
		{ slug: "heading_color", label: "Heading color", type: "string" },
		{ slug: "heading_transform", label: "Heading case", type: "select", validation: { options: ["none", "uppercase", "lowercase", "capitalize"] } },
		{ slug: "adobe_kit", label: "Adobe Fonts web project ID (optional; loads from Adobe, not your site)", type: "string" },
		{ slug: "adobe_families", label: "Fonts that come from Adobe, comma separated (e.g. proxima-nova)", type: "string" },
		{ slug: "custom_selectors", label: "Other elements: one per line as  selector | Font family | weight", type: "text" },
	];
	const known = (slug) =>
		raw.selectValue(
			"select count(*) from _emdash_fields f join _emdash_collections c on c.id = f.collection_id where c.slug = 'fonts' and f.slug = ?",
			[slug],
		) > 0;
	for (const f of fields) if (!known(f.slug)) await call("POST", "/schema/collections/fonts/fields", f);
}

const exists = raw.selectValue("select count(*) from ec_fonts where deleted_at is null");
if (!exists) {
	const made = await call("POST", "/content/fonts", {
		data: { title: "Site fonts", body_font: "Inter", heading_font: "Inter", weights: "400,700", subsets: "latin", heading_weight: "700" },
		slug: "site-fonts",
		status: "draft",
	});
	await call("POST", `/content/fonts/${made.data.item.id}/publish`, {});
}

let written = 0;
const after = snapshot(raw, freshNames);
for (const change of diffFiles(baseFiles, after)) {
	const text = after.get(change.path);
	if (text === undefined) continue;
	mkdirSync(dirname(join("content", change.path)), { recursive: true });
	writeFileSync(join("content", change.path), text);
	written++;
}
console.log(`wrote ${written} file(s) in content/`);
