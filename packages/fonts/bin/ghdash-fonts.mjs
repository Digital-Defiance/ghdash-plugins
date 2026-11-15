#!/usr/bin/env node
// ghdash-fonts init   adds a "fonts" collection with one entry to a GHDash site's content/ folder
// ghdash-fonts build  downloads the chosen Google Fonts into public/fonts and writes public/fonts/fonts.css
const cmd = process.argv[2];
if (cmd === "init") await import("../lib/init.mjs");
else if (cmd === "build") await import("../lib/build.mjs");
else {
	console.error("usage: ghdash-fonts init | build");
	process.exit(1);
}
