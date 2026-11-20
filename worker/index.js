const SYSTEM_PROMPT = `
You are THE TRUTH DETECTIVE, an independent research investigator.
Investigate questions using scripture and religious traditions, philosophy, science,
history and archaeology, psychology, and human experience.

Be open-minded but rigorous. Do not assume a theory is true because it is interesting.
Separate established facts, interpretations, hypotheses and speculation.
For symbols and language patterns, distinguish the observable pattern from the proposed
meaning; consider translation, historical context, coincidence and selection effects.
Compare competing explanations, identify contradictions and state what remains unknown.
Use web search for current or checkable claims and cite sources returned by the search tool.
Never invent quotations, sources, page numbers or evidence.

For substantial investigations, use these sections:
THE QUESTION; THE EVIDENCE; SCRIPTURE & PHILOSOPHY; SCIENCE & HISTORY;
PATTERNS & CONNECTIONS; ALTERNATIVE EXPLANATIONS;
THE MOST LIKELY EXPLANATION; WHAT WE STILL DON'T KNOW.

Finish every substantial investigation with a section headed exactly:
EVIDENCE SCORECARD
Under it, give these five labelled assessments:
- Evidence quality: Strong / Mixed / Limited / Not yet checked, with a brief reason.
- Independent sources: say whether sources are independent or repeat the same underlying claim; name the basis.
- Counter-evidence: strongest credible challenge found, or say none was located (not that none exists).
- Unknowns: the most important unanswered question.
- Confidence: Low / Medium / High, with a brief explanation tied to the evidence.
Never give a percentage or imply this is an objective truth score. Do not award high confidence merely because many sources repeat one claim. If web citations were not returned, say so and keep confidence appropriately limited. Distinguish evidence about a claim from evidence that merely makes it interesting.

Be respectful of beliefs without simply agreeing with the user. Conclusions are provisional.
`;

const ALLOWED_ORIGINS = new Set([
  "https://garethedmond73-art.github.io"
]);

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}

function getText(result) {
  const parts = [];
  const citations = [];
  for (const item of result.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type !== "output_text" || !part.text) continue;
      parts.push(part.text);
      for (const annotation of part.annotations || []) {
        if (annotation.type === "url_citation" && annotation.url) {
          citations.push({
            title: annotation.title || annotation.url,
            url: annotation.url
          });
        }
      }
    }
  }
  return {
    answer: parts.join("\n\n").trim(),
    citations: [...new Map(citations.map(c => [c.url, c])).values()]
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        status: "online",
        service: "Truth Detective",
        aiKeyConfigured: Boolean(env.OPENAI_API_KEY)
      });
    }

    if (url.pathname !== "/ask" || request.method !== "POST") {
      return json({ error: "Not found. Use GET /health or POST /ask." }, 404);
    }

    if (!allowedOrigin) {
      return json({ error: "This website is not allowed to use the detective service." }, 403);
    }

    if (!env.OPENAI_API_KEY) {
      return json({
        error: "The AI key is missing from Cloudflare Worker secrets. Add OPENAI_API_KEY in Worker Settings > Variables and Secrets."
      }, 503, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "The request body must be valid JSON." }, 400, allowedOrigin);
    }

    const question = body && body.question;
    if (typeof question !== "string" || !question.trim() || question.length > 10000) {
      return json({ error: "Please enter a question of up to 10,000 characters." }, 400, allowedOrigin);
    }

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6.2-astra",
          instructions: SYSTEM_PROMPT,
          tools: [{ type: "web_search", search_context_size: "medium" }],
          input: question,
          max_output_tokens: 5000
        }),
        signal: AbortSignal.timeout(90000)
      });

      const raw = await upstream.text();
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        return json({ error: "The AI service returned an unreadable response. Please try again." }, 502, allowedOrigin);
      }

      if (!upstream.ok) {
        const message = result?.error?.message || "The AI service returned an error.";
        const status = upstream.status === 429 ? 429 : 502;
        return json({ error: message }, status, allowedOrigin);
      }

      const output = getText(result);
      if (!output.answer) {
        return json({ error: "The AI returned no text. Please try again." }, 502, allowedOrigin);
      }

      return json(output, 200, allowedOrigin);
    } catch (error) {
      const timedOut = error?.name === "TimeoutError";
      return json({
        error: timedOut
          ? "The investigation took too long. Please try a shorter question."
          : "The detective could not reach the AI service. Please try again."
      }, 502, allowedOrigin);
    }
  }
};
