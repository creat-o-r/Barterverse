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

## Proactive Build Monitoring & Auto-Fixing

### Monitoring Strategy
- **Continuous monitoring** every 15 minutes via GitHub Actions
- **Pattern recognition** across all builds in 24-hour windows  
- **Predictive analysis** to identify issues before they become blockers
- **Automatic notification** for critical failure rates (>30%)

### Auto-Fix Capabilities
1. **Dependency Issues**: Automatic `npm audit fix` and security updates
2. **Permission Problems**: Auto-grant missing IAM permissions via GCP CLI
3. **Network Timeouts**: Retry mechanisms and timeout adjustments
4. **Build Errors**: Pattern-based fixes for common TypeScript/ESLint issues

### Escalation Thresholds
- **>30% failure rate**: Auto-create critical GitHub issue
- **>50% failure rate**: Auto-create fix PR with dependency updates
- **Branch-specific failures**: Alert for branches with >3 consecutive failures
- **Time-based patterns**: Identify peak failure hours for maintenance scheduling

### Implementation Files
- `.github/workflows/build-monitoring.yml` - Automated monitoring workflow
- `scripts/build-health-report.js` - Comprehensive analysis and auto-fix logic
- **GitHub API integration** - Real-time build status and log analysis
- **Secret Manager integration** - Secure token management for automation