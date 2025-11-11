import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile, BugResponse } from "../types";
import { GEMINI_API_KEY } from '../config';

const apiKey = GEMINI_API_KEY;
const ai = (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') ? new GoogleGenAI({ apiKey }) : null;

const keyErrorMessage = "Gemini API key is not configured. Please update the `GEMINI_API_KEY` in the `config.ts` file.";

// Helper to handle API errors consistently
const handleApiError = (error: unknown, action: string) => {
    console.error(`Error calling Gemini API for ${action}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            throw new Error("The configured Gemini API key is invalid or has been rejected by the service.");
        }
        // Re-throw our specific configuration error if it was the cause
        if (error.message === keyErrorMessage) {
            throw error;
        }
    }
    // Generic fallback
    throw new Error(`Failed to ${action}. Please try again later.`);
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
            description: "A concise, actionable title for the task. Maximum 15 words."
        },
        description: {
            type: Type.STRING,
            description: "A detailed description of the task, outlining the goals and requirements. Maximum 100 words."
        },
        priority: {
            type: Type.STRING,
            enum: Object.values(TaskPriority),
            description: "An assessment of the task's urgency."
        },
        dueDate: {
            type: Type.STRING,
            description: "An optional due date for the task in 'YYYY-MM-DD' format if applicable, based on the current date and context."
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
        projects: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of IDs for projects that match the search query."
        },
        tasks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of IDs for tasks that match the search query."
        },
        users: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of IDs for users that match the search query."
        }
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
            description: 'The type of action to perform.'
        },
        params: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'Title for a new task.' },
                description: { type: Type.STRING, description: 'Description for a new task.' },
                priority: { type: Type.STRING, enum: Object.values(TaskPriority), description: 'Priority for a new task.' },
                taskTitle: { type: Type.STRING, description: 'The title of the task to be moved or assigned.' },
                targetColumnName: { type: Type.STRING, description: 'The name of the column to move a task to.' },
                assigneeName: { type: Type.STRING, description: 'The name of the user to assign a task to.' },
                destination: { type: Type.STRING, description: 'The page or project name to navigate to.' },
                linkTitle: { type: Type.STRING, description: 'The title of the project link to open.' },
                reason: { type: Type.STRING, description: 'Reason for an unknown command.' }
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
            title: {
                type: Type.STRING,
                description: "A descriptive title for the link (e.g., 'Figma Mockups', 'GitHub Repository')."
            },
            url: {
                type: Type.STRING,
                description: "The full URL for the resource."
            }
        },
        required: ["title", "url"],
    },
};

const projectFromCsvResponseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A suitable name for the project, derived from the CSV content." },
        description: { type: Type.STRING, description: "A brief, one-sentence description of the project's goal." },
        columns: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of a status column (e.g., 'To Do', 'In Progress', 'Done')." },
                    tasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "The title of the task." },
                                description: { type: Type.STRING, description: "A detailed description of the task." },
                                priority: { type: Type.STRING, enum: Object.values(TaskPriority), description: "The priority of the task." },
                                subtasks: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING, description: "The title of a subtask." }
                                        },
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
            title: {
                type: Type.STRING,
                description: "A concise title for the bug, extracted or summarized from the source."
            },
            description: {
                type: Type.STRING,
                description: "A detailed description of the bug, including any relevant context from the source file."
            }
        },
        required: ["title", "description"],
    },
};

export const tasksFromFileResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "A concise title for the task, extracted or summarized from the source."
            },
            description: {
                type: Type.STRING,
                description: "A detailed description of the task, including any relevant context from the source file."
            },
            priority: {
                type: Type.STRING,
                enum: Object.values(TaskPriority),
                description: "The priority of the task. Default to 'Medium' if not specified."
            },
            status: {
                type: Type.STRING,
                description: "The status of the task, which should match one of the provided column names."
            }
        },
        required: ["title", "description", "priority", "status"],
    },
};


export const generateSubtasks = async (title: string, description: string): Promise<SubtaskResponse[]> => {
  if (!ai) throw new Error(keyErrorMessage);
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
            responseSchema: subtaskResponseSchema,
        },
    });

    const jsonText = response.text.trim();
    return jsonText ? JSON.parse(jsonText) as SubtaskResponse[] : [];

  } catch (error) {
    handleApiError(error, 'generate subtasks');
    return []; // Satisfy TypeScript, will not be reached
  }
};

export const generateTaskFromPrompt = async (prompt: string): Promise<TaskResponse> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const fullPrompt = `
            You are an expert project manager. Based on the user's request, create a detailed task.
            Generate a concise title, a helpful description, and suggest an appropriate priority from the available options.
            If the prompt implies a deadline (e.g., "by Friday", "in two weeks"), suggest a 'dueDate' in 'YYYY-MM-DD' format. The current date is ${new Date().toISOString().split('T')[0]}.
            Ensure the title and description are distinct and provide clear actions.
            
            User Request: "${prompt}"
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: taskResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) throw new Error("AI returned an empty response.");
        return JSON.parse(jsonText) as TaskResponse;
    } catch (error) {
        handleApiError(error, 'generate task from prompt');
        throw error; // Re-throw to be handled by caller
    }
};

