# @digitaldefiance/gitdash-team

A team page for [EmDash](https://github.com/emdash-cms/emdash) sites, including sites on GitHub Pages built with [GitDash](https://github.com/Digital-Defiance/gitdash). It is modelled on the features of the WordPress plugin Team Members Pro.

You get a `team` collection, a `TeamGrid` component, a `/team` page with department filter buttons, and a page for each member.

## Install

```sh
npm install @digitaldefiance/gitdash-team
npx gitdash-team                      # adds the "team" collection and three sample members to content/
cp -r node_modules/@digitaldefiance/gitdash-team/templates/team src/pages/team
```

`npx gitdash-team` needs a GitDash site (it uses `@digitaldefiance/gitdash-pages` to build the content database). On a regular EmDash site, create the collection in the admin with the fields below instead.

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | The member's name |
| `role` | string | Position |
| `department` | string | Used for the filter buttons |
| `photo`, `hover_photo` | image | The hover photo fades in on mouse over |
| `bio` | rich text | |
| `more_info` | rich text | Shown in an expandable box |
| `accent_color` | string | A CSS color for the member's top border and position |
| `order` | integer | Lower numbers come first |
| `email`, `website`, `linkedin`, `github`, `twitter`, `mastodon`, `instagram` | string | Links, shown when set |

A member that isn't published is not shown.

## TeamGrid

```astro
---
import TeamGrid from "@digitaldefiance/gitdash-team/TeamGrid.astro";
---
<TeamGrid members={members} layout="grid" shape="round" photoPosition="top" filter />
```

- `layout`: `grid` or `list`
- `shape`: `round` or `square`
- `photoPosition`: `top`, `side` or `banner`
- `filter`: show department filter buttons

The component links to `/team/<slug>`, so keep the page templates at `src/pages/team/`.

## Not included

Importing and exporting members, picture filters (such as black and white) and a limit on social links.

MIT licensed.
