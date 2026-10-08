# Dingle Heart Safe website: how it fits together

The site is plain HTML, one stylesheet and five small scripts. There is no build step.
Upload or push everything in this folder (except what `.gitignore` lists) to the GitHub
repository that serves dingleheartsafe.com, and GitHub Pages publishes it.

## Files

- `index.html`, `aed.html`, `who-we-are.html`, `what-we-do.html`, `news.html`,
  `resources.html`, `donate.html`, `join.html`, `contact.html`, `privacy.html`: the pages.
- `styles.css`: the only stylesheet.
- `site.js`: menu, scroll reveal, ECG line, phone action bar, map overlay, video posters.
- `aed-data.js`: the 25 AED locations (from the Dingle AED map in Google My Maps).
- `aed-finder.js`: the "Find my nearest AED" feature.
- `instagram-data.js`: the Instagram posts shown on the home and news pages, and the live feed setting.
- `insta-feed.js`: draws those posts as tiles (home page) and full posts (news page).
- `video/`: the background videos (720 and 480 pixel versions) and their poster images.
- `img/`: web-sized copies of the photos. The originals in this folder are not used by the pages.
- `tools/update-aed-data.mjs`: refreshes `aed-data.js` from the Google My Map.
- `_previous/`: the site as it was before the September 2026 redesign. GitHub Pages does not publish it.

## When the AED map changes

1. Edit the pins in Google My Maps as usual.
2. In this folder run: `node tools/update-aed-data.mjs`
3. Open `aed-data.js` and fill in `area` and `group` for any new pin. For an AED that Dingle Heart Safe
   does not look after, add `"managed":false` to its row: the list then shows "(Not a Dingle Heart Safe
   Managed AED)" under it. The AED counts on the pages update themselves.
4. Add a dot for the new pin to the area map in `index.html` (`pen-map__aeds`), then upload the changed files.

## Things that need HTTPS

The nearest-AED button uses the phone's location, which browsers only allow over HTTPS.
In the repository settings on GitHub, under Pages, keep "Enforce HTTPS" ticked.

## Making the news page a live Instagram feed

Right now the news page and the home page show the three posts that were on
@dingleheartsafe on 7 October 2026, saved on this site. To have new posts appear
by themselves:

1. Go to https://behold.so and sign up for the free plan.
2. Connect the @dingleheartsafe Instagram account when Behold asks.
3. Create a feed of type "JSON" and copy its address (it starts with https://feeds.behold.so/).
4. Open `instagram-data.js`, paste that address between the quotes on the `feedUrl:` line, and upload the file.

From then on every visit loads the latest posts straight from Instagram, in the
same design. If Behold is ever unreachable, the saved posts are shown instead.

## Background videos

The videos in `video/` were made from the workshop clips. To swap one, export a
short, silent, portrait MP4 at 720 x 1280 (and a 480 x 854 copy for phones),
give it the same file name, and replace the poster JPG with a frame from it.

## After changing styles.css or a script

Every page loads `styles.css?v=20261008g` and `site.js?v=20261008g` (and the other scripts the same way).
Phones keep old copies of these files for a while, so when you change `styles.css` or any `.js` file,
change the `?v=` number in all ten pages to today's date (for example `?v=20261124`) before uploading.
To do this in one go, use "Replace in Files" in your editor (in VS Code: Edit, then Replace in Files)
to change the number the pages use now (at the moment `?v=20261008g`) to the new one in all the `.html`
files. Any new number works, as long as it is different from the old one.
