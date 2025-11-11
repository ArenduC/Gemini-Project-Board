import { GoogleGenAI, Type } from "@google/genai";
import { TaskPriority, Project, User, ProjectLink, AiGeneratedProjectPlan, AiGeneratedTaskFromFile } from "../types";

// FIX: Switched to using process.env.API_KEY and updated the credential check
// to align with @google/genai guidelines. This resolves the original type error.
if (!process.env.API_KEY) {
  throw new Error("Gemini API Key is not configured. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export interface BugResponse {
    title: string;
    description: string;
}

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
            responseSchema: subtaskResponseSchema,
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


/**
 * Generates a full task object from a single text prompt using the Gemini API.
 * @param prompt The user's high-level goal for the task.
 * @returns A promise that resolves to a task object with title, description, and priority.
 */
export const generateTaskFromPrompt = async (prompt: string): Promise<TaskResponse> => {
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
        if (!jsonText) {
            throw new Error("AI returned an empty response.");
        }

        const parsedResponse = JSON.parse(jsonText);

        // Validate the response structure
        if (typeof parsedResponse.title === 'string' && typeof parsedResponse.description === 'string' && Object.values(TaskPriority).includes(parsedResponse.priority)) {
            return parsedResponse as TaskResponse;
        } else {
            console.error("Invalid JSON structure for task received from Gemini API:", parsedResponse);
            throw new Error("AI response was not in the expected format for a task.");
        }

    } catch (error) {
        console.error("Error calling Gemini API for task generation:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        throw new Error("Failed to generate task from AI. Please try again later.");
    }
};

/**
 * Performs a global search across all projects, tasks, and users using the Gemini API.
 * @param query The user's search query (can be natural language).
 * @param projects A record of all projects.
 * @param users A record of all users.
 * @returns A promise that resolves to an object containing arrays of matching IDs.
 */
export const performGlobalSearch = async (query: string, projects: Record<string, Project>, users: Record<string, User>): Promise<SearchResponse> => {
    try {
        // Create a simplified context for the AI to reduce token usage and improve focus
        const searchContext = {
            projects: Object.values(projects).map(p => ({ id: p.id, name: p.name, description: p.description })),
            users: Object.values(users).map(u => ({ id: u.id, name: u.name })),
            tasks: Object.values(projects).flatMap(p =>
                Object.values(p.board.tasks).map(t => {
                    const column = Object.values(p.board.columns).find(c => c.taskIds.includes(t.id));
                    return {
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        priority: t.priority,
                        status: column?.title || 'N/A',
                        projectId: p.id,
                        assigneeId: t.assignee?.id,
                    }
                })
            )
        };

        const prompt = `
            You are an intelligent search engine for a project management tool.
            The user's search query is: "${query}"

            Here is a summary of all the data in the tool:
            ${JSON.stringify(searchContext)}

            Based on the user's query, return a JSON object containing arrays of the IDs of all matching projects, tasks, and users.
            - Search across all fields: id, name, title, description, priority, status, etc.
            - If the query is a specific ID, return that item.
            - If the query is a natural language phrase like "high priority tasks for Bob", interpret it and find the relevant items.
            - If no matches are found for a category, return an empty array for it.
            - Ensure the response is only the JSON object.
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
        if (!jsonText) {
            console.warn("Gemini API returned an empty response for search.");
            return { projects: [], tasks: [], users: [] };
        }

        const parsedResponse = JSON.parse(jsonText);
        
        if (
            Array.isArray(parsedResponse.projects) &&
            Array.isArray(parsedResponse.tasks) &&
            Array.isArray(parsedResponse.users)
        ) {
            return parsedResponse as SearchResponse;
        } else {
            console.error("Invalid JSON structure for search received from Gemini API:", parsedResponse);
            throw new Error("AI response was not in the expected format for search.");
        }

    } catch (error) {
        console.error("Error calling Gemini API for global search:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        throw new Error("Failed to perform AI search. Please try again later.");
    }
};

/**
 * Interprets a voice command using the Gemini API.
 * @param command The transcribed voice command from the user.
 * @param context The current state of the application (projects, users, etc.).
 * @returns A promise that resolves to a structured action object.
 */
export const interpretVoiceCommand = async (command: string, context: any): Promise<VoiceCommandAction> => {
    try {
        const prompt = `
            You are a voice assistant for a project management application. Your task is to interpret the user's command
            and translate it into a structured JSON object representing an action.

            User's command: "${command}"

            Here is the context of the application state. Use this to find the correct entities (tasks, columns, users, projects, links):
            ${JSON.stringify(context)}

            Based on the command, determine the user's intent and choose one of the following actions:
            - CREATE_TASK: When the user wants to create a new task. Extract the title and optionally a description or priority.
            - MOVE_TASK: When the user wants to move an existing task to a different column. Extract the task's title and the target column's name.
            - ASSIGN_TASK: When the user wants to assign a task to a user. Extract the task's title and the assignee's name.
            - NAVIGATE: When the user wants to go to a different page or project. The destination can be 'dashboard', 'tasks', 'resources', or a project name.
            - OPEN_LINK: When the user wants to open a project-specific link. Extract the title of the link from the command.
            - UNKNOWN: If the command is unclear or cannot be mapped to any of the above actions.

            Return ONLY the JSON object for the action. Do not add any extra text or explanations.
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
        if (!jsonText) {
            throw new Error("AI returned an empty response for voice command.");
        }
        
        const parsedResponse = JSON.parse(jsonText);
        
        // Basic validation
        if (parsedResponse.action && parsedResponse.params) {
            return parsedResponse as VoiceCommandAction;
        } else {
            console.error("Invalid JSON structure for voice command received from Gemini:", parsedResponse);
            return { action: 'UNKNOWN', params: { reason: "AI response was not in the expected format." } };
        }

    } catch (error) {
        console.error("Error calling Gemini API for voice command interpretation:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        return { action: 'UNKNOWN', params: { reason: "Failed to communicate with the AI assistant." } };
    }
};

/**
 * Generates a list of relevant project links using the Gemini API.
 * @param projectName The name of the project.
 * @param projectDescription The description of the project.
 * @returns A promise that resolves to an array of link objects.
 */
export const generateProjectLinks = async (projectName: string, projectDescription: string): Promise<ProjectLinkResponse[]> => {
    try {
        const prompt = `
            Based on the project name "${projectName}" and description "${projectDescription}", 
            suggest a list of relevant links for development and management. 
            Common links include source code repositories (like GitHub), design files (like Figma), and documentation.
            Provide a valid URL for each.
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
        if (!jsonText) {
            console.warn("Gemini API returned an empty response for project links.");
            return [];
        }
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse as ProjectLinkResponse[];
    } catch (error) {
        console.error("Error calling Gemini API for project link generation:", error);
        throw new Error("Failed to generate project links from AI.");
    }
};

/**
 * Generates a structured project plan from CSV data.
 * @param csvContent The string content of the user's CSV file.
 * @returns A promise that resolves to a structured project plan object.
 */
export const generateProjectFromCsv = async (csvContent: string): Promise<AiGeneratedProjectPlan> => {
    try {
        const prompt = `
            You are an expert project manager. A user has provided a CSV file to bootstrap a new project.
            Your task is to analyze the CSV content and structure it into a complete project plan.

            CSV Content:
            ---
            ${csvContent}
            ---

            Instructions:
            1.  Infer a suitable project name and a brief description from the data.
            2.  Group tasks into logical columns. If a 'status' or 'column' field exists, use it. Otherwise, create standard columns like 'To Do', 'In Progress', and 'Done' and assign tasks appropriately. All tasks without a clear status should go into 'To Do'.
            3.  For each task, extract a title, description, and priority. If priority isn't specified, default to 'Medium'.
            4.  If there are items that look like subtasks of a main task, nest them accordingly.
            5.  Ensure the output is ONLY the JSON object that matches the provided schema. Do not include any other text.
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
        if (!jsonText) {
            throw new Error("AI returned an empty response for the project plan.");
        }
        const parsedResponse = JSON.parse(jsonText);
        // Add more robust validation if needed
        return parsedResponse as AiGeneratedProjectPlan;

    } catch (error) {
        console.error("Error calling Gemini API for project generation from CSV:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        throw new Error("Failed to generate project from CSV. Please check the file format and try again.");
    }
};

/**
 * Parses bugs from a text or CSV file.
 * @param fileContent The string content of the user's file.
 * @returns A promise that resolves to an array of bug objects.
 */
export const generateBugsFromFile = async (fileContent: string): Promise<BugResponse[]> => {
    try {
        const prompt = `
            You are a bug tracking assistant. A user has provided a file (either CSV or plain text) containing a list of bugs.
            Your task is to parse the content and structure it into a JSON array of bug objects. Each object must have a 'title' and a 'description'.
            - For CSVs, look for columns like 'title', 'summary', 'bug', 'issue', 'description', 'details'.
            - For text files, each line or paragraph may represent a different bug. Use the first line as the title and subsequent lines as the description.
            - Be robust and handle messy data gracefully. If a row/line is unclear, skip it.
            - Ensure the output is ONLY the JSON object that matches the provided schema. Do not include any other text.

            File Content:
            ---
            ${fileContent}
            ---
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
        if (!jsonText) {
            console.warn("Gemini API returned an empty response for bug parsing.");
            return [];
        }
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse as BugResponse[];

    } catch (error) {
        console.error("Error calling Gemini API for bug parsing:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        throw new Error("AI failed to parse bugs from the file. Please check the file format and try again.");
    }
};

/**
 * Parses tasks from a text, CSV, PDF, or DOC file.
 * @param fileData An object containing the file content (string or base64) and its MIME type.
 * @param columnNames An array of possible column names for the 'status' field.
 * @returns A promise that resolves to an array of task objects.
 */
export const generateTasksFromFile = async (fileData: { content: string; mimeType: string }, columnNames: string[]): Promise<AiGeneratedTaskFromFile[]> => {
    try {
        const isTextFile = fileData.mimeType === 'text/csv' || fileData.mimeType === 'text/plain';

        const promptText = `
            You are a task management assistant. A user has provided a file (CSV, plain text, PDF, or Word document) containing a list of tasks.
            Your task is to parse the file's content and structure it into a JSON array of task objects. Each object must have a 'title', 'description', 'priority', and 'status'.
            - For CSVs, look for columns like 'title', 'task', 'description', 'priority', 'status'.
            - For text files, each line or paragraph may represent a different task. Use the first line as the title and subsequent lines as the description.
            - For PDF or Word documents, intelligently extract the key information that represents tasks.
            - Infer priority from keywords if possible (e.g., 'urgent', 'important'), otherwise default to 'Medium'.
            - The 'status' for each task MUST be one of the following available column names: ${JSON.stringify(columnNames)}. Assign tasks to the most logical column. If a task's status is unclear, assign it to the first column name in the list ('${columnNames[0]}').
            - Be robust and handle messy data gracefully. If a row/line is unclear, skip it.
            - Ensure the output is ONLY the JSON array. Do not include any other text.
            ${isTextFile ? `\nHere is the file content:\n---\n${fileData.content}\n---` : ''}
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
        if (!jsonText) {
            console.warn("Gemini API returned an empty response for task parsing.");
            return [];
        }
        const parsedResponse = JSON.parse(jsonText);
        return parsedResponse as AiGeneratedTaskFromFile[];

    } catch (error) {
        console.error("Error calling Gemini API for task parsing:", error);
        if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
            throw new Error("The Gemini API key is invalid or missing.");
        }
        throw new Error("AI failed to parse tasks from the file. Please check the file format and try again.");
    }
};
