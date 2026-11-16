# @digitaldefiance/gitdash-fonts

Choose Google Fonts in the studio and serve them from your own site, for [EmDash](https://github.com/emdash-cms/emdash) and [GitDash](https://github.com/Digital-Defiance/gitdash) sites. It covers the main features of the WordPress plugin Fonts Plugin: font choice, per-element typography, and local hosting so visitors make no requests to Google.

## Install

```sh
npm install @digitaldefiance/gitdash-fonts
npx gitdash-fonts init      # adds a "fonts" collection with one entry to content/
```

Add the component to your layout's `<head>`, after your other stylesheets:

```astro
---
import FontStyles from "@digitaldefiance/gitdash-fonts/FontStyles.astro";
---
<FontStyles />
```

Run `gitdash-fonts build` before `astro build`:

```json
"build": "... && gitdash-fonts build && astro build && ..."
```

## Use

Open the **Fonts** collection in the studio, edit the entry, and commit. The next build downloads the files from Google Fonts into `public/fonts/` and writes `public/fonts/fonts.css`. The published site loads only your own files.

| Field | Example |
| --- | --- |
| Body font, Heading font | `Lora`, `Playfair Display` (any Google Fonts family; headings default to the body font) |
| Weights to download | `400,700` |
| Character sets | `latin, latin-ext` (also cyrillic, greek, vietnamese) |
| Body weight, heading weight | `400`, `700` |
| Base font size, line height, letter spacing | `18px`, `1.6`, `0.01em` |
| Body text color, heading color | `#222`, `#0a3d62` |
| Heading case | none, uppercase, lowercase, capitalize |
| Adobe Fonts web project ID, Adobe fonts | `abc1def`, `proxima-nova`: list the fonts from Adobe, then use them in the font fields above |
| Other elements | one per line: `selector \| Font family \| weight`, such as `blockquote \| Lora \| 400` |

The CSS variables `--gitdash-body-font` and `--gitdash-heading-font` are also set, for use in your own styles. The older names `--ghdash-body-font` and `--ghdash-heading-font` still work.

If your theme sets fonts with a more specific selector (a class, for example), the settings above won't override it. Use the "Other elements" field to target that selector.

Values are checked before they are written to the stylesheet. A font name, size, color or selector that doesn't look valid is skipped with a warning in the build log.

## Adobe Fonts

Adobe's licence doesn't allow self-hosting, so fonts from an Adobe web project load from `use.typekit.net`, and visitors make a request to Adobe. Google fonts are still served from your site. Create a web project at fonts.adobe.com, add the domains your site uses, and copy the project ID into "Adobe Fonts web project ID". List the Adobe font names (as shown in the project's CSS, like `proxima-nova`) in "Fonts that come from Adobe". If you already ran `gitdash-fonts init`, run it again to add the two new fields.

## Your own font files

Put `.woff2`, `.woff`, `.ttf` or `.otf` files in a `custom-fonts/` folder at the root of the site. You can upload them on github.com, since the studio can't take font files. Name each file after the font and weight: `Acme Sans-400.woff2`, `Acme Sans-700-italic.woff2`. The build copies the files to `public/fonts/` and writes the `@font-face` rules. Then use the name (`Acme Sans`) in the Fonts entry like any other font. Make sure you are licensed to publish the files, because they will be public in your repo and on your site.

## Not included

Choosing fonts from a preview list. Italic styles are not downloaded.

MIT licensed.
