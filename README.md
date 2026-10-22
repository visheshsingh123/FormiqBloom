# FormiqBloom

Responsive agency website with a floating chatbot. No build step or runtime npm dependencies are required.

## Vercel deployment

- Deploy this repository with Vercel's **Other** framework preset and no build command. Keep the project root at the repository root so `api/chat.js` becomes `/api/chat`.
- Add the Groq key as a server environment variable named **`api`** (lowercase, matching the existing Vercel setting). Enable it for the deployment environments you use, such as Production and Preview. Never put its value in HTML, browser JavaScript, Git, or a public-prefixed variable.
- Redeploy after adding or changing the variable. A Git push starts deployment if the repository is connected to Vercel.
- The default model is `llama-3.1-8b-instant`. Optional server variable `GROQ_MODEL` can select another chat model available to your Groq account.
- `vercel.json` allows the function 30 seconds; the upstream request has an 18-second timeout. Free Groq accounts have usage limits; quota or connection failures show a helpful message and a WhatsApp alternative.

## Chat behavior

`chatbot.js` provides four fixed answers about services, process, pricing, and contact. Clicking them (or typing the exact question) does not call Groq. All other questions go to the same-origin `/api/chat` endpoint, which adds the agency's business facts and calls Groq with the server key.

Recent conversation is kept only in browser memory, with at most three previous exchanges sent for context. Reloading clears it. Custom questions and this recent context are processed by Groq. Messages are rendered as plain text; the application does not log chat content or credentials.

The endpoint validates message size and roles, rejects cross-origin browser calls, limits response length, and applies a best-effort limit of eight AI requests per minute per visitor **per function instance**. This in-memory limiter is not a global quota guarantee across Vercel instances. Configure Vercel Firewall rate limiting if deployment-wide enforcement is needed.

The floating chat opens from the bottom-right button or the assistant section. It supports Escape, keyboard focus, mobile layouts, and reduced motion. The separate consultation form remains an unconnected preview; enquiries can be sent directly using WhatsApp.

## Validation and local development

Run the dependency-free endpoint tests with Node.js 22 or newer:

```sh
node --test tests/chat.test.js
```

Tests use mocked Groq responses; they do not need a real key or make provider calls. To run Vercel functions locally, use `vercel dev` with Vercel CLI and a securely configured local `api` variable. A plain static server can display the page and saved answers, but cannot execute `/api/chat`.
