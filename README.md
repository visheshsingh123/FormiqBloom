# FormiqBloom

Responsive agency website with a homepage (`index.html`), dedicated About (`/about`, served from `about.html`) and Work (`/work`, served from `work.html`) pages, and a floating chatbot. No build step or runtime npm dependencies are required.

The About page (`/about#founder`) includes Vishesh Singh’s founder card, Surat location, and personal website. The former Team page redirects here.

The Work page uses selected uploaded product screenshots. `work-gallery.js` adds image selection and a keyboard-accessible enlargement dialog; image links also work without JavaScript.

The homepage hero uses the uploaded robot model with an independently tracking head (`hero-robot.js`). Its optimized copy is about 800 KB and 32,000 triangles, loaded with a local renderer on desktop and mobile. Mobile uses a shadowed portrait behind the hero copy, with a static pose on touch devices; desktop supports cursor tracking. Reduced motion keeps it static, and rendering pauses outside the hero. The previous CSS robot has been removed; core page content remains available if the 3D model cannot load. Creator attribution is linked from the footer; see `Assets/robot-model-attribution.txt` and `vendor/README.md` for licensing and optional asset regeneration. No deployment build is required.

The Website services section presents Starter Website (₹1,999, 48 hours), Business Website (₹4,999, 3–4 days), and Custom Website (₹11,999, 7 days). Delivery begins after scope confirmation and receipt of required content and access; recurring services are separate. Tier buttons select the corresponding enquiry option. Landing pages, booking integrations, and dashboards are covered within those options. The dedicated AI Assistant page (`/ai-assistant`, served from `ai-assistant.html`) provides four saved questions and access to the floating chat. Its enquiry link preselects AI Assistant on the homepage form. The robot and all AI navigation links lead to this page. The previous support row and project packages section are removed; navigation and structured service links follow the current sections. The Blog (`/blog`) links four original, static business guides at `/blog/business-website-checklist`, `/blog/website-redesign-guide`, `/blog/choose-business-website-package`, and `/blog/ai-assistant-for-small-business`. Their content and shared assets work without a build step; article metadata, publication dates, BlogPosting schema, breadcrumbs, and sitemap entries are managed through `seo.config.json`.

On mobile (up to 850px), every page uses a floating pill header and a five-link bottom navigation bar for Home, About, Work, Pricing, and AI Assistant. Current-page states, native links, safe-area spacing, and offsets for the chat and back-to-top controls are included; desktop navigation is unchanged.

The Pricing page (`/pricing`) compares all three tiers. Business and Custom include an AI assistant; Starter can add one for a separate quote. AI provider usage and recurring services remain separate. Pricing enquiries select a matching contact form option, including Starter + AI. The pricing page’s structured offers derive from the homepage tier configuration, and the saved/AI pricing answers reflect the same inclusion rules.

Customer-facing copy should be concise and understandable to business owners: short benefits, familiar words, and clear costs. The About page’s Why choose us section follows this approach, covering secure connections, mobile usability, search setup, clear pricing, direct communication, and the confirmed support hours.

## SEO

All thirteen public pages have unique titles and descriptions, canonical URLs, Open Graph and Twitter sharing tags, and JSON-LD for the confirmed business, founder, and page content. The Work page also describes both applications. A 1200 × 630 sharing image is stored at `Assets/social-preview.png`, with its editable vector source alongside it.

`seo.config.json` is the source for page metadata and the production domain. Run `python3 scripts/update_seo.py` after editing it; generated HTML, `sitemap.xml`, and `robots.txt` are committed, so Vercel still needs no build step. API responses carry an `X-Robots-Tag: noindex` header. The uploaded Google verification file is preserved separately and is not added to the sitemap.

After deployment, verify the current property in Google Search Console and submit `https://formiqbloom.vercel.app/sitemap.xml`. Adding metadata does not submit the site or confirm indexing.

For the future `.in` move:

