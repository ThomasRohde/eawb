---
title: AI Chat
category: AI Chat
order: 20
---

# AI Chat

The **AI Chat** tool provides a conversational AI interface within EA Workbench. Use it to discuss architecture decisions, ask questions about your models, get explanations, and brainstorm ideas.

## Getting Started

1. Open the **AI Chat** panel from the sidebar (Tools → AI Chat, or Panels → AI Chat)
2. Type a message in the input field at the bottom
3. Press **Enter** or click **Send**

The AI responds in the conversation area with formatted Markdown, including code blocks, lists, and tables.

## Conversations

### Creating Conversations

Each chat session is a **conversation** with its own history. Click **New Conversation** to start fresh.

### Conversation History

Previous conversations are preserved and accessible from the conversation list. Switch between conversations to revisit earlier discussions.

### Deleting Conversations

Hover over a conversation in the list and click the delete button to remove it permanently.

## What Can You Ask?

The AI assistant is particularly useful for enterprise architecture tasks:

### Architecture Questions

- "What is a Business Capability Model and how does it differ from a process model?"
- "How should I decompose customer-facing capabilities?"
- "What are best practices for Level 1 capability naming?"

### Model Feedback

- "Review my capability model structure and suggest improvements"
- "Are there any gaps in my Customer Management capability tree?"
- "How does my model compare to industry standard frameworks like BIAN or APQC?"

### Documentation Help

- "Write a description for the 'Customer Acquisition' capability"
- "Generate an architecture decision record for choosing microservices"
- "Summarize the current state of our capability model"

### General EA Topics

- "Explain TOGAF's Architecture Development Method"
- "What frameworks exist for capability-based planning?"
- "How do I create a technology reference model?"

## AI Provider

AI Chat uses the same ACP (Agent Client Protocol) backend as BCM Studio's AI Actions:

- **GitHub Copilot CLI** is the default provider
- The AI maintains conversational context within each conversation (multi-turn)
- Session persistence means the AI remembers earlier messages

### Session Management

Each conversation maps to an ACP session. The session maintains context so follow-up questions work naturally:

```
You: What are the key capabilities for a bank?
AI: [lists banking capabilities]
You: Now decompose "Lending" into sub-capabilities
AI: [decomposes Lending, remembering the banking context]
```

## Streaming Responses

AI responses stream in real time — you see text appear progressively rather than waiting for the full response. This provides faster feedback and lets you interrupt if the response is going in the wrong direction.

## Markdown Support

The chat renders full GitHub-flavored Markdown:

- **Bold**, _italic_, ~~strikethrough~~
- Headings and subheadings
- Bullet and numbered lists
- Tables
- Code blocks with syntax highlighting
- Links

## Tips

- Be specific in your questions for better answers
- Reference specific capabilities by name to get contextual advice
- Use follow-up questions to drill deeper into a topic
- Start new conversations for unrelated topics to keep context clean
- The AI has knowledge of enterprise architecture frameworks, methodologies, and best practices
