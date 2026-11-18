# Studio DVC Hub

A private page for [@studio.dvc](https://www.instagram.com/studio.dvc/). It shows how the Instagram account is doing, in plain language.

There is no login and no connection to Instagram. The page does not fetch numbers from the internet. Everything it shows comes from one file: `src/data/analytics.json`. Update that file, refresh the page, and the dashboard follows.

## Open the app

```bash
npm install
npm run dev
```

Open the address the terminal prints, usually http://localhost:5173.

## Check that it builds

```bash
npm run build
```

The built site lands in `dist/`. You can preview it with `npm run preview`.

## Update the numbers each week

You only need to edit `src/data/analytics.json`.

1. Open `src/data/analytics.json`.
2. Add the new week, or a new post, using the shapes below.
3. Save the file.
4. Refresh the page.

Leave a value as `null` when you do not have it yet. Write `0` only when the real count is zero. On the page, `null` shows as a dash (—) with the tooltip “not available yet”. A zero shows as 0.

`nonFollowerPercent` is a fraction from 0 to 1. `0.905` means 90.5%.

`retention3s` uses the same kind of fraction. `0.62` means 62% of viewers stayed for 3 seconds. Leave it `null` until you have it.

Posts dated before `baselineStart` (`2026-10-29`) are left out. Weeks that start before that date are left out too.

Trial Reel is its own format. Do not file a Trial Reel as a Reel.

### Add a week

Copy the last object inside `"weeks"`, paste a new one after it, and replace the words and numbers. A week looks like this:

```json
{
  "week": "Week 4 · Nov 16 to Nov 22",
  "weekStart": "2026-11-16",
  "views": null,
  "reach": null,
  "nonFollowerPercent": null,
  "interactions": null,
  "profileVisits": null,
  "followersTotal": null,
  "follows": null,
  "shares": null,
  "saves": null,
  "bestPost": null,
  "testing": null,
  "recommendations": null
}
```

`weekStart` is the first day of that week, written `YYYY-MM-DD`. The page sorts weeks by this date, so the order in the file does not matter.

The header cards and the trend charts use `views`, `nonFollowerPercent`, `interactions`, `profileVisits`, and `followersTotal`.

What we're learning uses `testing`, `recommendations`, and `bestPost`. Those notes are shown word for word. The post table does not copy numbers out of the notes. It calculates from the post fields below.

`reach`, `follows`, `shares`, and `saves` on a week are kept in the file for later. Version 1 does not chart them.

### Add a post

Paste a new object at the end of `"posts"`:

```json
{
  "title": "Post title",
  "date": "2026-11-16",
  "format": "Reel",
  "pillar": "Making",
  "views": null,
  "nonFollowerPercent": null,
  "shares": null,
  "saves": null,
  "follows": null,
  "retention3s": null,
  "postLink": "https://www.instagram.com/studio.dvc/reel/...",
  "note": "Optional. Shown under the title. Leave the line out if you have nothing to add."
}
```

`format` can be `Reel`, `Carousel`, `Trial Reel`, or `null` if you have not chosen yet. `pillar` can be a name such as `Making`, or `null`.

The page then calculates, only when the inputs exist:

| What you see | How it is calculated |
| --- | --- |
| Shares per 1,000 views | shares ÷ views × 1,000 |
| Saves per 1,000 views | saves ÷ views × 1,000 |
| Follows per 1,000 non-follower views | follows ÷ (views × nonFollowerPercent) × 1,000 |
| 3-second retention | retention3s × 100, shown as a percent |

If any input is `null`, or if the views in the bottom of the sum are 0, the score stays a dash. It is not filled in as 0.

Scores are rounded to one decimal place. Weak, watch, and good follow that rounded number.

### Weak, watch, and good

These are starting thresholds. Edit them in `src/config/thresholds.ts` and the labels on the page change with the file.

| Score | Weak | Watch | Good |
| --- | --- | --- | --- |
| Shares per 1,000 views | under 1 | 1 to 5 | over 5 |
| Saves per 1,000 views | under 2 | 2 to 5 | over 5 |
| Follows per 1,000 non-follower views | under 1 | 1 to 3 | over 3 |
| 3-second retention | under 50% | 50% to 65% | over 65% |

Watch includes both ends. 5 shares per 1,000 views is watch. 5.1 is good.

### When a judgment is fair

- A format can be judged after 6 posts in that format.
- A pillar can be judged after 4 weeks.
- The Judging rules box shows how far along each one is.

Change those two numbers in `src/config/rules.ts`.

## Add another section

The side menu, and the top tabs on a phone, read from one list.

1. Create `src/sections/<name>/<Name>Section.tsx`.
2. Add one entry to `src/sections/index.ts`.

Inspiration is the placeholder. It says “Coming soon”.

## Checks

```bash
npm test
```

That runs the number rules: missing stays missing, zero stays zero, Trial Reel is not a Reel, and posts before 29 Oct 2026 are left out.
