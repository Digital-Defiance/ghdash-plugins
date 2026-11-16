# GitDash plugins

Add-ons for [EmDash](https://github.com/emdash-cms/emdash) sites, including sites on GitHub Pages built with [GitDash](https://github.com/Digital-Defiance/gitdash).

GHDash is now GitDash. The packages were published as `@digitaldefiance/ghdash-team` and `@digitaldefiance/ghdash-fonts` before the rename and are now `@digitaldefiance/gitdash-team` and `@digitaldefiance/gitdash-fonts`. To move a site over, swap the dependency, then change `ghdash-` to `gitdash-` in imports and build scripts. The old command names still work.

| Package | What it does |
| --- | --- |
| [`@digitaldefiance/gitdash-team`](packages/team) | A team page: collection, grid component, department filter and a page per member |
| [`@digitaldefiance/gitdash-fonts`](packages/fonts) | Pick Google Fonts in the studio and host them on your own site |

Both are edited in the studio like any other content, so they work on a static GitHub Pages site. See each package's README for setup. A working example is the [demo site](https://digital-defiance.github.io/GitDash-example/).

## Development

```sh
cd packages/fonts && npm test
```

## Releases

A tag `team-v<version>` or `fonts-v<version>` publishes that package to npm through the workflow in `.github/workflows/publish.yml`. The tag has to match the version in the package's `package.json`. Publishing uses npm trusted publishing, so there is no token. The first version of each package has to be published by hand (`npm publish --access public --provenance=false` from the package folder) before the trusted publisher can be added on npmjs.com (organization `Digital-Defiance`, repository `gitdash-plugins`, workflow `publish.yml`).

## License

MIT
