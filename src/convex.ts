// This file helps the frontend connect to the backend functions without the full generated API types.
// We use "any" casting to satisfy TypeScript for useQuery.

export const api = {
  agents: {
    list: "agents:list",
    getByProject: "agents:getByProject",
  },
  tasks: {
    list: "tasks:list",
    get: "tasks:get",
    getByAssignee: "tasks:getByAssignee",
  },
  activities: {
    feed: "activities:feed",
  },
  projects: {
    list: "projects:list",
    get: "projects:get",
  },
  telemetry: {
    getRecent: "telemetry:getRecent",
    getSystemHealth: "telemetry:getSystemHealth",
  },
  events: {
    list: "events:list",
  }
};
