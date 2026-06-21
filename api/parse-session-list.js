/* global Buffer, process */

const MAX_TEXT_LENGTH = 12000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
        maxPlayers: { type: "number" },
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
        "maxPlayers",
      ],
    },
    memberCandidates: {
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
    walkins: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          rawName: { type: "string" },
          name: { type: "string" },
          status: {
            type: "string",
            enum: ["confirmed", "waiting"],
          },
          source: {
            type: "string",
            enum: ["main_list", "waiting_list", "unknown"],
          },
        },
        required: ["rawName", "name", "status", "source"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["sessionDraft", "memberCandidates", "walkins", "warnings"],
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

function uniqueStrings(values) {
  const seenValues = new Set();

  return values.filter((value) => {
    const normalizedValue = value.toLowerCase();

    if (seenValues.has(normalizedValue)) {
      return false;
    }

    seenValues.add(normalizedValue);
    return true;
  });
}

function sanitizeParticipant(participant) {
  return {
    rawName: sanitizeString(participant.rawName),
    memberName: sanitizeString(participant.memberName),
    walkInCount: sanitizeNumber(participant.walkInCount),
    walkInNames: Array.isArray(participant.walkInNames)
      ? participant.walkInNames.slice(0, 10).map(sanitizeString).filter(Boolean)
      : [],
  };
}

function sanitizeWalkin(walkin) {
  return {
    rawName: sanitizeString(walkin.rawName || walkin.name),
    name: sanitizeString(walkin.name),
    status: walkin.status === "waiting" ? "waiting" : "confirmed",
    source:
      walkin.source === "waiting_list" || walkin.status === "waiting"
        ? "waiting_list"
        : walkin.source === "main_list"
          ? "main_list"
          : "unknown",
  };
}

function parseDateToIso(value) {
  const match = String(value || "").match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);

  if (!match) {
    return "";
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function formatDisplayTime(hours, minutes, period) {
  let displayHours = Number(hours);
  const displayMinutes = Number(minutes || 0);
  const displayPeriod = String(period || "").toUpperCase();

  if (!displayPeriod) {
    return "";
  }

  if (displayHours > 12) {
    displayHours -= 12;
  }

  if (displayHours === 0) {
    displayHours = 12;
  }

  return `${displayHours}:${String(displayMinutes).padStart(2, "0")} ${displayPeriod}`;
}

function parseTimeRange(value) {
  const normalizedValue = String(value || "")
    .replaceAll("⚠️", " ")
    .replace(/\s+/g, " ");
  const match = normalizedValue.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
  );

  if (!match) {
    return "";
  }

  const endPeriod = match[6].toUpperCase();
  const startPeriod = (match[3] || endPeriod).toUpperCase();
  const startTime = formatDisplayTime(match[1], match[2], startPeriod);
  const endTime = formatDisplayTime(match[4], match[5], endPeriod);

  return startTime && endTime ? `${startTime} - ${endTime}` : "";
}

function normalizeWalkinLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s*-\s*/g, " ")
    .replace(/\bwalk\s*in\b/gi, "walk-in")
    .replace(/\bwalkin\b/gi, "walk-in")
    .replace(/\bwi\b/gi, "walk-in")
    .replace(/\s+/g, " ");
}

function getWalkinSlotLabel(value) {
  const rawValue = sanitizeString(value);
  const walkinMatch = rawValue.match(
    /\b(?:walk\s*in|walk-in|walkin|wi)\s*(\d+)\b/i
  );

  if (!walkinMatch) {
    return "";
  }

  return normalizeWalkinLabel(rawValue);
}

function parseAttachedGuestQuantity(value) {
  const rawValue = sanitizeString(value);
  const quantityMatch = rawValue.match(
    /^(.*?)\s*(?:\+\s*(\d+)|(?:bring|with)\s+(\d+)\s*(?:guest|guests|pax)?)\b/i
  );

  if (!quantityMatch) {
    return null;
  }

  const memberName = sanitizeString(quantityMatch[1]).replace(/\s*-\s*$/, "");
  const count = Number(quantityMatch[2] || quantityMatch[3] || 0);

  if (!memberName || count <= 0) {
    return null;
  }

  return {
    rawName: rawValue,
    memberName,
    walkInCount: count,
    walkInNames: Array.from({ length: count }, (_, index) =>
      `${memberName} guest ${index + 1}`
    ),
  };
}

