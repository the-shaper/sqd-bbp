import { GoogleGenAI } from "@google/genai";
import type { GenerateTextParams } from "../types";

function isConfiguredValue(value?: string): boolean {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;

  return !normalized.includes("YOUR_") && !normalized.includes("MY_");
}

export function hasGoogleApiKey(): boolean {
  return isConfiguredValue(process.env.GOOGLE_API_KEY) || isConfiguredValue(process.env.GEMINI_API_KEY);
}

function getGoogleClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!isConfiguredValue(apiKey)) {
    throw new Error("Missing GOOGLE_API_KEY or GEMINI_API_KEY for Google AI provider.");
  }

  return new GoogleGenAI({ apiKey });
}

export async function generateWithGoogle(params: GenerateTextParams): Promise<string> {
  const ai = getGoogleClient();

  if (params.message) {
    const chat = ai.chats.create({
      model: params.model,
      config: {
        systemInstruction: params.systemInstruction,
      },
      history: (params.history || []).map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.text }],
      })),
    });

    const response = await chat.sendMessage({ message: params.message });
    return response.text || "";
  }

  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.prompt || "",
    config: {
      ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
      ...(params.responseSchema ? { responseSchema: params.responseSchema } : {}),
    },
  });

  return response.text || "";
}
