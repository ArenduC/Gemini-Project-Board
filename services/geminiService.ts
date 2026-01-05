
import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
// Use named parameter as per coding guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper to handle API errors consistently
const handleApiError = (error: unknown, action: string) => {
    console.error(`Error calling Gemini API for ${action}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('token count exceeds') || error.message.includes('maximum number of tokens')) {
            throw new Error("The input content is too large for the neural processor. Please use a smaller snippet.");
        }
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID') || error.message.includes('expired')) {
            throw new Error("Neural connection unauthorized. Please check system configuration or renew the API key.");
        }
    }
    throw new Error(`Neural processing failed during ${action}. Please try again.`);
};

// Guard to prevent token overflow by truncating massive text inputs
const truncateContent = (text: string, maxChars: number = 300000): string => {
    if (!text || typeof text !== 'string') return "";
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + "\n\n[... DATA TRUNCATED TO PRESERVE NEURAL CONTEXT ...]";
};

interface SubtaskResponse {
    title: string;
}

const subtaskResponseSchema = {
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

export interface TaskResponse {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate?: string;
}

const taskResponseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Concise actionable title." },
        description: { type: Type.STRING, description: "Detailed task context." },
        priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
        dueDate: { type: Type.STRING, description: "YYYY-MM-DD format." }
    },
    required: ["title", "description", "priority"]
}

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
        action: { 
            type: Type.STRING,
            enum: ['CREATE_TASK', 'MOVE_TASK', 'ASSIGN_TASK', 'NAVIGATE', 'OPEN_LINK', 'UNKNOWN'],
        },
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
}

export const tasksFromFileResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
            status: { type: Type.STRING }
        },
        required: ["title", "description", "priority", "status"],
    },
};

export const generateSubtasks = async (title: string, description: string): Promise<SubtaskResponse[]> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Break down the following node into subtasks:\nLabel: ${title}\nContext: ${description}`,
        config: { responseMimeType: "application/json", responseSchema: subtaskResponseSchema },
    });
    // Access .text property directly
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
            contents: `Synthesize task from requirements: ${prompt}. Node Timestamp: ${new Date().toISOString()}`,
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
            tasks: Object.values(projects).flatMap(p => Object.values(p.board.tasks).map(t => ({ id: t.id, title: t.title, projectId: p.id }))).slice(0, 50) 
        };
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Locate matches for "${query}" in the active mesh:\n${JSON.stringify(context)}`,
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
            contents: `Interpret voice packet: "${command}" in context:\n${JSON.stringify(context)}`,
            config: { responseMimeType: "application/json", responseSchema: voiceCommandResponseSchema },
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        handleApiError(error, 'process voice');
        return { action: 'UNKNOWN', params: { reason: "Neural parse failure." } } as any;
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<any[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Suggest helpful project URLs (GitHub, Documentation, Figma, etc) for: ${projectName}\nPurpose: ${projectDescription}. Return an array of objects with {title: string, url: string}`,
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
            contents: `Construct project architecture (name, description, columns, tasks with subtasks and priority) from CSV matrix:\n${truncateContent(csvContent)}`,
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
            contents: `Audit file for software defects/bugs. Header map: ${headers.join(',')}.\nContent:\n${truncateContent(fileContent)}. Return array of {title: string, description: string}`,
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
        const instruction = `Deconstruct file into JSON tasks. Available project statuses (columns): ${columnNames.join(',')}. Header metadata: ${headers.join(',')}. Map items to the most logical status.`;

        let contents;
        if (isText) {
            contents = `${instruction}\n\nDATA ARRAY:\n${truncateContent(fileData.content)}`;
        } else {
            contents = { parts: [
                { text: instruction },
                { inlineData: { mimeType: fileData.mimeType, data: fileData.content } }
            ]};
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: tasksFromFileResponseSchema,
            },
        });

        return JSON.parse(response.text || "[]");
    } catch (error) {
        handleApiError(error, 'parse tasks from file');
        return [];
    }
};
