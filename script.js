/* ---------- Settings ---------- */

// The Cloudflare Worker handles chat at "/api".
// We use the full address so the chat works from any site,
// including GitHub Pages.
// (No API key goes here — the Worker keeps the key safe as a secret.)
const WORKER_URL = "https://08-prj-loreal-chatbot.lstansbury222.workers.dev/api";

// The system prompt tells the AI how to behave.
const systemPrompt = `You are the L'Oréal Smart Product Advisor, a friendly and knowledgeable beauty assistant.
Only answer questions about L'Oréal products (makeup, skincare, haircare, fragrance),
beauty routines, and personalized product recommendations.
If the user asks about anything unrelated to L'Oréal or beauty, politely say you can only
help with L'Oréal products and beauty topics, then suggest something you can help with.
Keep answers clear, warm, and concise. Remember details the user shares, like their name,
skin type, or hair type, and use them in later answers.`;

/* ---------- DOM elements ---------- */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

/* ---------- Conversation history ---------- */
// We keep every message here so the AI remembers the whole conversation.
// The system prompt always goes first.
const messages = [{ role: "system", content: systemPrompt }];

/* ---------- Helper: add a message bubble ---------- */
// role is "user" or "ai". Returns the new bubble so we can change it later.
function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  // textContent (not innerHTML) so user text can't inject HTML
  bubble.textContent = text;
  chatWindow.appendChild(bubble);

  // Scroll to the newest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

// Show a greeting when the page loads
addMessage("ai", "👋 Hello! I'm your L'Oréal Smart Product Advisor. Ask me about products, routines, or recommendations!");

/* ---------- Handle form submit ---------- */
chatForm.addEventListener("submit", async (e) => {
  // Stop the page from reloading
  e.preventDefault();

  // Get what the user typed and remove extra spaces
  const question = userInput.value.trim();
  if (!question) return;

  // Show the user's latest question above the chat (resets each time)
  latestQuestion.textContent = `You asked: ${question}`;
  latestQuestion.hidden = false;

  // Show the user's message as a bubble and clear the input box
  addMessage("user", question);
  userInput.value = "";

  // Save the user's message to the conversation history
  messages.push({ role: "user", content: question });

  // Show a temporary "thinking" bubble
  const loadingBubble = addMessage("ai loading", "Thinking…");

  try {
    // Send the whole conversation to the Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    });

    // Turn the response into a JavaScript object
    const data = await response.json();

    // If OpenAI sent back an error (for example, a missing key), show it
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Get the assistant's reply text
    const reply = data.choices[0].message.content;

    // Replace the "thinking" bubble with the real reply
    loadingBubble.className = "msg ai";
    loadingBubble.textContent = reply;

    // Save the reply so the AI remembers it next time
    messages.push({ role: "assistant", content: reply });
  } catch (error) {
    // Something went wrong (bad URL, network issue, etc.)
    console.error(error);
    loadingBubble.className = "msg ai";
    loadingBubble.textContent = "Sorry, something went wrong. Please try again.";
  }

  // Keep the newest message in view
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
