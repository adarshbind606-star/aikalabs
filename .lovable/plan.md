

# Aika-AI 2.1 — Cherry Blossom Anime AI

An anime-themed AI assistant with a beautiful cherry blossom (sakura) design, capable of answering any question and generating images on demand.

---

## 1. Cherry Blossom Theme & Branding
- Custom sakura pink/white/soft purple color palette for both light and dark modes
- Animated falling cherry blossom petals in the background
- Aika-AI logo and anime-styled branding throughout
- Custom fonts that feel elegant and anime-inspired
- Dark mode: deep navy/purple with glowing pink accents; Light mode: soft pinks, whites, and greens

## 2. Authentication
- Login and signup pages styled with the cherry blossom theme
- Email/password authentication via Lovable Cloud
- User profile with display name and avatar
- Protected routes — must be signed in to chat

## 3. Chat Interface
- ChatGPT-style layout with a sidebar for conversation threads
- Sidebar lists all past conversations with titles, grouped by date
- Ability to create new conversations, rename, and delete them
- Messages rendered with markdown support (bold, lists, code blocks, etc.)
- Streaming responses — tokens appear in real-time as the AI responds
- "Aika is thinking..." animated indicator with sakura-themed styling

## 4. AI Text Chat (Powered by Lovable AI)
- Full conversational AI using Lovable AI Gateway (Gemini model)
- System prompt gives Aika a friendly, slightly anime-flavored personality while remaining helpful and accurate for all topics
- Complete conversation history sent with each request for context-aware responses
- Handles rate limits and errors gracefully with user-friendly toast messages

## 5. AI Image Generation
- Users can ask Aika to generate images within the chat
- Aika detects image requests and uses the Gemini image model to generate them
- Generated images displayed inline in the chat conversation
- Images stored in Lovable Cloud Storage (not in the database)

## 6. Chat History & Persistence
- All conversations and messages saved to the database
- Messages linked to conversations, conversations linked to users
- Chat history loads when returning to the app
- Conversations accessible from the sidebar

## 7. Dark / Light Mode Toggle
- Toggle button in the header/sidebar
- Both modes fully styled with the cherry blossom aesthetic
- User preference remembered across sessions

