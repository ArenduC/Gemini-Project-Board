
import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// Initialize the AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Model Constants
const FLASH_MODEL = "gemini-3-flash-preview";
const PRO_MODEL = "gemini-3-pro-preview";
const FALLBACK_MODEL = "gemini-flash-lite-latest"; // Universal stable fallback

const handleApiError = (error: any, action: string) => {
    console.error(`Neural Link Error [${action}]:`, error);
    const message = error?.message || "Unknown neural interference.";
    
    if (message.includes('400') || message.includes('INVALID_ARGUMENT')) {
        throw new Error("Neural protocol mismatch (400). The selected model (Gemini 3) might not be available in your region or for your API tier yet. Try a different region in Google Cloud Console or wait for the roll-out.");
    }
    if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
        throw new Error("Neural access denied (403). Please verify your API key permissions and billing status.");
    }
    if (message.includes('401') || message.includes('API_KEY_INVALID')) {
        throw new Error("Neural link unauthorized (401). Your API key is invalid or has expired.");
    }
    
    throw new Error(`Neural processing failed: ${message}`);
};

const truncateContent = (text: string, maxChars: number = 100000): string => {
    if (!text || typeof text !== 'string') return "";
    return text.length <= maxChars ? text : text.substring(0, maxChars) + "... [DATA TRUNCATED]";
};

// --- INTERFACES ---

export interface VoiceCommandAction {
    action: 'CREATE_TASK' | 'MOVE_TASK' | 'ASSIGN_TASK' | 'NAVIGATE' | 'OPEN_LINK' | 'UNKNOWN';
    params: {
        title: string;
        description?: string;
        priority?: TaskPriority;
        taskTitle?: string;
        targetColumnName?: string;
        assigneeName?: string;
        destination?: string;
        linkTitle?: string;
        reason?: string;
    };
}

export interface SearchResponse {
    projects: string[];
    tasks: string[];
    users: string[];
}

// --- SCHEMAS ---

const subtaskResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Short actionable subtask title." }
        },
        required: ["title"],
    },
};

const taskResponseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
        dueDate: { type: Type.STRING }
    },
    required: ["title", "description", "priority"]
};

const searchResponseSchema = {
    type: Type.OBJECT,
    properties: {
        projects: { type: Type.ARRAY, items: { type: Type.STRING } },
        tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
        users: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["projects", "tasks", "users"]
};

const voiceCommandResponseSchema = {
    type: Type.OBJECT,
    properties: {
        action: { type: Type.STRING, enum: ['CREATE_TASK', 'MOVE_TASK', 'ASSIGN_TASK', 'NAVIGATE', 'OPEN_LINK', 'UNKNOWN'] },
        params: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
                taskTitle: { type: Type.STRING },
                targetColumnName: { type: Type.STRING },
                assigneeName: { type: Type.STRING },
                destination: { type: Type.STRING },
                linkTitle: { type: Type.STRING },
                reason: { type: Type.STRING }
            }
        }
    },
    required: ['action', 'params']
};

// --- UTILITY: SMART GENERATE (With Fallback) ---

async function smartGenerate(contents: string, schema: any, modelPreference: string = FLASH_MODEL) {
    try {
        const response = await ai.models.generateContent({
            model: modelPreference,
            contents,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: schema 
            },
        });
        return response.text || "";
    } catch (error: any) {
        // If it's a 404 or 400 (Model not found/available), try the stable fallback
        if (error?.message?.includes('404') || error?.message?.includes('400') || error?.message?.includes('not found')) {
            console.warn(`Model ${modelPreference} unavailable. Falling back to stability mode...`);
            const fallbackResponse = await ai.models.generateContent({
                model: FALLBACK_MODEL,
                contents,
                config: { 
                    responseMimeType: "application/json", 
                    responseSchema: schema 
                },
            });
            return fallbackResponse.text || "";
        }
        throw error;
    }
}

// --- SERVICE METHODS ---

