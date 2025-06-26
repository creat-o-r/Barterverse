# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `npm run dev` - Start Next.js development server on port 9002 with turbopack
- `npm run build` - Build the production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### AI/Genkit Development
- `npm run genkit:dev` - Start Genkit development server
- `npm run genkit:watch` - Start Genkit with watch mode

## Architecture Overview

### Application Structure
BarterVerse is a Next.js 15 barter/trading platform with AI-powered features using Google's Genkit framework.

**Core Concept**: Users can list items as 'offer' (what they have) or 'want' (what they need), and the AI facilitates smart matching and trade negotiations.

### Key Technologies
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI Framework**: Google Genkit with Gemini models
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Data**: Dummy data system (no database currently)
- **Styling**: Custom design system with Dusty Blue (#7EA9CC) primary color

### AI Flow Architecture
The AI system is built around Genkit flows in `src/ai/flows/`:

- **Item Matching** (`item-match-flow.ts`): Core matching algorithm with Simple/Advanced modes
- **Trade Negotiation** (`trade-negotiation-chat.ts`): LLM-powered chat for trade discussions
- **Smart Suggestions** (`smart-suggestion-tool.ts`): Tool for suggesting mutually beneficial trades
- **User Preference Inference** (`infer-user-preferences-flow.ts`): Analyzes user behavior to suggest preferences

### Data Flow Patterns

**Item Matching Logic**:
- Simple Mode: Basic keyword/category matching
- Advanced Mode: Considers user preferences, reciprocal trades, and complex matching scenarios
- Both modes respect `listingType` ('offer' vs 'want') and `isGiftItForward` flags
- Results include `matchScore`, `reasoning`, and optional `reciprocalItemId`

**User Preferences System**:
- Stored in `UserProfilePreferences` type with motivations, timing, location preferences
- Used by Advanced matching mode when enabled via AI config
- Defaults to 'Low' minimum match rating if not specified

### Service Layer
- `ai-config-service.ts`: Manages AI model selection and matching mode configuration
- `match-report-service.ts`: Logs matching events for analytics
- `feedback-service.ts`: Handles user feedback collection
- `ai-diagnostic-log-service.ts`: Debugging and monitoring for AI operations

### Component Organization
- `src/components/ui/`: Reusable UI primitives (shadcn/ui based)
- `src/components/items/`: Item-specific components (cards, lists, search)
- `src/components/chat/`: Chat interfaces for trade negotiation
- `src/components/layout/`: Navigation, footer, layout wrappers

### Type System
Central types in `src/types/index.ts`:
- `Item`: Core item structure with `listingType`, `isGiftItForward`, `openToAnyOpportunity`
- `User`: User profiles with embedded preferences
- `UserProfilePreferences`: Motivations, timing, location preferences
- `TradeOffer`: Trade negotiation structure

### Configuration Notes
- TypeScript and ESLint errors are ignored during builds (configured in next.config.ts)
- Uses Turbopack for faster development builds
- Font loading: Belleza (headers) and Alegreya (body) from Google Fonts
- Images configured for placehold.co domain

### AI Model Configuration
- Currently hardcoded to use `gemini-1.5-pro-latest`
- Safety settings configured to be permissive for trade discussions
- Model selection managed through `ai-config-service.ts`

### Development Patterns
- Dummy data system provides realistic test data without database setup
- AI flows use structured input/output schemas for type safety
- Error handling includes fallbacks for AI failures and safety blocks
- All AI interactions are logged via match-report-service for debugging

## Project Management Features

### Project System Architecture
**Status**: Functionally complete, needs UI integration (see issue #48)

- **Service Layer**: `src/services/project-service.ts` - Complete CRUD operations
- **Data Model**: `Project` type with visibility controls (`private`/`shared`)
- **UI Components**: 
  - `ManageItemProjectsButton` - Full functionality (needs integration)
  - `ProjectCard` and `ProjectDetails` - Basic views implemented
- **Integration Points**: Item creation flow ✅, Profile pages ✅, Item management UI ❌

### Missing Integration
- Add `ManageItemProjectsButton` to `ItemCard.tsx` and item detail pages
- Complete project listing (`/projects`) and detail (`/projects/[id]`) pages
- Enhance profile project management section

## GitHub Integration & Authentication

### Repository Information
- **Owner**: `creat-o-r`
- **Repository**: `Barterverse`
- **URL**: https://github.com/creat-o-r/Barterverse

### Issue Management
**IMPORTANT**: MCP GitHub tools have read-only access. For creating issues:

**✅ CORRECT METHOD:**
```bash
npm run issues:create "Title" "Body content" "label1,label2,label3"
```

**❌ NEVER USE:**
- `mcp__github__create_issue` (authentication fails)
- Manual curl commands (credentials not available)
- Any other GitHub creation methods

### Available GitHub Commands
```bash
# Issue Management
npm run issues:create <title> <body> <labels>
npm run issues:update <issue-number> <field> <value>
npm run issues:start <issue-number>
npm run issues:progress <issue-number>
npm run issues:auto

# Build Health
npm run build:status

# Project Management  
npm run projects:status
npm run projects:link <issue> <project>

# Development Context
npm run claude:info
npm run claude:title
npm run claude:setup
```

### Branch and Repository Status
- **Current Repository**: creat-o-r/Barterverse.git
- **Main Branch**: `master`
- **Development Workflow**: feature branches → testing → master
- **CI/CD**: Comprehensive GitHub Actions with Firebase deployment