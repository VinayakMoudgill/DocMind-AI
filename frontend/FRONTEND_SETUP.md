# Frontend Setup Guide

## Installation

```bash
# Install dependencies
cd frontend
npm install

# Create environment file
cp .env.example .env.local
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Development

```bash
npm run dev
# Open http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Features Implemented

- ✅ **Dashboard:** Main interface with upload and chat
- ✅ **Document Uploader:** Drag-and-drop file upload
- ✅ **Chat Interface:** Real-time conversation
- ✅ **Source Citation:** Side panel showing sources
- ⏳ **Exam Lens UI:** Practice question generation (modal)
- ⏳ **Disagreement Detector UI:** Conflict visualization (modal)
- ⏳ **Dark Mode:** Light/dark theme toggle
- ⏳ **WebSocket Streaming:** Real-time response streaming

## Component Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   └── providers.tsx       # React Query setup
├── components/
│   ├── dashboard.tsx       # Main dashboard
│   ├── chat-interface.tsx  # Chat messaging
│   ├── document-uploader.tsx
│   ├── source-citation.tsx
│   └── ...
└── lib/
    └── api.ts              # API client
```

## Styling

- **Tailwind CSS:** Utility-first CSS
- **Shadcn UI:** Pre-built accessible components
- **Custom CSS:** Global styles in `globals.css`
- **Dark Mode:** Built-in support
