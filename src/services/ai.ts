import { GoogleGenAI, Type } from "@google/genai";
import { CardData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ModelType = 'gemini-3.1-pro-preview' | 'minimax-m2.5-free' | 'minimax-m2.5';

async function callOpencode(prompt: string, model: string = 'minimax-m2.5'): Promise<string> {
  try {
    const response = await fetch("/api/opencode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, model })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: await response.text() };
      }
      const errorMessage = typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : errorData.error;
      throw new Error(errorMessage || `Opencode API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.warn("Opencode API failed, falling back to Gemini:", error);
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    return fallbackResponse.text || "";
  }
}

export async function generateCards(client: string, background: string, notes: string, model: ModelType = 'minimax-m2.5'): Promise<CardData[]> {
  const prompt = `
    You are an expert presentation strategist using the "Beyond Bulletpoints" methodology.
    Based on the following project context, generate ideas for the Act I story structure.

    Client: ${client || 'Unknown Client'}
    Background: ${background || 'No background provided.'}
    Additional Notes: ${notes || 'None.'}

    Generate 2-3 ideas for each of the following sections:
    - place: The setting or current situation of the audience/client.
    - role: The role the audience/client plays in this setting.
    - challenge: The main problem or obstacle they are facing.
    - point_a: Where they are right now (the starting point).
    - point_b: Where they need to be (the desired destination).
    - change: The transformation or action required to get from A to B.

    Make the ideas concise, engaging, and directly related to the provided context.
    Address the business/client directly in the third person (e.g., "You are...", "They are...").
    
    IMPORTANT: You must return ONLY a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
    Ensure all double quotes inside the content strings are properly escaped (e.g., \\").
    Each object must have exactly two properties:
    - "section": Must be one of: "place", "role", "challenge", "point_a", "point_b", "change"
    - "content": The idea content as a string.
  `;

  try {
    let jsonStr = "[]";
    
    if (model === 'gemini-3.1-pro-preview') {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section: {
                  type: Type.STRING,
                  description: "Must be one of: place, role, challenge, point_a, point_b, change"
                },
                content: {
                  type: Type.STRING,
                  description: "The idea content."
                }
              },
              required: ["section", "content"]
            }
          }
        }
      });
      jsonStr = response.text || "[]";
    } else {
      const responseText = await callOpencode(prompt, model);
      // Clean up potential markdown formatting and extract just the JSON array
      let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const startIndex = cleanedText.indexOf('[');
      const endIndex = cleanedText.lastIndexOf(']');
      
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        jsonStr = cleanedText.substring(startIndex, endIndex + 1);
      } else {
        jsonStr = cleanedText;
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse JSON from model:", jsonStr);
      // Attempt a very basic cleanup of unescaped quotes inside strings if possible, 
      // but usually it's better to just throw and let the user retry.
      throw new Error("The AI model returned malformed JSON. Please try again.");
    }
    
    const validSections = ['place', 'role', 'challenge', 'point_a', 'point_b', 'change'];
    
    return parsed
      .filter((item: any) => validSections.includes(item.section))
      .map((item: any, index: number) => ({
        id: `gen-c${index}`,
        section: item.section as any,
        content: item.content,
        starred: false
      }));
  } catch (error) {
    console.error("Error generating cards:", error);
    throw error;
  }
}

export async function generateSingleIdea(client: string, background: string, notes: string, section: string, model: ModelType = 'minimax-m2.5'): Promise<string> {
  const prompt = `
    You are an expert presentation strategist using the "Beyond Bulletpoints" methodology.
    Based on the following project context, generate ONE concise, engaging idea for the "${section}" section of Act I.

    Client: ${client || 'Unknown Client'}
    Background: ${background || 'No background provided.'}
    Additional Notes: ${notes || 'None.'}

    Section definitions:
    - place: The setting or current situation of the audience/client.
    - role: The role the audience/client plays in this setting.
    - challenge: The main problem or obstacle they are facing.
    - point_a: Where they are right now (the starting point).
    - point_b: Where they need to be (the desired destination).
    - change: The transformation or action required to get from A to B.
    - story: A creative tale that takes the reader on a short journey, establishing a setting, showing the hurdles and mapping out the path to success.

    Address the business/client directly in the third person (e.g., "You are...", "They are...").
    Return ONLY the idea text, nothing else.
  `;

  try {
    if (model === 'gemini-3.1-pro-preview') {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });
      return response.text?.trim() || "Generated idea";
    } else {
      const responseText = await callOpencode(prompt);
      return responseText.trim() || "Generated idea";
    }
  } catch (error) {
    console.error("Error generating single idea:", error);
    throw error;
  }
}

export async function generateTransformationStory(client: string, background: string, notes: string, chainText: string, model: ModelType = 'minimax-m2.5'): Promise<string> {
  const prompt = `
    You are an expert presentation strategist using the "Beyond Bulletpoints" methodology.
    Based on the following project context and the sequence of connected ideas (the story chain), generate a cohesive, creative transformation story (a hero's journey for a business).
    This story should represent the transformation or action required to resolve the story chain and get the client from their current state to their desired destination.

    Client: ${client || 'Unknown Client'}
    Background: ${background || 'No background provided.'}
    Additional Notes: ${notes || 'None.'}

    Story Chain (Connected Ideas):
    ${chainText}

    The story should be an arc following the logical steps of the card columns: Place > Role > Challenge > Point A > Point B > Change.
    Address the business/client directly in the third person (e.g., "You summoned your small team...", "They realized...").
    Write a creative tale that takes the reader on a short journey, establishing a setting, showing the hurdles, and mapping out the path to success.
    Make it dynamic, engaging, and directly connected to the provided nodes.
    Keep it concise but impactful (around 2-3 paragraphs).

    Return ONLY the transformation story text, nothing else.
  `;

  try {
    if (model === 'gemini-3.1-pro-preview') {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });
      return response.text?.trim() || "Generated transformation story";
    } else {
      const responseText = await callOpencode(prompt, model);
      return responseText.trim() || "Generated transformation story";
    }
  } catch (error) {
    console.error("Error generating transformation story:", error);
    throw error;
  }
}

export async function generateChatResponse(client: string, background: string, notes: string, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], model: ModelType = 'gemini-3.1-pro-preview', mode: 'new' | 'canvas' = 'canvas'): Promise<string> {
  let systemInstruction = '';

  if (mode === 'new') {
    systemInstruction = `
      You are an expert presentation strategist using the "Beyond Bulletpoints" methodology.
      Your goal is to conduct a guided Q&A to help the user define a comprehensive project background.
      
      You must ask the user the following questions to gather information. 
      CRITICAL RULE: You MUST ask exactly ONE question at a time. Never ask multiple questions in a single message. Wait for the user to answer the current question before moving to the next one.
      
      The questions to ask (one by one) are:
      - Who is the client?
      - What is their project about?
      - What is their current need?
      - Why are you helping them?
      - Anything else you'd like to add?
      
      IMPORTANT: Do NOT number the questions (e.g., do not say "Question 1 of 5" or "First question:"). Just ask the questions naturally in order.
      
      Current known info (if any):
      Client: ${client || 'Unknown'}
      Background: ${background || 'None'}
      Notes: ${notes || 'None'}
      
      Once you have gathered the answers to ALL these questions, you MUST generate a cohesive, professional "Project Background" summary. Present this final background clearly so the user can easily copy and paste it into their project details.
    `;
  } else {
    systemInstruction = `
      You are an expert presentation strategist using the "Beyond Bulletpoints" methodology.
      Help the user brainstorm and refine their project background, client details, and notes.
      
      Current Project Context:
      Client: ${client || 'Unknown Client'}
      Background: ${background || 'No background provided.'}
      Additional Notes: ${notes || 'None.'}
      
      Provide concise, helpful, and strategic advice.
    `;
  }

  try {
    if (model === 'gemini-3.1-pro-preview') {
      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction,
        },
        history: history,
      });
      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't generate a response.";
    } else {
      const prompt = `${systemInstruction}\n\nHistory:\n${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nUser: ${message}\nModel:`;
      const responseText = await callOpencode(prompt, model);
      return responseText.trim() || "I'm sorry, I couldn't generate a response.";
    }
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}
