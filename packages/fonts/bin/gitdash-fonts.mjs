#!/usr/bin/env node
// gitdash-fonts init   adds a "fonts" collection with one entry to a GitDash site's content/ folder
// gitdash-fonts build  downloads the chosen Google Fonts into public/fonts and writes public/fonts/fonts.css
const cmd = process.argv[2];
if (cmd === "init") await import("../lib/init.mjs");
else if (cmd === "build") await import("../lib/build.mjs");
else {
	console.error("usage: gitdash-fonts init | build");
	process.exit(1);
}
