const SYSTEM_PROMPT = `
You are THE TRUTH DETECTIVE, an independent research investigator.
Investigate questions using scripture and religious traditions, philosophy, science,
history and archaeology, psychology, and human experience.
Be open-minded but rigorous. Do not assume a theory is true because it is interesting.
Separate established facts, interpretations, hypotheses and speculation.
For symbols and language patterns, distinguish the observable pattern from the proposed
meaning; consider translation, historical context, coincidence and selection effects.
Compare competing explanations, identify contradictions and state what remains unknown.
When useful, use web search and cite sources. Never invent quotations, sources or evidence.
Structure substantial answers with: THE QUESTION; THE EVIDENCE; SCRIPTURE & PHILOSOPHY;
SCIENCE & HISTORY; PATTERNS & CONNECTIONS; ALTERNATIVE EXPLANATIONS;
THE MOST LIKELY EXPLANATION; WHAT WE STILL DON'T KNOW.
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
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    }
  });
}

export default {
  async fetch(request, env) {
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

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "online", service: "Truth Detective" }, 200, "*");
    }
    if (url.pathname !== "/ask" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, allowedOrigin || "*");
    }
    if (!allowedOrigin) return json({ error: "Origin not allowed" }, 403, "*");
    if (!env.OPENAI_API_KEY) {
      return json({ error: "The AI key is not configured in this Worker." }, 500, allowedOrigin);
    }

    try {
      const body = await request.json();
      const question = body && body.question;
      if (typeof question !== "string" || !question.trim() || question.length > 10000) {
        return json({ error: "Please enter a question of up to 10,000 characters." }, 400, allowedOrigin);
      }

      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-6.2-astra",
          instructions: SYSTEM_PROMPT,
          tools: [{ type: "web_search", search_context_size: "medium" }],
          input: question
        })
      });

      const result = await upstream.json();
      if (!upstream.ok) {
        const message = result && result.error && result.error.message;
        return json({ error: message || "The AI service returned an error." }, upstream.status, allowedOrigin);
      }

      const answerParts = [];
      const citations = [];
      for (const item of (result.output || [])) {
        if (item.type !== "message") continue;
        for (const part of (item.content || [])) {
          if (part.type === "output_text" && part.text) {
            answerParts.push(part.text);
            for (const annotation of (part.annotations || [])) {
              if (annotation.type === "url_citation" && annotation.url) {
                citations.push({
                  title: annotation.title || annotation.url,
                  url: annotation.url
                });
              }
            }
          }
        }
      }
      const uniqueCitations = [...new Map(citations.map(c => [c.url, c])).values()];
      const answer = answerParts.join("\n\n");
      if (!answer) return json({ error: "The AI returned no text. Please try again." }, 502, allowedOrigin);
      return json({ answer, citations: uniqueCitations }, 200, allowedOrigin);
    } catch (error) {
      return json({ error: "The request could not be processed. Please try again." }, 500, allowedOrigin || "*");
    }
  }
};