export const generateSubtasks = async (title: string, description: string): Promise<{title: string}[]> => {
  try {
    const text = await smartGenerate(
        `Deconstruct this task into subtasks. Title: ${title}. Context: ${description}`,
        subtaskResponseSchema
    );
    return JSON.parse(text || "[]");
  } catch (error) {
    handleApiError(error, 'generate subtasks');
    return [];
  }
};

export const generateTaskFromPrompt = async (prompt: string): Promise<any> => {
    try {
        const text = await smartGenerate(
            `Generate a task from this requirement: ${prompt}`,
            taskResponseSchema
        );
        return JSON.parse(text || "{}");
    } catch (error) {
        handleApiError(error, 'generate task');
        throw error;
    }
};

export const performGlobalSearch = async (query: string, projects: Record<string, Project>, users: Record<string, User>): Promise<SearchResponse> => {
    try {
        const context = {
            projects: Object.values(projects).map(p => ({ id: p.id, name: p.name })),
            users: Object.values(users).map(u => ({ id: u.id, name: u.name })),
            tasks: Object.values(projects).flatMap(p => Object.values(p.board.tasks).map(t => ({ id: t.id, title: t.title }))).slice(0, 100)
        };
        const text = await smartGenerate(
            `Search query: "${query}". Context: ${JSON.stringify(context)}. Return matching IDs.`,
            searchResponseSchema,
            PRO_MODEL
        );
        return JSON.parse(text || '{"projects":[], "tasks":[], "users":[]}');
    } catch (error) {
        handleApiError(error, 'search');
        return { projects: [], tasks: [], users: [] };
    }
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    try {
        const text = await smartGenerate(
            `Interpret command: "${command}". Context: ${JSON.stringify(context)}. Identify action and params.`,
            voiceCommandResponseSchema,
            PRO_MODEL
        );
        return JSON.parse(text || "{}");
    } catch (error) {
        handleApiError(error, 'process voice');
        // FIX: Added 'title' property to the params object to satisfy the VoiceCommandAction interface.
        return { action: 'UNKNOWN', params: { title: '', reason: "Neural parsing failed." } };
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: `Generate suggested resource URLs for project: ${projectName}. Description: ${projectDescription}. Return JSON array of {title, url}.`,
            config: { responseMimeType: "application/json" },
        });
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error, 'generate links');
        return [];
    }
};

export const generateProjectFromCsv = async (csvContent: string): Promise<AiGeneratedProjectPlan> => {
    try {
        const text = await smartGenerate(
            `Create a full project plan from this CSV data:\n${truncateContent(csvContent)}`,
            null, // No strict schema here as it's a deep object, reliance on system prompt
            PRO_MODEL
        );
        return JSON.parse(text || "{}");
    } catch (error) {
        handleApiError(error, 'parse project');
        throw error;
    }
};

export const generateBugsFromFile = async (fileContent: string, headers: string[]): Promise<BugResponse[]> => {
    try {
        const text = await smartGenerate(
            `Extract bugs from this file. Headers: ${headers.join(',')}. Content:\n${truncateContent(fileContent)}`,
            null,
            PRO_MODEL
        );
        return JSON.parse(text || "[]");
    } catch (error) {
        handleApiError(error, 'parse bugs');
        return [];
    }
};

export const generateTasksFromFile = async (fileData: { content: string; mimeType: string }, columnNames: string[], headers: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    try {
        const isText = fileData.mimeType.startsWith('text/') || fileData.mimeType === 'application/json' || fileData.mimeType === 'text/csv';
        const instruction = `Extract tasks for these columns: ${columnNames.join(',')}. Data headers: ${headers.join(',')}. Return JSON array.`;

        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: isText 
                ? `${instruction}\n\nDATA:\n${truncateContent(fileData.content)}`
                : { parts: [{ text: instruction }, { inlineData: { mimeType: fileData.mimeType, data: fileData.content } }] },
            config: { responseMimeType: "application/json" },
        });

        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error, 'parse tasks from file');
        return [];
    }
};