1. Connect the real domain to this Vercel project and confirm it serves the website over HTTPS.
2. Run `python3 scripts/update_seo.py --site-url https://your-domain.in`, replacing the example with the real domain. This updates canonical and sharing URLs, structured data, sitemap, robots, and absolute Home/logo links on all thirteen pages. Commit and deploy the generated files and configuration together.
3. Configure a permanent redirect from the old domain to the new one in Vercel, preserving each page path. Verify the new Search Console property, submit its sitemap, and use Change of Address where applicable. Google verification may require new verification details for the new property.

Check the SEO files with `python3 -B -m unittest discover -s tests -p test_seo.py -v`.

## Vercel deployment

The concise website policies are at `/privacy` (`privacy.html`) and `/terms` (`terms.html`). Keep these updated when data handling or service arrangements change.

`vercel.json` enables clean URLs and removes trailing slashes. Use `/`, `/about` and `/work` for navigation; the source files remain plain HTML. Vercel redirects `.html` page URLs to their clean equivalents.

- Deploy this repository with Vercel's **Other** framework preset and no build command. Keep the project root at the repository root so the chat and contact functions become `/api/chat` and `/api/contact`.
- Add the Groq key as a server environment variable named **`api`** (lowercase, matching the existing Vercel setting). The endpoint also accepts `GROQ_API_KEY` or `API`, in that order after `api`, and ignores blank values. Enable the variable for the deployment environments you use, such as Production and Preview. Never put its value in HTML, browser JavaScript, Git, or a public-prefixed variable.
- Redeploy after adding or changing the variable. A Git push starts deployment if the repository is connected to Vercel.
- By default, the server checks Groq's authenticated `/models` catalog and selects an active text chat model actually listed for the key. It prefers `openai/gpt-oss-20b`, followed by other supported text models, and excludes audio and safety-only models. The catalog is cached for five minutes per key fingerprint, without storing the key in the cache. Up to three listed models are attempted only when Groq explicitly rejects a model as unavailable. All calls share an 18-second deadline.
- Optional server variable `GROQ_MODEL` selects one specific model and bypasses automatic selection. Remove a stale `GROQ_MODEL` override to restore automatic model discovery. If a restricted key cannot list models (HTTP 403), the function attempts up to three known text model IDs instead.
- `vercel.json` allows the function 30 seconds; the upstream request has an 18-second timeout. Free Groq accounts have usage limits; quota or connection failures show a helpful message and a WhatsApp alternative.

### If chat says it is not available on this deployment yet

That response specifically means the running Vercel function has no nonempty supported key variable. It occurs before any request to Groq, so it is not a model or Groq quota error.

1. Open the Vercel project serving this website → **Settings → Environment Variables**.
2. Create or check **Name: `api`**, **Value: your existing Groq API key**, and enable **Production**. Enable Preview as well if you are using a preview deployment. A key named "api" in the Groq console does not automatically create a Vercel environment variable.
3. Save, then redeploy the latest commit from Vercel's **Deployments** page. Existing deployments do not receive subsequently added environment variables.
4. Open the new deployment and ask a custom question. Saved quick answers do not test the server key because they run locally.

Enter the credential only in Vercel's secure environment settings, never in chat or source code.

For a safe deployment check, open `/api/chat` in the deployed site's browser. GET returns only `keyConfigured`, the deployment environment, the deployed Git revision, and `providerChecked: false`. It does not expose the key or call Groq. `keyConfigured: true` confirms the function sees a supported nonempty variable; it does not prove Groq accepts it. Check the revision to distinguish an old deployment from the latest Git commit, then test a custom chat question to exercise Groq.

### If the key is configured but Groq rejects chat

The chat shows a safe support reference, and the server response includes the upstream HTTP status. Raw provider error messages and credentials are never returned or logged.

