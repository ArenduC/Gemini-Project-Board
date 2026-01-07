
import { Type, GoogleGenAI } from "@google/genai";
import { TaskPriority, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// --- INTERFACES ---

export interface SearchResponse {
    projects: string[];
    tasks: string[];
    users: string[];
}

/**
 * Validates a Gemini API key.
 */
export const validateGeminiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || apiKey.length < 20) return false;
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash", 
            contents: "ping",
            config: { maxOutputTokens: 1 }
        });
        return !!response;
    } catch (error) {
        console.error("Key validation failed:", error);
        return false;
    }
};

/**
 * NEURAL LINK EXECUTION ENGINE
 * Only uses the User provided Key (BYOK).
 */
async function callGemini(model: string, prompt: string, schema?: any) {
    const apiKey = localStorage.getItem('user_gemini_api_key');

    if (!apiKey) {
        throw new Error("Neural link offline. Please provide an API key in Settings.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: model || "gemini-1.5-flash",
            contents: prompt,
            config: schema ? {
                responseMimeType: "application/json",
                responseSchema: schema
            } : undefined
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini.");
        
        return schema ? JSON.parse(text) : text;
    } catch (error: any) {
        console.error("Neural Link Error:", error);
        const errorStr = JSON.stringify(error).toLowerCase();
        
        if (errorStr.includes("401") || errorStr.includes("403")) {
            localStorage.removeItem('user_gemini_api_key');
            window.dispatchEvent(new Event('neural-link-lost'));
        }
        throw error;
    }
}

// --- STRUCTURED SCHEMAS ---

const subtaskResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Actionable subtask title." },
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
        params: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, taskTitle: { type: Type.STRING } } }
    },
    required: ['action', 'params']
};

const projectLinkResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, url: { type: Type.STRING } },
        required: ["title", "url"],
    },
};

const projectFromCsvResponseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        columns: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    tasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
                                subtasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } } } }
                            }
                        }
                    }
                }
            }
        }
    },
    required: ["name", "description", "columns"]
};

// --- EXPORTED ACTIONS ---

export const generateSubtasks = async (title: string, description: string): Promise<{title: string}[]> => {
    const prompt = `Break down into subtasks: "${title}". Context: "${description}"`;
    return await callGemini("gemini-1.5-flash", prompt, subtaskResponseSchema);
};

export const generateTaskFromPrompt = async (prompt: string): Promise<any> => {
    return await callGemini("gemini-1.5-flash", prompt, taskResponseSchema);
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<any> => {
    const prompt = `Command: "${command}". Context: ${JSON.stringify(context)}`;
    return await callGemini("gemini-1.5-flash", prompt, voiceCommandResponseSchema);
};

export const performGlobalSearch = async (query: string, projects: any, users: any): Promise<SearchResponse> => {
    const prompt = `Search for: "${query}" in project context: ${JSON.stringify({ projects: Object.keys(projects), users: Object.keys(users) })}`;
    return await callGemini("gemini-1.5-flash", prompt, searchResponseSchema);
};

export const generateProjectLinks = async (name: string, desc: string): Promise<any[]> => {
    const prompt = `Suggest resource links (GitHub, Figma, Docs) for: ${name} (${desc})`;
    return await callGemini("gemini-1.5-flash", prompt, projectLinkResponseSchema);
};

export const generateProjectFromCsv = async (csv: string): Promise<AiGeneratedProjectPlan> => {
    return await callGemini("gemini-1.5-pro", `Generate project plan from CSV data: ${csv}`, projectFromCsvResponseSchema);
};

export const generateBugsFromFile = async (content: string, headers: string[]): Promise<BugResponse[]> => {
    const prompt = `Extract bug reports from this content. Data: ${content}. Headers: ${headers}`;
    return await callGemini("gemini-1.5-flash", prompt, { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } } });
};

export const generateTasksFromFile = async (fileData: any, columns: string[], headers: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    const prompt = `Map file data to tasks for these columns: ${columns}. Headers: ${headers}. Data: ${fileData.content}`;
    return await callGemini("gemini-1.5-pro", prompt, { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, priority: { type: Type.STRING, enum: Object.values(TaskPriority) }, status: { type: Type.STRING } } } });
};