function parseIndependentWalkinName(value) {
  const rawValue = sanitizeString(value);
  const prefixMatch = rawValue.match(/^(?:walk\s*in|walk-in|walkin|wi)\s+(.+)$/i);
  const suffixMatch = rawValue.match(/^(.+?)\s*-\s*(?:walk\s*in|walk-in|walkin)$/i);

  if (prefixMatch) {
    return normalizeWalkinLabel(prefixMatch[1]);
  }

  if (suffixMatch) {
    return normalizeWalkinLabel(suffixMatch[1]);
  }

  return "";
}

function extractSessionHintsFromText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => sanitizeString(line))
    .filter(Boolean);
  const dateLineIndex = lines.findIndex((line) => parseDateToIso(line));
  const date = dateLineIndex >= 0 ? parseDateToIso(lines[dateLineIndex]) : "";
  const timeLine = lines.find((line) => parseTimeRange(line)) || "";
  const courtLine =
    lines.find((line) => /\b\d+\s*courts?\b/i.test(line)) || "";
  const walkinInfoLine =
    lines.find((line) => /walk\s*in.*(?:max|rm)/i.test(line)) || "";
  const fullLine = lines.find((line) => /\b\d+\s*pax\s*full\b/i.test(line)) || "";
  const nearbyHeaderLines =
    dateLineIndex >= 0
      ? lines
          .slice(0, dateLineIndex)
          .filter(
            (line) =>
              !parseTimeRange(line) &&
              !/\bplease\b/i.test(line) &&
              !/\bcourt\b/i.test(line)
          )
      : [];
  const title = nearbyHeaderLines.at(-2) || "";
  const venue = nearbyHeaderLines.at(-1) || "";
  const courtCountMatch = courtLine.match(/\b(\d+)\s*courts?\b/i);
  const courtNumbersMatch = courtLine.match(/\(([^)]*\d[^)]*)\)/);
  const walkInLimitMatch = walkinInfoLine.match(/max\s*(\d+)/i);
  const walkInFeeMatch = walkinInfoLine.match(/rm\s*([0-9]+(?:\.[0-9]+)?)/i);
  const maxPlayersMatch = fullLine.match(/\b(\d+)\s*pax\s*full\b/i);

  return {
    title,
    venue,
    date,
    time: timeLine ? parseTimeRange(timeLine) : "",
    courtCount: courtCountMatch ? Number(courtCountMatch[1]) : 0,
    courtNumbers: courtNumbersMatch ? sanitizeString(courtNumbersMatch[1]) : "",
    walkInLimit: walkInLimitMatch ? Number(walkInLimitMatch[1]) : 0,
    walkInFee: walkInFeeMatch ? Number(walkInFeeMatch[1]) : 0,
    maxPlayers: maxPlayersMatch ? Number(maxPlayersMatch[1]) : 0,
  };
}

function extractParticipantsFromText(text) {
  const rows = [];
  let isWaitingList = false;

  String(text || "")
    .split(/\r?\n/)
    .map((line) => sanitizeString(line))
    .filter(Boolean)
    .forEach((line) => {
      if (/^waiting\s*list\b/i.test(line)) {
        isWaitingList = true;
        return;
      }

      const numberedMatch = line.match(/^\d+[.)]\s*(.+)$/);

      if (!numberedMatch) {
        return;
      }

      const rawName = sanitizeString(numberedMatch[1]);
      const walkinSlotLabel = getWalkinSlotLabel(rawName);
      const independentWalkinName = parseIndependentWalkinName(rawName);
      const status = isWaitingList ? "waiting" : "confirmed";
      const source = isWaitingList ? "waiting_list" : "main_list";

      if (walkinSlotLabel || independentWalkinName) {
        rows.push({
          type: "walkin",
          rawName,
          name: walkinSlotLabel || independentWalkinName,
          status,
          source,
        });
        return;
      }

      const attachedGuest = parseAttachedGuestQuantity(rawName);

      if (attachedGuest) {
        rows.push({
          type: "member",
          ...attachedGuest,
        });
        return;
      }

      rows.push({
        type: "member",
        rawName,
        memberName: rawName,
        walkInCount: 0,
        walkInNames: [],
      });
    });

  return {
    memberCandidates: rows
      .filter((row) => row.type === "member")
      .map(sanitizeParticipant),
    walkins: rows
      .filter((row) => row.type === "walkin")
      .map(sanitizeWalkin),
  };
}

