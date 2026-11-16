// This Cloudflare Worker does two jobs:
// 1. Requests to /api  → sends the chat messages to OpenAI and returns the reply.
// 2. Everything else   → serves the website files (index.html, style.css, etc.).
//
// The OpenAI key is NOT in this file. It is stored in Cloudflare as a secret
// named OPENAI_API_KEY (Worker → Settings → Variables and Secrets).

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only the /api path talks to OpenAI
    if (url.pathname === "/api") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      };

      // Handle CORS preflight requests
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      const apiKey = env.OPENAI_API_KEY; // the Cloudflare secret

      // If the secret is missing, explain the problem instead of calling OpenAI.
      // (This lists variable NAMES only, never their values.)
      if (!apiKey) {
        const message = `OPENAI_API_KEY secret not found. Variables this Worker can see: ${Object.keys(env).join(", ")}`;
        return new Response(JSON.stringify({ error: { message: message } }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      const apiUrl = "https://api.openai.com/v1/chat/completions";
      const userInput = await request.json();

      const requestBody = {
        model: "gpt-4.1",
        messages: userInput.messages,
        max_completion_tokens: 300,
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // Any other path: serve the website files
    return env.ASSETS.fetch(request);
  },
};
