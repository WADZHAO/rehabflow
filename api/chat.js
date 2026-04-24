import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT =
  "You are a PT assistant for meniscus tear and ankle effusion recovery. Evidence-based, concise (2-4 sentences). Detect language, respond in same language. Reference Mayo Clinic/AAOS/HSS when relevant. Always recommend consulting a doctor for serious concerns.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    res.status(200).json({ text });
  } catch (error) {
    console.error("Chat API error:", error);
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || "Internal server error" });
  }
}