export const performGlobalSearch = async (query: string, projects: Record<string, Project>, users: Record<string, User>): Promise<SearchResponse> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const searchContext = {
            projects: Object.values(projects).map(p => ({ id: p.id, name: p.name, description: p.description })),
            users: Object.values(users).map(u => ({ id: u.id, name: u.name })),
            tasks: Object.values(projects).flatMap(p =>
                Object.values(p.board.tasks).map(t => {
                    const column = Object.values(p.board.columns).find(c => c.taskIds.includes(t.id));
                    return { id: t.id, title: t.title, projectId: p.id };
                })
            )
        };

        const prompt = `
            You are an intelligent search engine for a project management tool.
            The user's search query is: "${query}"
            Here is a summary of all the data: ${JSON.stringify(searchContext)}
            Based on the query, return a JSON object with arrays of matching 'projects', 'tasks', and 'users' IDs.
            Search all fields. If a query is natural language like "high priority tasks for Bob", interpret it.
            If no matches are found for a category, return an empty array for it. Respond with only the JSON object.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: searchResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        return jsonText ? JSON.parse(jsonText) as SearchResponse : { projects: [], tasks: [], users: [] };
    } catch (error) {
        handleApiError(error, 'perform global search');
        return { projects: [], tasks: [], users: [] }; // Satisfy TypeScript
    }
};

export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    if (!ai) return { action: 'UNKNOWN', params: { reason: keyErrorMessage } };
    try {
        const prompt = `
            You are a voice assistant for a project management app. Interpret the command: "${command}"
            Here is the application context: ${JSON.stringify(context)}
            Translate the command into a JSON object for one of these actions: CREATE_TASK, MOVE_TASK, ASSIGN_TASK, NAVIGATE, OPEN_LINK, UNKNOWN.
            Return ONLY the JSON object.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: voiceCommandResponseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        if (!jsonText) throw new Error("AI returned an empty response.");
        return JSON.parse(jsonText) as VoiceCommandAction;
    } catch (error) {
        handleApiError(error, 'interpret voice command');
        return { action: 'UNKNOWN', params: { reason: "Failed to communicate with the AI assistant." } };
    }
};

export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<ProjectLinkResponse[]> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const prompt = `
            Based on the project name "${projectName}" and description "${projectDescription}", 
            suggest relevant links for development and management (e.g., GitHub, Figma). Provide valid URLs.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: projectLinkResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        return jsonText ? JSON.parse(jsonText) as ProjectLinkResponse[] : [];
    } catch (error) {
        handleApiError(error, 'generate project links');
        return [];
    }
};

export const generateProjectFromCsv = async (csvContent: string): Promise<AiGeneratedProjectPlan> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const prompt = `
            Analyze the following CSV content and structure it into a project plan JSON object.
            Infer a project name, description, columns (like 'To Do', 'In Progress'), and tasks with titles, descriptions, priorities, and subtasks.
            CSV Content: --- ${csvContent} ---
            Ensure the output is ONLY the JSON object matching the schema.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: projectFromCsvResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) throw new Error("AI returned an empty response.");
        return JSON.parse(jsonText) as AiGeneratedProjectPlan;
    } catch (error) {
        handleApiError(error, 'generate project from CSV');
        throw error;
    }
};

export const generateBugsFromFile = async (fileContent: string, headersToInclude: string[]): Promise<BugResponse[]> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const prompt = `
            Parse the following file content (CSV or plain text) into a JSON array of bug objects. Each object must have a 'title' and a 'description'.
            For each bug's main description, also append a formatted list of data from the following columns: ${JSON.stringify(headersToInclude)}.
            The format for each appended item should be "Header Name: Value". Only include the headers specified.
            If the file is not a CSV or the headers are not found, do your best to extract a title and a detailed description.
            Handle messy data gracefully. Ensure the output is ONLY the JSON array.
            File Content: --- ${fileContent} ---
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: bugsFromFileResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        return jsonText ? JSON.parse(jsonText) as BugResponse[] : [];
    } catch (error) {
        handleApiError(error, 'parse bugs from file');
        return [];
    }
};

export const generateTasksFromFile = async (fileData: { content: string; mimeType: string }, columnNames: string[], headersToInclude: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    if (!ai) throw new Error(keyErrorMessage);
    try {
        const isTextFile = fileData.mimeType === 'text/csv' || fileData.mimeType === 'text/plain';

        const headerInstruction = headersToInclude.length > 0 
            ? `For each task's main description, also append a formatted list of data from the following columns from the CSV: ${JSON.stringify(headersToInclude)}. The format for each appended item should be "Header Name: Value". Only include the headers specified.`
            : 'If the file is not a CSV or no specific headers are requested, do your best to extract a title and a detailed description.';

        const promptText = `
            Parse the provided file into a JSON array of task objects. Each object must have a 'title', 'description', 'priority', and 'status'.
            The 'status' for each task MUST be one of the following: ${JSON.stringify(columnNames)}.
            Assign tasks to the most logical column, or '${columnNames[0]}' if unclear.
            Default priority to 'Medium' if not specified.
            ${headerInstruction}
            Ensure the output is ONLY the JSON array.
            ${isTextFile ? `\nFile content:\n---\n${fileData.content}\n---` : ''}
        `;

        const contents = isTextFile 
            ? promptText
            : { parts: [
                { text: promptText },
                { inlineData: { mimeType: fileData.mimeType, data: fileData.content } }
            ]};

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: tasksFromFileResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        return jsonText ? JSON.parse(jsonText) as AiGeneratedTaskFromFile[] : [];
    } catch (error) {
        handleApiError(error, 'parse tasks from file');
        return [];
    }
};