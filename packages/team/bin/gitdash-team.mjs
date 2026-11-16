#!/usr/bin/env node
// gitdash-team: adds a "team" collection (fields and three sample members) to a GitDash site's content/ folder.
// Run from the site root: npx gitdash-team
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

const have = raw.selectValue("select count(*) from _emdash_collections where slug = 'team'");
if (!have) {
	await call("POST", "/schema/collections", {
		slug: "team",
		label: "Team",
		labelSingular: "Team member",
		supports: ["drafts", "revisions", "search"],
	});
	const fields = [
		{ slug: "title", label: "Name", type: "string", required: true, searchable: true },
		{ slug: "role", label: "Position", type: "string", searchable: true },
		{ slug: "department", label: "Department", type: "string" },
		{ slug: "photo", label: "Photo", type: "image" },
		{ slug: "hover_photo", label: "Photo shown on hover", type: "image" },
		{ slug: "bio", label: "Bio", type: "portableText", searchable: true },
		{ slug: "more_info", label: "More info (shown when expanded)", type: "portableText" },
		{ slug: "accent_color", label: "Accent color (e.g. #2a7de1)", type: "string" },
		{ slug: "order", label: "Order", type: "integer" },
		{ slug: "email", label: "Email", type: "string" },
		{ slug: "website", label: "Website", type: "string" },
		{ slug: "linkedin", label: "LinkedIn URL", type: "string" },
		{ slug: "github", label: "GitHub URL", type: "string" },
		{ slug: "twitter", label: "X / Twitter URL", type: "string" },
		{ slug: "mastodon", label: "Mastodon URL", type: "string" },
		{ slug: "instagram", label: "Instagram URL", type: "string" },
	];
	for (const f of fields) await call("POST", "/schema/collections/team/fields", f);
}

const sample = [
	["Ada Rivera", "Founder & Director", "Leadership", "Ada started the studio in 2019 and still reviews every project.", "Ada likes long walks and short meetings.", "#2a7de1", 1, "https://github.com/example"],
	["Ben Okafor", "Lead Developer", "Engineering", "Ben builds the sites and keeps the build green.", "Ben maintains our open source tools.", "#e1622a", 2, "https://github.com/example"],
	["Chen Wu", "Designer", "Design", "Chen designs the interfaces and the illustrations.", "", "#2ae17d", 3, ""],
];
const para = (text) => [{ _type: "block", _key: "b" + Math.random().toString(36).slice(2, 8), style: "normal", markDefs: [], children: [{ _type: "span", _key: "s" + Math.random().toString(36).slice(2, 8), text, marks: [] }] }];
for (const [name, role, department, bio, more, color, order, github] of sample) {
	const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	const exists = raw.selectValue("select count(*) from ec_team where slug = ? and deleted_at is null", [slug]);
	if (exists) continue;
	const data = { title: name, role, department, bio: para(bio), accent_color: color, order };
	if (more) data.more_info = para(more);
	if (github) data.github = github;
	const made = await call("POST", "/content/team", { data, slug, status: "draft" });
	await call("POST", `/content/team/${made.data.item.id}/publish`, {});
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