function normalizeParsedPayload(payload, sourceText = "") {
  const sessionDraft = payload?.sessionDraft || {};
  const sourceHints = extractSessionHintsFromText(sourceText);
  const sourceRows = extractParticipantsFromText(sourceText);
  const memberCandidates = Array.isArray(payload?.memberCandidates)
    ? payload.memberCandidates
    : Array.isArray(payload?.participants)
      ? payload.participants
      : [];
  const walkins = Array.isArray(payload?.walkins)
    ? payload.walkins
    : Array.isArray(payload?.independentWalkins)
      ? payload.independentWalkins
      : [];
  const normalizedMemberCandidates =
    sourceRows.memberCandidates.length > 0
      ? sourceRows.memberCandidates
      : memberCandidates.slice(0, 200).map(sanitizeParticipant);
  const normalizedWalkins =
    sourceRows.walkins.length > 0
      ? sourceRows.walkins
      : walkins
          .slice(0, 80)
          .map(sanitizeWalkin)
          .filter((walkin) => walkin.name !== "");
  const confirmedParticipantCount =
    normalizedMemberCandidates.reduce(
      (total, participant) => total + 1 + Number(participant.walkInCount || 0),
      0
    ) +
    normalizedWalkins.filter((walkin) => walkin.status === "confirmed").length;
  const rawWarnings = Array.isArray(payload?.warnings)
    ? payload.warnings.map(sanitizeString).filter(Boolean)
    : [];
  const warningBlocklist = [
    /duplicate/i,
    /calculated total/i,
    /total.*(?:pax|participant)/i,
    /date.*(?:missing|required|unclear)/i,
    /time.*(?:missing|required|unclear)/i,
    /venue.*(?:missing|required|unclear)/i,
  ];
  const warnings =
    sourceRows.walkins.length > 0
      ? rawWarnings.filter(
          (warning) =>
            !warningBlocklist.some((pattern) => pattern.test(warning))
        )
      : rawWarnings;

  return {
    sessionDraft: {
      title: sanitizeString(sourceHints.title || sessionDraft.title),
      venue: sanitizeString(sourceHints.venue || sessionDraft.venue),
      date: sanitizeString(sourceHints.date || sessionDraft.date),
      time: sanitizeString(sourceHints.time || sessionDraft.time),
      courtCount: sanitizeNumber(
        sourceHints.courtCount || sessionDraft.courtCount
      ),
      courtNumbers: sanitizeString(
        sourceHints.courtNumbers || sessionDraft.courtNumbers
      ),
      walkInLimit: sanitizeNumber(
        sourceHints.walkInLimit || sessionDraft.walkInLimit
      ),
      walkInFee: sanitizeNumber(sourceHints.walkInFee || sessionDraft.walkInFee),
      maxPlayers: sanitizeNumber(
        sourceHints.maxPlayers || sessionDraft.maxPlayers || confirmedParticipantCount
      ),
    },
    memberCandidates: normalizedMemberCandidates,
    walkins: normalizedWalkins,
    participants: normalizedMemberCandidates,
    independentWalkins: normalizedWalkins,
    warnings: uniqueStrings(warnings.slice(0, 30)),
  };
}

