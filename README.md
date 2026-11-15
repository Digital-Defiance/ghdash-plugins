# GHDash plugins

Add-ons for [EmDash](https://github.com/emdash-cms/emdash) sites, including sites on GitHub Pages built with [GHDash](https://github.com/Digital-Defiance/ghdash).

| Package | What it does |
| --- | --- |
| [`@digitaldefiance/ghdash-team`](packages/team) | A team page: collection, grid component, department filter and a page per member |
| [`@digitaldefiance/ghdash-fonts`](packages/fonts) | Pick Google Fonts in the studio and host them on your own site |

Both are edited in the studio like any other content, so they work on a static GitHub Pages site. See each package's README for setup. A working example is the [demo site](https://digital-defiance.github.io/GHDash-example/).

## Development

```sh
cd packages/fonts && npm test
```

## Releases

A tag `team-v<version>` or `fonts-v<version>` publishes that package to npm through the workflow in `.github/workflows/publish.yml`. The tag has to match the version in the package's `package.json`. Publishing uses npm trusted publishing, so there is no token. The first version of each package has to be published by hand (`npm publish --access public --provenance=false` from the package folder) before the trusted publisher can be added on npmjs.com (organization `Digital-Defiance`, repository `ghdash-plugins`, workflow `publish.yml`).

## License

MIT
