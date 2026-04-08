# AI Assistant — User Guide

## Overview

The AI Assistant lets you ask questions in natural language and get answers from your project data, system documentation, or general project management knowledge. It is available in two places:

- **Quick Ask (floating widget)** — Bottom-right on every Platform page. Use it for fast questions while you work.
- **AI Workspace** — Full-screen at **Platform → AI Assistant** (`/platform/ai`). Use it for longer conversations, full source lists, and export.

## How to use the Quick Ask widget

1. Click the **AI** button (bottom-right) to open the panel.
2. Type a question or click a **suggested question** chip (e.g. “Show me high-severity risks”).
3. The AI answers from your data, docs, or general knowledge. If the answer is from your data, you’ll see **Sources** (up to 2 in the widget).
4. To see all sources and continue the conversation in a full view, click **Open in AI Workspace →** in the widget footer.
5. After several exchanges, a banner suggests moving to the AI Workspace for full history and sources.

## How to use the AI Workspace

1. Go to **AI Assistant** in the sidebar (or open it from the widget link).
2. Your last conversation loads automatically. You can switch to another from the **Conversations** list on the left or start a **+ New chat**.
3. Use the **project** dropdown to scope answers to a specific project (or “All projects”).
4. Ask questions in the chat. Answers that use your data or docs show a **Sources** section in the message.
5. **Select a message** that has sources — the right panel shows all sources, with:
   - **Filter** by module (e.g. risks, issues)
   - **Export** to CSV or Print
   - **Open record** links to the actual record in the app
6. On small screens, use the **Chat | Sources | History** tabs to switch between the three panels.

## Where answers come from

| Type | What you see | Example |
|------|----------------|--------|
| **Your data** | “Answered from your data” + Sources (risks, issues, mandates, etc.) | “Show me open risks on Project Alpha” |
| **System docs** | “Answered from system docs” + document link | “How do I submit a mandate for approval?” |
| **General knowledge** | “General knowledge” | “What is a risk register?” |

Your organisation can choose in **Organization Settings** whether data answers use a short template only (no data sent out), or a short summary from an AI provider (Claude or Gemini). The Sources block is always shown when the answer is from your data or docs.

## Simulator AI (if you use the Simulator)

- **During a run:** The **AI Coach** can show hints (e.g. when your score is low or you’ve been idle). Use **Ask Coach about this →** to dig deeper.
- **After a run:** The **debrief** screen shows strengths, improvements, and a key takeaway. Use **View in AI Workspace →** to open the Simulator AI Workspace with that debrief.
- **Simulator AI Workspace** (`/simulator/ai`): Review past debriefs, module scores, and compare runs. Available from the Simulator sidebar.

## Privacy and settings

- Data answers are built from queries to your secure database (RLS applies). No raw data is sent outside unless your org turns on Claude or Gemini summary mode.
- The footer in the widget and the status bar in the AI Workspace show which mode is active and whether a data snippet is sent to an AI provider.
- Organisation admins configure the **AI Data Answer Mode** and **Proactive dashboard insights** under **Organization Admin → Settings**.
