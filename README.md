# BrainBuddy - AI-Powered Learning Platform

> **Enhancing Learning with AI** - A comprehensive educational platform that leverages artificial intelligence to provide personalized learning experiences, study assistance, and academic support.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Integration](#api-integration)
- [Component Architecture](#component-architecture)
- [Responsive Design](#responsive-design)
- [Authentication](#authentication)
- [Development](#development)
- [Contributing](#contributing)

## Overview

BrainBuddy is a modern, AI-powered learning platform built with Next.js that provides students with intelligent study assistance, personalized learning plans, and interactive AI tutoring. The platform combines cutting-edge AI technology with an intuitive user interface to create an engaging educational experience.

### Key Benefits
- **Personalized Learning**: AI-driven study plans and recommendations
- **24/7 AI Tutoring**: Round-the-clock academic support
- **Multi-format Support**: Handles text, images, and various content types
- **Mobile-First Design**: Responsive interface for all devices
- **Real-time Assistance**: Instant help with homework and study questions

## Features

### Core Learning Features

#### 1. **AI Learning Assistant (EduChat)**
- **Floating Widget**: Accessible on all pages via bottom-right button
- **Dashboard Integration**: Embedded chat interface on dashboard page
- **Smart Responses**: AI-powered answers to academic questions
- **Session Management**: Maintains conversation context
- **Message Expansion**: "Read More/Show Less" for long responses

#### 2. **Study Planner**
- Intelligent study schedule creation
- Progress tracking and reminders
- Adaptive planning based on performance

#### 3. **Notes Summarizer**
- AI-powered text summarization
- Key points extraction
- Study material condensation

#### 4. **AI Tutor**
- Personalized tutoring sessions
- Subject-specific guidance
- Interactive learning experiences

#### 5. **Essay Grader**
- Automated essay evaluation
- Feedback and scoring
- Improvement suggestions

#### 6. **YouTube Transcript Generator**
- Video content transcription
- Educational content extraction
- Study material creation

#### 7. **OCR Doubt Solver**
- Image-to-text conversion
- Question extraction from images
- AI-powered problem solving

### User Management
- **Authentication System**: Secure login/registration
- **Profile Management**: User information and preferences
- **Session Handling**: Persistent login states
- **Role-based Access**: Different features for different user types

### User Interface
- **Responsive Design**: Mobile-first approach
- **Dark/Light Theme**: Theme switching capability
- **Modern UI Components**: Built with Shadcn/ui
- **Accessibility**: ARIA labels and keyboard navigation

## Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 18**: Modern React with hooks and context
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Modern component library

### Backend Integration
- **RESTful APIs**: External API integration
- **Authentication**: JWT token-based auth
- **State Management**: React hooks and context
- **HTTP Client**: Fetch API with error handling

### Development Tools
- **ESLint**: Code quality and consistency
- **PostCSS**: CSS processing
- **Vite**: Fast development server
- **Git**: Version control

## Project Structure

```
brainbuddy-frontend/
├── public/                          # Static assets
│   ├── brainbuddy.png              # Main logo
│   ├── file.svg                    # File icon
│   ├── globe.svg                   # Globe icon
│   ├── next.svg                    # Next.js logo
│   ├── vercel.svg                  # Vercel logo
│   └── window.svg                  # Window icon
├── src/                            # Source code
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                # Authentication routes
│   │   │   ├── login/             # Login page
│   │   │   └── register/          # Registration page
│   │   ├── dashboard/             # Main dashboard
│   │   ├── doubt/                 # OCR doubt solver
│   │   ├── essay-grader/          # Essay grading tool
│   │   ├── profile-link/          # Profile linking
│   │   ├── study-plan/            # Study planning
│   │   ├── summarizer/            # Notes summarizer
│   │   ├── tutor/                 # AI tutor interface
│   │   ├── youtube/               # YouTube transcript generator
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   ├── components/                 # Reusable components
│   │   ├── ui/                    # Base UI components
│   │   │   ├── accordion.tsx      # Collapsible sections
│   │   │   ├── alert.tsx          # Alert notifications
│   │   │   ├── avatar.tsx         # User avatars
│   │   │   ├── badge.tsx          # Status badges
│   │   │   ├── button.tsx         # Interactive buttons
│   │   │   ├── card.tsx           # Content containers
│   │   │   ├── dialog.tsx         # Modal dialogs
│   │   │   ├── dropdown-menu.tsx  # Dropdown menus
│   │   │   ├── form.tsx           # Form components
│   │   │   ├── input.tsx          # Input fields
│   │   │   ├── label.tsx          # Form labels
│   │   │   ├── select.tsx         # Selection dropdowns
│   │   │   ├── separator.tsx      # Visual separators
│   │   │   ├── tabs.tsx           # Tabbed interfaces
│   │   │   └── textarea.tsx       # Multi-line inputs
│   │   ├── api-health.tsx         # API status indicator
│   │   ├── edu-chat-widget.tsx    # AI chat interface
│   │   ├── footer.tsx             # Application footer
│   │   ├── markdown.tsx           # Markdown renderer
│   │   ├── plan-renderer.tsx      # Study plan display
│   │   ├── profile-link-modal.tsx # Profile linking modal
│   │   ├── sidebar.tsx            # Navigation sidebar
│   │   ├── site-logo.tsx          # Brand logo component
│   │   ├── theme-provider.tsx     # Theme context provider
│   │   ├── theme-toggle.tsx       # Theme switching
│   │   ├── topbar.tsx             # Top navigation bar
│   │   └── user-profile.tsx       # User profile display
│   └── lib/                       # Utility libraries
│       ├── api.ts                 # API client functions
│       ├── profile.ts             # Profile management
│       └── utils.ts               # Helper functions
├── components.json                 # Shadcn/ui configuration
├── eslint.config.mjs              # ESLint configuration
├── middleware.ts                   # Next.js middleware
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── tsconfig.json                   # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/brainbuddy-frontend.git
   cd brainbuddy-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## API Integration

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### AI Service Endpoints
- `POST /api/educhat/chat` - AI chat responses
- `POST /api/summarizer` - Text summarization
- `POST /api/essay-grader` - Essay evaluation
- `POST /api/ocr-doubt` - Image processing
- `POST /api/youtube-transcript` - Video transcription

### API Client
The application uses a centralized API client (`src/lib/api.ts`) that handles:
- Authentication headers
- Error handling
- Response formatting
- Request/response interceptors

## Component Architecture

### Core Components

#### 1. **Layout Components**
- **`layout.tsx`**: Root layout with sidebar, topbar, and main content
- **`sidebar.tsx`**: Navigation sidebar with collapsible menu
- **`topbar.tsx`**: Top navigation with logo, theme toggle, and user info
- **`footer.tsx`**: Application footer with team credits

#### 2. **AI Components**
- **`edu-chat-widget.tsx`**: Main AI chat interface with dual modes
- **`plan-renderer.tsx`**: Study plan visualization
- **`markdown.tsx`**: Rich text rendering for AI responses

#### 3. **User Components**
- **`user-profile.tsx`**: User profile display with multiple variants
- **`profile-link-modal.tsx`**: Profile linking interface
- **`theme-toggle.tsx`**: Theme switching functionality

#### 4. **UI Components**
- **`ui/` folder**: Reusable Shadcn/ui components
- **Custom styling**: Tailwind CSS utilities
- **Responsive design**: Mobile-first approach

### Component Patterns

#### **Props Interface**
```typescript
type ComponentProps = {
  user?: User;
  loading?: boolean;
  variant?: "default" | "compact" | "minimal";
  className?: string;
  // ... other props
};
```

#### **State Management**
```typescript
const [state, setState] = useState<StateType>(initialValue);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

#### **Event Handlers**
```typescript
const handleAction = async () => {
  try {
    setLoading(true);
    const result = await apiCall();
    setState(result);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## Responsive Design

### Breakpoint System
- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (sm to lg)
- **Desktop**: `> 1024px` (lg)

### Mobile-First Approach
- **Touch-friendly**: 44px minimum touch targets
- **Responsive navigation**: Collapsible sidebar on mobile
- **Adaptive layouts**: Grid systems that stack on small screens
- **Mobile menu**: Hamburger menu for mobile navigation

### Responsive Features
- **Flexible grids**: Auto-adjusting column layouts
- **Adaptive spacing**: Responsive margins and padding
- **Mobile sidebar**: Full-screen overlay navigation
- **Touch interactions**: Optimized for mobile devices

## Authentication

### Authentication Flow
1. **Login/Register**: User credentials submission
2. **Token Generation**: JWT token creation and storage
3. **Session Management**: Persistent login state
4. **Route Protection**: Guarded routes for authenticated users
5. **Token Refresh**: Automatic token renewal

### Security Features
- **JWT Tokens**: Secure authentication tokens
- **HTTP-only Cookies**: Secure token storage
- **Route Guards**: Protected route access
- **Session Validation**: Server-side session verification

### User States
- **Unauthenticated**: Limited access, login prompts
- **Authenticated**: Full feature access
- **Loading**: Authentication state verification
- **Error**: Authentication failure handling

## Theme System

### Theme Provider
- **Context-based**: React context for theme state
- **Persistent**: Local storage for theme preference
- **System-aware**: Automatic system theme detection
- **Smooth transitions**: CSS transitions for theme changes

### Theme Variables
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --muted: 0 0% 96.1%;
  /* ... more variables */
}
```

### Dark Mode Support
- **Automatic switching**: System preference detection
- **Manual toggle**: User-controlled theme switching
- **Persistent preference**: Remembered across sessions
- **Accessibility**: High contrast and readable colors

## Development

### Code Quality
- **ESLint**: Code linting and formatting
- **TypeScript**: Type safety and IntelliSense
- **Prettier**: Code formatting consistency
- **Git hooks**: Pre-commit code quality checks

### Development Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### File Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Pages**: kebab-case (`study-plan/page.tsx`)
- **Utilities**: camelCase (`api.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from "react";

// 2. Types
type ComponentProps = { /* ... */ };

// 3. Component
export default function Component({ prop }: ComponentProps) {
  // 4. State
  const [state, setState] = useState();
  
  // 5. Effects
  useEffect(() => { /* ... */ }, []);
  
  // 6. Handlers
  const handleAction = () => { /* ... */ };
  
  // 7. Render
  return <div>{/* JSX */}</div>;
}
```

## Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow linting rules
- **Testing**: Write tests for new features
- **Documentation**: Update README for new features
- **Accessibility**: Ensure ARIA compliance

### Pull Request Guidelines
- **Clear description** of changes
- **Screenshots** for UI changes
- **Testing instructions** for new features
- **Breaking changes** clearly documented
- **Linked issues** and related PRs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Team

**Team Error 404** - A group of passionate developers building the future of education technology.

### Contact
- **Project Link**: [https://github.com/your-username/brainbuddy-frontend](https://github.com/your-username/brainbuddy-frontend)
- **Issues**: [GitHub Issues](https://github.com/your-username/brainbuddy-frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/brainbuddy-frontend/discussions)

---

<div align="center">
  <p>Made with ❤️ by <strong>Team Error 404</strong></p>
  <p>© {new Date().getFullYear()} All Rights Reserved</p>
</div>
