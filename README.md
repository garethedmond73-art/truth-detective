# The Truth Detective

**An open-minded evidence notebook for exploring big questions through scripture, science, philosophy and human experience.**

Created by **Gareth Edmond**.

Truth Detective is an experimental research tool designed to help people record claims, compare supporting evidence with counter-evidence, and explore possible connections without assuming a conclusion in advance.

## What it does

- Organises investigations across different witness groups and areas of knowledge.
- Lets users record claims, sources, supporting evidence, counter-evidence and provisional assessments.
- Includes a local evidence ledger for keeping investigation notes.
- Is configured as a Progressive Web App (PWA), with a web app manifest, app icon, service-worker registration and offline caching.
- Includes an optional AI-powered research service, with investigation and evidence-connection features.

## Try the app

When the site is deployed over HTTPS, open it in a supported browser such as Chrome. Use the browser menu to add it to your home screen.

## AI service and running your own copy

The AI-powered features require a separately deployed backend and a valid API key. The repository includes a Cloudflare Worker configuration (wrangler.toml) and Worker source (worker/index.js).

The API key must be stored as a server-side Cloudflare Worker secret named OPENAI_API_KEY. Never put a private API key in the browser app, public source code, screenshots, or a committed configuration file.

The original creator does not provide hosted AI credits or guarantee that the AI backend will remain online. Anyone deploying their own copy is responsible for their own hosting, API provider account, usage limits and costs. The app's local evidence notebook can still be useful without the AI service, subject to the features available in the deployed version.

## Open source

This project is released under the **MIT License**. You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of the software, subject to the licence conditions. Please retain the copyright and licence notice.

The MIT licence applies to this project's original code. Third-party libraries, services, assets and trademarks remain subject to their own terms and licences.

## Important note

Truth Detective is an exploratory research aid, not an authority or a substitute for checking original sources. Treat generated connections and conclusions as hypotheses. Check evidence independently, consider counter-evidence and distinguish established facts from interpretation and speculation.

## Credits

Original concept and project creator: **Gareth Edmond**.