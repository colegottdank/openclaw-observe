import { makeFunctionReference } from "convex/server";

// Projects
export const projectsList = makeFunctionReference<"query">("projects:list");
export const projectsGet = makeFunctionReference<"query">("projects:get");
export const projectsGetWithSwarm = makeFunctionReference<"query">("projects:getWithSwarm");

// Agents
export const agentsList = makeFunctionReference<"query">("agents:list");
export const agentsGetByProject = makeFunctionReference<"query">("agents:getByProject");

// Tasks
export const tasksList = makeFunctionReference<"query">("tasks:list");
export const tasksGet = makeFunctionReference<"query">("tasks:get");
export const tasksGetByAssignee = makeFunctionReference<"query">("tasks:getByAssignee");

// Activities
export const activitiesFeed = makeFunctionReference<"query">("activities:feed");

// Messages
export const messagesGetByTask = makeFunctionReference<"query">("messages:getByTask");

// Notifications
export const notificationsList = makeFunctionReference<"query">("notifications:list");
