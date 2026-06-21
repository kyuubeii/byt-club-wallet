/* global Buffer, process */

const MAX_TEXT_LENGTH = 12000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sessionDraft: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        venue: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        courtCount: { type: "number" },
        courtNumbers: { type: "string" },
        walkInLimit: { type: "number" },
        walkInFee: { type: "number" },
      },
      required: [
        "title",
        "venue",
        "date",
        "time",
        "courtCount",
        "courtNumbers",
        "walkInLimit",
        "walkInFee",
      ],
    },
    participants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rawName: { type: "string" },
          memberName: { type: "string" },
          walkInCount: { type: "number" },
          walkInNames: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["rawName", "memberName", "walkInCount", "walkInNames"],
      },
    },
    independentWalkins: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          status: {
            type: "string",
            enum: ["confirmed", "waiting"],
          },
        },
        required: ["name", "status"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["sessionDraft", "participants", "independentWalkins", "warnings"],
};

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

async function readRequestBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(rawBody || "{}");
}

function extractGeminiText(geminiResponse) {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

function sanitizeString(value) {
  return String(value || "").trim();
}

function sanitizeNumber(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeParsedPayload(payload) {
  const sessionDraft = payload?.sessionDraft || {};
  const participants = Array.isArray(payload?.participants)
    ? payload.participants
    : [];
  const independentWalkins = Array.isArray(payload?.independentWalkins)
    ? payload.independentWalkins
    : [];
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];

  return {
    sessionDraft: {
      title: sanitizeString(sessionDraft.title),
      venue: sanitizeString(sessionDraft.venue),
      date: sanitizeString(sessionDraft.date),
      time: sanitizeString(sessionDraft.time),
      courtCount: sanitizeNumber(sessionDraft.courtCount),
      courtNumbers: sanitizeString(sessionDraft.courtNumbers),
      walkInLimit: sanitizeNumber(sessionDraft.walkInLimit),
      walkInFee: sanitizeNumber(sessionDraft.walkInFee),
    },
    participants: participants.slice(0, 200).map((participant) => ({
      rawName: sanitizeString(participant.rawName),
      memberName: sanitizeString(participant.memberName),
      walkInCount: sanitizeNumber(participant.walkInCount),
      walkInNames: Array.isArray(participant.walkInNames)
        ? participant.walkInNames.slice(0, 10).map(sanitizeString).filter(Boolean)
        : [],
    })),
    independentWalkins: independentWalkins
      .slice(0, 80)
      .map((walkin) => ({
        name: sanitizeString(walkin.name),
        status: walkin.status === "waiting" ? "waiting" : "confirmed",
      }))
      .filter((walkin) => walkin.name !== ""),
    warnings: warnings.slice(0, 30).map(sanitizeString).filter(Boolean),
  };
}

function buildPrompt(text) {
  return `You are a strict JSON parser for a badminton club admin tool.

Extract structured data from this WhatsApp-style session list.

Rules:
- Return JSON only. No markdown, no explanations.
- Do not create members. Plain names are member candidates.
- "Teck - walk in 1" means memberName "Teck", walkInCount 1, walkInNames ["Teck walk-in 1"].
- Also treat these as member-attached walk-ins: "Jason +1", "Jason + 1", "Jason walk in 1", "Jason - WI 1", "Jason guest 1".
- Independent walk-ins only when the line clearly says "Walk-in Alex", "WI Alex", or "Alex - walk in".
- Do not assume unmatched names are walk-ins unless clearly marked.
- Add warnings for unclear date, time, venue, duplicated participant/member names, or uncertain interpretation.
- Use YYYY-MM-DD for date when possible.
- Keep time app-compatible, such as "8:00 PM - 10:00 PM".
- courtNumbers should keep text like "10 & 11" when present.
- If a number cannot be found, return 0 for numeric fields.

Session list:
${text}`;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    sendJson(response, 500, { error: "Gemini API key is not configured" });
    return;
  }

  let body;

  try {
    body = await readRequestBody(request);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body" });
    return;
  }

  const text = sanitizeString(body?.text);

  if (!text) {
    sendJson(response, 400, { error: "Session list text is required" });
    return;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    sendJson(response, 413, { error: "Session list text is too long" });
    return;
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(text) }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      sendJson(response, 502, { error: "Unable to parse session list" });
      return;
    }

    const geminiPayload = await geminiResponse.json();
    const parsedText = extractGeminiText(geminiPayload);
    const parsedPayload = JSON.parse(parsedText);

    sendJson(response, 200, normalizeParsedPayload(parsedPayload));
  } catch (error) {
    console.error("Gemini session parser failed:", error?.message || error);
    sendJson(response, 502, { error: "Unable to parse session list" });
  }
}