| Reference | Meaning and next step |
| --- | --- |
| `AI_AUTH_FAILED` | Groq rejected authentication. Check that the selected server variable contains the actual active Groq key, rather than its display name, a revoked key, or another provider's token. Update it securely in Vercel and redeploy. |
| `AI_ACCESS_DENIED` | Groq refused access from the account or deployment. Check account restrictions, model permissions, and regional availability in Groq. |
| `AI_MODEL_UNAVAILABLE` | The model is unavailable for this account. Check supported models and any `GROQ_MODEL` override. |
| `AI_CONFIGURED_MODEL_UNAVAILABLE` | The explicit `GROQ_MODEL` override was rejected. Remove that override and redeploy for automatic discovery, or set a model currently available to the account. |
| `AI_NO_CHAT_MODELS`, `AI_MODEL_CATALOG_ERROR` | Groq returned no supported active text models, or its model catalog could not be read. Check account model access and retry later. |
| `AI_REQUEST_REJECTED` | Groq rejected the request format or parameters. Check the corresponding function log and supported model settings. |
| `AI_RATE_LIMIT` | Groq's current usage allowance is exhausted. Wait for the allowance to reset or contact via WhatsApp. |
| `AI_PROVIDER_UNAVAILABLE`, `AI_CONNECTION_ERROR`, `AI_TIMEOUT` | Provider availability, connection, or timing failure. Retry later or use WhatsApp. |

## Chat behavior

`chatbot.js` provides four fixed answers about services, process, pricing, and contact. Clicking them (or typing the exact question) does not call Groq. All other questions go to the same-origin `/api/chat` endpoint, which adds the agency's business facts and calls Groq with the server key.

Recent conversation is kept only in browser memory, with at most three previous exchanges sent for context. Reloading clears it. Custom questions and this recent context are processed by Groq. Messages are rendered as plain text; the application does not log chat content or credentials.

The endpoint validates message size and roles, rejects cross-origin browser calls, limits response length, and applies a best-effort limit of eight AI requests per minute per visitor **per function instance**. This in-memory limiter is not a global quota guarantee across Vercel instances. Configure Vercel Firewall rate limiting if deployment-wide enforcement is needed.

The floating chat opens from the bottom-right button or the assistant section. It supports Escape, keyboard focus, mobile layouts, and reduced motion. The consultation form submits in the background through `/api/contact`; WhatsApp is also available.

## Consultation form

The form uses a same-origin JSON request to `/api/contact` and stays on the website throughout submission. The Vercel function validates the fields and forwards a URL-encoded HTTPS POST to the Google Form ID `18POKvXzJnQRRjndrHALXYd-v4fKwumVJHvg8Q6HvpDw`. No Google API secret is required. There are no redirects, popups, hidden iframes, or opaque `no-cors` responses in the browser.

Entry IDs are taken from the supplied form screenshot in displayed question order:

| Website field | Google Forms field |
| --- | --- |
| Name | `entry.772884676` |
| Email | `entry.92953162` |
| Business name (optional) | `entry.257858045` |
| Service needed | `entry.2086671607` |
| Project details | `entry.942640608` |

Service needed is a short-answer Google field, so the website sends the selected service's full label. The server URL-encodes the values in the POST body, rather than placing personal details in the URL. Enquiry contents are not logged or cached by the application. Basic per-instance rate limiting allows five submissions per visitor per ten minutes; configure Vercel Firewall for deployment-wide enforcement if needed.

The server requests English (`hl=en`) and conservatively recognizes Google's standard recorded-response text inside a known confirmation container. HTTP 200 alone is insufficient: validation forms, sign-in redirects, closed forms, and embedded script strings are rejected. Keep Google's default confirmation message, “Your response has been recorded.” A custom or changed Google confirmation format will be reported as unconfirmed until the parser is updated. The owner must publish the Google Form, enable accepting responses, and allow anonymous responses; a sign-in-only form cannot be submitted by this server. Update `GOOGLE_FORM_URL` in `api/contact.js` if its responder URL changes.

