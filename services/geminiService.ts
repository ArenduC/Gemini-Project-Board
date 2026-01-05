
import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
// We initialize a single instance for the service.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const handleApiError = (error: any, action: string) => {
    console.error(`Neural Link Error [${action}]:`, error);
    
    // Extract specific error details if available from the Google GenAI SDK
    const message = error?.message || "Unknown neural interference.";
    
    if (message.includes('400') || message.includes('INVALID_ARGUMENT')) {
        throw new Error("Neural protocol mismatch (400). This often means the selected model is not yet available for your API key tier in this region.");
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

// FIX: Added missing VoiceCommandAction export for App.tsx
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

// FIX: Added missing SearchResponse export for GlobalSearchModal.tsx
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

// --- SERVICE METHODS ---

export const generateSubtasks = async (title: string, description: string): Promise<{title: string}[]> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Deconstruct this task into a JSON array of subtasks. Title: ${title}. Context: ${description}`,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: subtaskResponseSchema 
        },
    });
    // Access .text property directly (do not call as function)
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    handleApiError(error, 'generate subtasks');
    return [];
  }
};

export const generateTaskFromPrompt = async (prompt: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Synthesize a structured task object from this requirement: ${prompt}`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: taskResponseSchema 
            },
        });
        const text = response.text || "{}";
        return JSON.parse(text);
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
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Search query: "${query}". Context: ${JSON.stringify(context)}. Return matching IDs.`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: searchResponseSchema 
            },
        });
        const text = response.text || '{"projects":[], "tasks":[], "users":[]}';
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error, 'search');
        return { projects: [], tasks: [], users: [] };
    }
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Command: "${command}". Context: ${JSON.stringify(context)}. Identify action and params.`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: voiceCommandResponseSchema 
            },
        });
        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error, 'process voice');
        return { action: 'UNKNOWN', params: { reason: "Neural parsing failed." } };
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Create a full project plan (name, description, columns, tasks) from this CSV data:\n${truncateContent(csvContent)}`,
            config: { responseMimeType: "application/json" },
        });
        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error, 'parse project');
        throw error;
    }
};

export const generateBugsFromFile = async (fileContent: string, headers: string[]): Promise<BugResponse[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Extract bugs from this file. Headers: ${headers.join(',')}. Content:\n${truncateContent(fileContent)}`,
            config: { responseMimeType: "application/json" },
        });
        const text = response.text || "[]";
        return JSON.parse(text);
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
            model: "gemini-3-pro-preview",
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
