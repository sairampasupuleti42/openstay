# Support Module

This module contains the customer support chatbot functionality for Openstay.

## Features

- **Floating Chatbot Icon**: Always visible support access
- **Intelligent Responses**: AI-powered responses based on README.md content
- **Knowledge Base**: Comprehensive answers about Openstay platform
- **Real-time Chat**: Instant support with typing indicators
- **FAQ Integration**: Quick answers to common questions
- **Escalation**: Option to connect with human support

## Components

- `ChatbotWidget.tsx` - Main floating chatbot interface
- `ChatbotIcon.tsx` - Floating icon component
- `ChatMessage.tsx` - Individual message component
- `QuickActions.tsx` - Common action buttons

## Services

- `chatbotService.ts` - Core chatbot logic and responses
- `knowledgeBase.ts` - FAQ and knowledge database

## Usage

Import the ChatbotWidget in your main App component:

```tsx
import { ChatbotWidget } from '@/modules/support';

function App() {
  return (
    <>
      {/* Your app content */}
      <ChatbotWidget />
    </>
  );
}
```