The website shows inline success and clears the fields only after a recognized confirmation. On failure, the entries remain, and the page offers WhatsApp. It does not automatically retry: a timeout or unrecognized response can occur after Google saves the enquiry, so visitors should check with FormiqBloom before retrying. JavaScript is required for background submission; the form remains disabled without it and offers WhatsApp instead of navigating away.

Tests use mocked Google responses; no test enquiries were submitted to the real form. The supplied link is an owner preview URL, and the workspace network blocks Google Forms, so public access and real Google receipt remain unverified. Complete one real submission on the deployed site and check the form's Responses tab to verify delivery.

## Validation and local development

Run the dependency-free endpoint tests with Node.js 22 or newer:

```sh
node --test tests/*.test.js
```

Tests use mocked Groq and Google responses; they do not need a real key or make provider calls. To run Vercel functions locally, use `vercel dev` with Vercel CLI and a securely configured local `api` variable. A plain static server can display the page and saved answers, but cannot execute `/api/chat` or `/api/contact`.

The FAQ page (`/faq`, served from `faq.html`) contains ten client-focused answers using native expandable controls. Header and footer FAQ links across the site open this page; the homepage keeps its short FAQ preview and links to the full list. Page metadata and the sitemap entry are managed through `seo.config.json`.

The mobile bottom navigation links Home, About, Work, Pricing, and AI Assistant. Each destination highlights its current page; Blog and About remain available from the main menu and footer.

Published tier scope: Starter includes 1 page with essential business links and 1 revision round; Business includes 3–5 pages, 2 revision rounds, and AI assistant setup; Custom includes 8–10 pages, 3 revision rounds, AI assistant setup, and an admin dashboard with agreed features. Page counts and revision rounds are also recorded in `seo.config.json` and generated offer descriptions.

Revision rounds may include layout changes; new pages or features cost extra. Custom dashboard scope covers content, enquiries, and booking records. All booking systems/integrations, payment features, and online stores are quoted separately, including for Custom. Clients may supply text/images or request help, with content agreed before work starts.

On screens up to 850px, homepage website tiers use a native horizontal scroll-snap carousel. `website-tier-carousel.js` adds looping previous/next buttons, arrow-key navigation, and a screen-reader status. Mobile centers the active card with smaller neighboring previews; inert, ID-free clones provide the looping previews. Native swiping works without JavaScript. Desktop keeps the three-column grid. Reduced-motion preferences disable animated scrolling.

The AI Assistant introduction uses a plain-language explanation, three practical uses, and an example customer question. Work project cards, screenshot frames, and tags use square corners.

Shared margin decoration: `margin-background.js` renders the supplied Halftone WebGL1 shader from `Assets/margin-halftone.frag`, with theme colors and subtle opacity. `margin-background.css` masks out the central 1200px content area. Rendering uses a fullscreen triangle, scissored margin strips, capped pixel density and 30fps; it pauses in hidden tabs, renders a static frame for reduced motion/data-saving, and is hidden on mobile. A CSS dot pattern remains if WebGL is unavailable.

Homepage logo intro: `logo-intro.js` briefly reveals a liquid-distorted copy of the real wordmark, then animates it into the measured navbar logo rectangle. It runs once per tab session (including an initial #home visit), skips subsequent refreshes, other deep links, and reduced-motion settings, supports click/key skip, and fails open on a short timeout. The illustration and all page content remain independent of the intro.

Homepage before/after comparison: `#website-makeover` follows `#website-types`. Before is the owner-supplied `Assets/c2.png`; After is `Assets/c1.jpeg`. `redesign-comparison.js` controls a native range input and CSS clipping, with mouse/touch dragging, keyboard controls, and original-image links as the no-JavaScript fallback. No automated animation or invented redesign results are added.

Pricing leads with six essentials: pages, delivery, revisions, AI, admin dashboard, and ongoing costs. The remaining comparison details are available in a native expandable section. Browser-tab titles use short, consistent page names and FormiqBloom branding.
