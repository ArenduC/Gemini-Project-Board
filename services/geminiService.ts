
import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// Always use named parameter for initialization
// process.env.API_KEY is handled by the execution environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const handleApiError = (error: unknown, action: string) => {
    console.error(`Error calling Gemini API for ${action}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('token count exceeds')) {
            throw new Error("Neural capacity exceeded. Use a smaller data segment.");
        }
        if (error.message.includes('API key expired') || error.message.includes('API_KEY_INVALID')) {
            throw new Error("Neural link expired. Please renew your API credentials.");
        }
    }
    throw new Error(`Neural processing failed during ${action}.`);
};

const truncateContent = (text: string, maxChars: number = 200000): string => {
    if (!text || typeof text !== 'string') return "";
    return text.length <= maxChars ? text : text.substring(0, maxChars) + "... [TRUNCATED]";
};

interface SubtaskResponse {
    title: string;
}

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

export interface TaskResponse {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate?: string;
}

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

export interface SearchResponse {
    projects: string[];
    tasks: string[];
    users: string[];
}

const searchResponseSchema = {
    type: Type.OBJECT,
    properties: {
        projects: { type: Type.ARRAY, items: { type: Type.STRING } },
        tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
        users: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["projects", "tasks", "users"]
};

export type VoiceCommandAction = 
  | { action: 'CREATE_TASK', params: { title: string, description?: string, priority?: TaskPriority } }
  | { action: 'MOVE_TASK', params: { taskTitle: string, targetColumnName: string } }
  | { action: 'ASSIGN_TASK', params: { taskTitle: string, assigneeName: string } }
  | { action: 'NAVIGATE', params: { destination: string } }
  | { action: 'OPEN_LINK', params: { linkTitle: string } }
  | { action: 'UNKNOWN', params: { reason: string } };

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

export const generateSubtasks = async (title: string, description: string): Promise<SubtaskResponse[]> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Deconstruct task into subtasks:\nTitle: ${title}\nContext: ${description}`,
        config: { responseMimeType: "application/json", responseSchema: subtaskResponseSchema },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    handleApiError(error, 'generate subtasks');
    return [];
  }
};

export const generateTaskFromPrompt = async (prompt: string): Promise<TaskResponse> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a structured task from requirements: ${prompt}`,
            config: { responseMimeType: "application/json", responseSchema: taskResponseSchema },
        });
        return JSON.parse(response.text || "{}");
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
            contents: `Identify IDs for "${query}" in context:\n${JSON.stringify(context)}`,
            config: { responseMimeType: "application/json", responseSchema: searchResponseSchema },
        });
        return JSON.parse(response.text || '{"projects":[], "tasks":[], "users":[]}');
    } catch (error) {
        handleApiError(error, 'search');
        return { projects: [], tasks: [], users: [] };
    }
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Interpret command: "${command}" with context:\n${JSON.stringify(context)}`,
            config: { responseMimeType: "application/json", responseSchema: voiceCommandResponseSchema },
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        handleApiError(error, 'process voice');
        return { action: 'UNKNOWN', params: { reason: "Parsing failure." } } as any;
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Suggest URLs for: ${projectName} (${projectDescription}). JSON array of {title, url}`,
            config: { responseMimeType: "application/json" },
        });
        return JSON.parse(response.text || "[]");
    } catch (error) {
        handleApiError(error, 'generate links');
        return [];
    }
};

export const generateProjectFromCsv = async (csvContent: string): Promise<AiGeneratedProjectPlan> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Create project plan from CSV:\n${truncateContent(csvContent)}`,
            config: { responseMimeType: "application/json" },
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        handleApiError(error, 'parse project');
        throw error;
    }
};

export const generateBugsFromFile = async (fileContent: string, headers: string[]): Promise<BugResponse[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Find bugs in file (Headers: ${headers.join(',')}). Content:\n${truncateContent(fileContent)}`,
            config: { responseMimeType: "application/json" },
        });
        return JSON.parse(response.text || "[]");
    } catch (error) {
        handleApiError(error, 'parse bugs');
        return [];
    }
};

export const generateTasksFromFile = async (fileData: { content: string; mimeType: string }, columnNames: string[], headers: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    try {
        const isText = fileData.mimeType.startsWith('text/') || fileData.mimeType === 'application/json' || fileData.mimeType === 'text/csv';
        const instruction = `Extract tasks for columns: ${columnNames.join(',')}. Headers: ${headers.join(',')}.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: isText 
                ? `${instruction}\n\nDATA:\n${truncateContent(fileData.content)}`
                : { parts: [{ text: instruction }, { inlineData: { mimeType: fileData.mimeType, data: fileData.content } }] },
            config: { responseMimeType: "application/json" },
        });

        return JSON.parse(response.text || "[]");
    } catch (error) {
        handleApiError(error, 'parse tasks from file');
        return [];
    }
};