function buildPrompt(text) {
  return `You are a strict JSON parser for a badminton club admin tool.

Extract structured data from this WhatsApp-style session list.

Rules:
- Return JSON only. No markdown, no explanations.
- Do not create members. Plain names are member candidates.
- In BYT numbered WhatsApp lists, "Teck - walk in 1", "Hua - walk in 2", "Hua - WI 3", and "Jason walk in 1" are ONE walk-in participant rows. The number is the walk-in slot label/order, not a guest quantity.
- Put numbered walk-in slot-label rows in walkins, not memberCandidates.
- Preserve walk-in labels as names such as "Teck walk-in 1" and "Hua walk-in 2".
- Rows below a "Waiting list" heading are status "waiting"; rows above it are status "confirmed".
- Only treat "+1", "+ 2", "bring 2", or "with 2 guests" as member-attached guest quantity in memberCandidates.
- "Jason +1" means memberName "Jason", walkInCount 1, walkInNames ["Jason guest 1"].
- Plain names are memberCandidates.
- Duplicate warnings should only be for exact duplicate confirmed member candidates, not when a similar name appears in a walk-in slot label or waiting list walk-in.
- If text says "14 pax FULL", set sessionDraft.maxPlayers to 14.
- Add warnings only for genuinely unclear required session details or uncertain interpretation.
- Use YYYY-MM-DD for date when possible.
- Keep time app-compatible, such as "8:00 PM - 10:00 PM".
- courtNumbers should keep text like "10 & 11" when present.
- If a number cannot be found, return 0 for numeric fields.
- Return this JSON shape:
{
  "sessionDraft": {
    "title": "",
    "venue": "",
    "date": "YYYY-MM-DD",
    "time": "",
    "courtCount": 0,
    "courtNumbers": "",
    "walkInLimit": 0,
    "walkInFee": 0,
    "maxPlayers": 0
  },
  "memberCandidates": [
    {
      "rawName": "",
      "memberName": "",
      "walkInCount": 0,
      "walkInNames": []
    }
  ],
  "walkins": [
    {
      "rawName": "",
      "name": "",
      "status": "confirmed",
      "source": "main_list"
    }
  ],
  "warnings": []
}

Session list:
${text}`;
}

function buildGeminiRequestBody(text, mode) {
  const baseBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(text) }],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  if (mode === "responseFormat") {
    return {
      ...baseBody,
      generationConfig: {
        ...baseBody.generationConfig,
        responseFormat: {
          text: {
            mimeType: "application/json",
            schema: responseSchema,
          },
        },
      },
    };
  }

  if (mode === "responseSchema") {
    return {
      ...baseBody,
      generationConfig: {
        ...baseBody.generationConfig,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    };
  }

  return {
    ...baseBody,
    generationConfig: {
      ...baseBody.generationConfig,
      responseMimeType: "application/json",
    },
  };
}

async function callGeminiParser(apiKey, text, mode) {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildGeminiRequestBody(text, mode)),
    }
  );

  if (!geminiResponse.ok) {
    const errorPayload = await geminiResponse.json().catch(() => ({}));
    const geminiError =
      errorPayload?.error?.message || `Gemini returned ${geminiResponse.status}`;

    return {
      ok: false,
      error: `${mode}: ${geminiError}`,
    };
  }

  return {
    ok: true,
    payload: await geminiResponse.json(),
  };
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
    const parserModes = ["responseFormat", "responseSchema", "jsonMode"];
    const parserErrors = [];
    let geminiPayload = null;

    for (const mode of parserModes) {
      const parserResult = await callGeminiParser(apiKey, text, mode);

      if (parserResult.ok) {
        geminiPayload = parserResult.payload;
        break;
      }

      parserErrors.push(parserResult.error);
    }

    if (!geminiPayload) {
      console.error("Gemini parser request failed:", parserErrors.join(" | "));
      sendJson(response, 502, {
        error: "Gemini request failed",
        details: parserErrors[parserErrors.length - 1] || "No Gemini response",
      });
      return;
    }

    const parsedText = extractGeminiText(geminiPayload);
    const parsedPayload = JSON.parse(parsedText);

    sendJson(response, 200, normalizeParsedPayload(parsedPayload, text));
  } catch (error) {
    console.error("Gemini session parser failed:", error?.message || error);
    sendJson(response, 502, {
      error: "Unable to parse session list",
      details: error?.message || "Unknown parser error",
    });
  }
}
