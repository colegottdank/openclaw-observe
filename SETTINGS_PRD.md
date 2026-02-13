# PRD: Mission Control - Settings Page Redesign 🛠️

## Goal
A beautiful, "Linear-quality" configuration hub for the OpenClaw swarm. It must feel like professional infrastructure software, not a weekend hackathon project.

## Current Issues (The "WTF" Factor)
- **Visuals:** Ugly borders, raw select boxes, inconsistent spacing.
- **UX:** "Save" button floating in nowhere land.
- **Feedback:** No visual confirmation of state.

## Requirements

### 1. Structure & Layout
- **Sidebar-based sub-navigation** (e.g., General, Models, Notifications, Danger Zone) to keep it clean.
- **Card-based sections** with subtle borders and refined typography.
- **Sticky Actions:** Save buttons should be context-aware or sticky footer.

### 2. "Kill Switch" (Danger Zone)
- **UI:** Needs to look serious. Striped warning background? Toggle switch with confirmation modal.
- **Function:** Pauses all cron jobs/heartbeats.
- **State:** Must clearly show "SWARM PAUSED" banner globally when active.

### 3. Model Configuration
- **Visual Selector:** Not a native dropdown. Custom UI with model icons (Anthropic/Google/OpenAI logos).
- **Cost Estimation:** Real-time graph or sparkline of token usage (mocked for now, but needs to look real).
- **Agent Overrides:** "Default: Gemini 1.5" -> "Exceptions: Pixel (Kimi), Atlas (Opus)".

### 4. System Maintenance
- **Gateway Controls:** Restart/Update buttons with status indicators (Online/Restarting).
- **Cache Management:** "Clear Vector Index" with size stats ("1.2GB freed").

### 5. Notification Routing
- **Channel Matrix:** A grid mapping events (Errors, Tasks, PRs) to Channels (#eng, #alerts).
- **Toggle-based:** Simple on/off switches for each route.

## Design Specs (for Sketch)
- **Theme:** Dark mode, neutral grays (`neutral-900`), subtle borders (`border-white/10`).
- **Accent:** Indigo (`indigo-500`) for primary actions, Rose (`rose-500`) for danger.
- **Typography:** Inter/San Francisco. Monospace for IDs/Logs.
- **Icons:** Lucide React (stroke width 1.5px).

## Implementation Plan
1. **Refactor `SettingsPage.tsx`** to use a tabbed layout.
2. **Build reusable UI components:** `Switch`, `Select`, `Button`, `Section`.
3. **Implement "ModelSelector"** with icons.
4. **Polish the "Danger Zone"** to look intentional.
