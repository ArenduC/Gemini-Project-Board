import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper to handle API errors consistently
const handleApiError = (error: unknown, action: string) => {
    console.error(`Error calling Gemini API for ${action}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('token count exceeds')) {
            throw new Error("The file is too large for the AI to process at once. Please try a smaller file or a snippet.");
        }
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            throw new Error("The Gemini API key is invalid or unauthorized for this domain.");
        }
    }
    throw new Error(`Failed to ${action}. Please try again later.`);
};

// Simple text truncation to prevent token overflow (approx 500k characters for safety)
const truncateContent = (text: string, maxLength: number = 500000): string => {
    if (!text || typeof text !== 'string') return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "\n\n[... Content truncated due to size limits ...]";
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
        title: {
            type: Type.STRING,
            description: "A concise, actionable title for the task."
        },
        description: {
            type: Type.STRING,
            description: "A detailed description of the task."
        },
        priority: {
            type: Type.STRING,
            enum: Object.values(TaskPriority),
            description: "An assessment of the task's urgency."
        },
        dueDate: {
            type: Type.STRING,
            description: "Optional due date in 'YYYY-MM-DD' format."
        }
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

export interface ProjectLinkResponse {
    title: string;
    url: string;
}

const projectLinkResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING }
        },
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
                                subtasks: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { title: { type: Type.STRING } },
                                        required: ["title"]
                                    }
                                }
                            },
                            required: ["title", "description", "priority", "subtasks"]
                        }
                    }
                },
                required: ["title", "tasks"]
            }
        }
    },
    required: ["name", "description", "columns"]
};

const bugsFromFileResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
        },
        required: ["title", "description"],
    },
};

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
    const prompt = `Based on the following main task, break it down into smaller, actionable subtasks.\n\nTitle: "${title}"\nDescription: "${description}"`;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: subtaskResponseSchema,
        },
    });
    const jsonText = response.text || "[]";
    return JSON.parse(jsonText.trim()) as SubtaskResponse[];
  } catch (error) {
    handleApiError(error, 'generate subtasks');
    return [];
  }
};

export const generateTaskFromPrompt = async (prompt: string): Promise<TaskResponse> => {
    try {
        const fullPrompt = `Create a project task based on this request: "${prompt}". Current date is ${new Date().toISOString().split('T')[0]}.`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: taskResponseSchema,
            },
        });
        const jsonText = response.text || "{}";
        return JSON.parse(jsonText.trim()) as TaskResponse;
    } catch (error) {
        handleApiError(error, 'generate task');
        throw error;
    }
};

export const performGlobalSearch = async (query: string, projects: Record<string, Project>, users: Record<string, User>): Promise<SearchResponse> => {
    try {
        const searchContext = {
            projects: Object.values(projects).map(p => ({ id: p.id, name: p.name })),
            users: Object.values(users).map(u => ({ id: u.id, name: u.name })),
            tasks: Object.values(projects).flatMap(p => Object.values(p.board.tasks).map(t => ({ id: t.id, title: t.title, projectId: p.id }))).slice(0, 50) 
        };
        const prompt = `Search the following context for: "${query}". Return matching IDs.\nContext: ${JSON.stringify(searchContext)}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: searchResponseSchema,
            },
        });
        const jsonText = response.text || '{"projects":[], "tasks":[], "users":[]}';
        return JSON.parse(jsonText.trim()) as SearchResponse;
    } catch (error) {
        handleApiError(error, 'search');
        return { projects: [], tasks: [], users: [] };
    }
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    try {
        const prompt = `Interpret voice command: "${command}"\nContext: ${JSON.stringify(context)}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: voiceCommandResponseSchema,
            },
        });
        const jsonText = response.text || "{}";
        return JSON.parse(jsonText.trim()) as VoiceCommandAction;
    } catch (error) {
        handleApiError(error, 'process voice');
        return { action: 'UNKNOWN', params: { reason: "Error." } } as any;
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<ProjectLinkResponse[]> => {
    try {
        const prompt = `Suggest relevant links for: ${projectName} - ${projectDescription}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: projectLinkResponseSchema,
            },
        });
        const jsonText = response.text || "[]";
        return JSON.parse(jsonText.trim()) as ProjectLinkResponse[];
    } catch (error) {
        handleApiError(error, 'generate links');
        return [];
    }
};

export const generateProjectFromCsv = async (csvContent: string): Promise<AiGeneratedProjectPlan> => {
    try {
        const safeContent = truncateContent(csvContent);
        const prompt = `Structure this CSV into a project plan JSON.\nCSV: ${safeContent}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: projectFromCsvResponseSchema,
            },
        });
        const jsonText = response.text || "{}";
        return JSON.parse(jsonText.trim()) as AiGeneratedProjectPlan;
    } catch (error) {
        handleApiError(error, 'parse project');
        throw error;
    }
};

export const generateBugsFromFile = async (fileContent: string, headersToInclude: string[]): Promise<BugResponse[]> => {
    try {
        const safeContent = truncateContent(fileContent);
        const prompt = `Parse this into bugs JSON. Columns: ${headersToInclude.join(',')}.\nContent: ${safeContent}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: bugsFromFileResponseSchema,
            },
        });
        const jsonText = response.text || "[]";
        return JSON.parse(jsonText.trim()) as BugResponse[];
    } catch (error) {
        handleApiError(error, 'parse bugs');
        return [];
    }
};

export const generateTasksFromFile = async (fileData: { content: string; mimeType: string }, columnNames: string[], headersToInclude: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    try {
        const isTextFile = fileData.mimeType.startsWith('text/') || fileData.mimeType === 'application/json' || fileData.mimeType === 'text/csv';
        const promptText = `Analyze the provided file and extract a JSON array of tasks. Allowed statuses: ${columnNames.join(',')}. Header metadata: ${headersToInclude.join(',')}. Response must strictly match the task schema.`;

        let contents;
        if (isTextFile) {
            // Ensure no binary objects are passed as strings
            contents = `${promptText}\n\nFILE CONTENT:\n${truncateContent(fileData.content)}`;
        } else {
            // Correct way to send binary data as per guidelines
            contents = { parts: [
                { text: promptText },
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

        const jsonText = response.text || "[]";
        return JSON.parse(jsonText.trim()) as AiGeneratedTaskFromFile[];
    } catch (error) {
        handleApiError(error, 'parse tasks from file');
        return [];
    }
};