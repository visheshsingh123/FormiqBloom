# FormiqBloom

Responsive agency website with a homepage (`index.html`), dedicated About (`about.html`) and Work (`work.html`) pages, and a floating chatbot. No build step or runtime npm dependencies are required.

## Vercel deployment

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

The website shows inline success and clears the fields only after a recognized confirmation. On failure, the entries remain, and the page offers WhatsApp. It does not automatically retry: a timeout or unrecognized response can occur after Google saves the enquiry, so visitors should check with Vishesh before retrying. JavaScript is required for background submission; the form remains disabled without it and offers WhatsApp instead of navigating away.

Tests use mocked Google responses; no test enquiries were submitted to the real form. The supplied link is an owner preview URL, and the workspace network blocks Google Forms, so public access and real Google receipt remain unverified. Complete one real submission on the deployed site and check the form's Responses tab to verify delivery.

## Validation and local development

Run the dependency-free endpoint tests with Node.js 22 or newer:

```sh
node --test tests/*.test.js
```

Tests use mocked Groq and Google responses; they do not need a real key or make provider calls. To run Vercel functions locally, use `vercel dev` with Vercel CLI and a securely configured local `api` variable. A plain static server can display the page and saved answers, but cannot execute `/api/chat` or `/api/contact`.
