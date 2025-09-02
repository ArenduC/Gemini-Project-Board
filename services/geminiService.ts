import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY } from '../config';

// Add a check to ensure credentials are configured, preventing a crash.
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  throw new Error("Gemini API Key is not configured. Please update the `config.ts` file.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface SubtaskResponse {
    title: string;
}

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "A short, actionable title for the subtask."
            },
        },
        required: ["title"],
    },
};

/**
 * Generates a list of subtasks for a given parent task using the Gemini API.
 * @param title The title of the parent task.
 * @param description The description of the parent task.
 * @returns A promise that resolves to an array of subtask objects.
 */
export const generateSubtasks = async (title: string, description: string): Promise<SubtaskResponse[]> => {
  try {
    const prompt = `
      Based on the following main task, break it down into smaller, actionable subtasks. 
      Each subtask should be a clear, concise action item. 
      Provide only the JSON array of subtasks.

      Main Task Title: "${title}"
      Main Task Description: "${description}"
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        console.warn("Gemini API returned an empty response for subtasks.");
        return [];
    }

    const parsedResponse = JSON.parse(jsonText);
    
    // Basic validation to ensure the response is an array of objects with a title
    if (Array.isArray(parsedResponse) && parsedResponse.every(item => typeof item === 'object' && item !== null && 'title' in item)) {
        return parsedResponse as SubtaskResponse[];
    } else {
        console.error("Invalid JSON structure received from Gemini API:", parsedResponse);
        throw new Error("AI response was not in the expected format.");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a more user-friendly error message
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
        throw new Error("The Gemini API key is invalid or missing. Please check your `config.ts` file.");
    }
    throw new Error("Failed to generate subtasks from AI. Please try again later.");
  }
};