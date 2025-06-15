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

## GitHub Issues Workflow System

### Overview
Automated GitHub issues management system that streamlines development workflow from issue creation to deployment. **Not every issue gets a branch automatically** - only issues marked as ready for development.

### Available Commands

#### Issue Management
- `npm run issues:report` - Generate workflow status report for all open issues
- `npm run issues:start <issue-number>` - Create feature branch and start workflow for specific issue
- `npm run issues:progress <issue-number> <step>` - Update issue progress (development-complete, testing-complete, etc.)
- `npm run issues:auto <max-issues>` - Auto-start workflows for issues labeled `ready-for-development`

#### Claude Code Integration
- `npm run claude:info` - Show current issue context and suggested chat title
- `npm run claude:title` - Get AI-generated chat title based on current branch/issue
- `npm run claude:setup` - Full Claude integration setup for current issue

#### Project Management
- `npm run projects:create-item-matching` - Create comprehensive item matching project with milestones
- `npm run projects:create-firebase-ai` - Create Firebase AI integration project
- `npm run projects:status <milestone>` - Get detailed project status and progress
- `npm run projects:link <milestone> <issue-numbers>` - Link issues to project milestones

#### Jules Branch Integration
- `npm run jules:detect` - Detect Jules-created branches and prepare for integration
- `npm run jules:auto` - Auto-integrate Jules branches with proper workflow
- `npm run jules:integrate <branch>` - Manually integrate specific Jules branch
- `npm run jules:check-orphans` - Find orphaned Jules branches
- `npm run jules:cleanup` - Clean up merged or abandoned Jules branches

#### Build Monitoring
- `npm run build:status` - Show startup build status report for all tracked branches with expectations

### Claude Code Workflow

**MANDATORY Startup Routine for CI/CD Management** (Claude MUST run these commands when working on ci-cd-infrastructure branch):
1. `npm run build:status` - Check current build health across all branches
2. `npm run issues:report` - Review open issues and their priorities  
3. Analyze results to determine next actions and provide actionable summary to user

**For Core App Development**: Switch to `testing` branch for application development work.

**ALWAYS Follow This Decision Flow:**
- If **critical builds failing** → Address build issues first (highest priority)
- If **builds healthy** → Focus on highest priority ready issues
- If **on feature branch** → Check `.claude-context.md` for current issue context
- **Provide clear summary** of current project state and recommended next actions

**Claude must proactively run this routine without being asked - it's required for every session.**

### How Branch Creation Works

**Selective Branch Creation:**
- Branches are **NOT created for every issue automatically**
- Only issues with `ready-for-development` label get branches via `npm run issues:auto`
- Manual branch creation: `npm run issues:start <issue-number>`
- Branch naming: `feature/issue-{number}-{sanitized-title}`

**Automated Process:**
1. **Issue Analysis**: Issues are analyzed and prioritized based on labels and content
2. **Branch Creation**: Feature branch created from main branch
3. **Claude Context**: `.claude-context.md` file created with issue details, acceptance criteria
4. **Workflow Tracking**: Issue gets `in-progress` and `feature-branch-created` labels
5. **Integration**: Claude Code automatically detects context when working on the branch

**What Gets Created:**
- Feature branch: `feature/issue-123-descriptive-name`
- Context file: `.claude-context.md` with issue details, requirements, and development notes
- Issue comment with development checklist and branch information
- Updated labels for workflow tracking

### Issue Prioritization
- **Critical**: Security issues, critical bugs (2 hours estimated)
- **High**: Urgent features, high-priority bugs (6 hours estimated)  
- **Medium**: Standard features and improvements (4 hours estimated)
- **Low**: Nice-to-have features (8 hours estimated)

### Workflow Integration
- **Build Monitoring**: Creates issues automatically for build failures >50%
- **Project Management**: Links issues to milestones and epics
- **Claude Code**: Provides rich context for AI-assisted development
- **Jules Integration**: Handles externally created branches