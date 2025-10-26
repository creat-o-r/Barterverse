# BarterVerse - Product Requirements Document (PRD)

**Version**: 1.0
**Last Updated**: October 26, 2025
**Status**: Draft
**Product Owner**: TBD
**Product Manager**: TBD

---

## Executive Summary

**BarterVerse** is an AI-powered barter and trading platform that enables users to exchange goods and services without monetary transactions. The platform leverages Google's Gemini AI to intelligently match users based on their offerings and needs, facilitate trade negotiations through natural language chat, and suggest mutually beneficial multi-party trades.

**Vision**: Create the world's most intelligent non-monetary marketplace where AI helps people discover, negotiate, and complete trades that create value for all parties.

**Mission**: Democratize bartering by removing friction from trade discovery and negotiation through AI assistance.

---

## 1. Product Overview

### 1.1 Problem Statement

Traditional bartering faces three critical challenges:

1. **Discovery Problem**: Finding someone who has what you want AND wants what you have (the "double coincidence of wants")
2. **Negotiation Complexity**: Determining fair value between dissimilar items without a monetary benchmark
3. **Multi-Party Coordination**: Complex trades involving 3+ parties are nearly impossible to organize manually

### 1.2 Solution

BarterVerse solves these problems through:

- **AI-Powered Matching**: Advanced matching algorithm that considers item attributes, user preferences, location, timing, and reciprocal opportunities
- **LLM-Driven Negotiation**: ChatGPT-style negotiation assistant that helps users find common ground and suggests creative trade structures
- **Smart Trade Suggestions**: AI tool that identifies multi-party trades and complex trade bundles that benefit all participants

### 1.3 Target Users

**Primary Users**:
- **Declutterers**: People looking to exchange unused items for things they need
- **Sustainability Advocates**: Users motivated by reducing waste and consumption
- **Budget-Conscious Individuals**: People seeking to acquire goods without spending money
- **Hobbyists & Collectors**: Users trading within specific niches (books, games, crafts)

**Secondary Users**:
- **Small Businesses**: Trading services or inventory
- **Community Organizations**: Facilitating resource sharing
- **Gift Economy Participants**: People who enjoy giving without expectation

### 1.4 Success Metrics

**North Star Metric**: Completed Trades per Month

**Key Metrics**:
- Monthly Active Users (MAU)
- Trade Completion Rate (offers accepted / offers sent)
- AI Match Acceptance Rate (matches acted upon / matches shown)
- User Retention (7-day, 30-day)
- Average Time to Trade Completion
- User Satisfaction Score (post-trade ratings)

**AI Performance Metrics**:
- Match Relevance Score (user feedback)
- Negotiation Success Rate (chats leading to completed trades)
- Multi-Party Trade Success Rate

---

## 2. User Personas

### Persona 1: Sarah - The Sustainable Parent
- **Age**: 34
- **Occupation**: Marketing Manager
- **Motivation**: Reduce waste, save money on kids' toys/clothes
- **Pain Points**: Kids outgrow items quickly, buying new is wasteful
- **Goals**: Exchange kids' items, find toys/books locally
- **Tech Savviness**: High
- **Key Need**: Fast local matching, easy scheduling

### Persona 2: James - The Collector
- **Age**: 28
- **Occupation**: Software Engineer
- **Motivation**: Complete vintage video game collection
- **Pain Points**: Rare items expensive, trading communities fragmented
- **Goals**: Trade duplicate items for missing pieces
- **Tech Savviness**: Very High
- **Key Need**: Precise matching on specifications, nationwide search

### Persona 3: Maria - The Community Builder
- **Age**: 52
- **Occupation**: Non-profit Coordinator
- **Motivation**: Strengthen community bonds through sharing
- **Pain Points**: Hard to organize community exchanges
- **Goals**: Facilitate gift economy, connect neighbors
- **Tech Savviness**: Medium
- **Key Need**: Simple interface, trust/safety features

---

## 3. Core Features & Requirements

### 3.1 User Management

#### 3.1.1 Authentication & Onboarding
**Priority**: P0 (MVP Blocker)

**Requirements**:
- FR-AUTH-001: Users can sign up with email/password
- FR-AUTH-002: Users can sign in with Google OAuth
- FR-AUTH-003: Users can reset password via email
- FR-AUTH-004: Users must verify email before trading
- FR-AUTH-005: Onboarding flow collects: name, location, profile photo (optional)
- FR-AUTH-006: Privacy controls for profile visibility

**User Stories**:
- As a new user, I want to sign up quickly so I can start browsing items
- As a returning user, I want to sign in with Google so I don't need another password

#### 3.1.2 User Profiles
**Priority**: P0 (MVP)

**Requirements**:
- FR-PROF-001: Profile displays: name, bio, location (neighborhood-level), rating, trades completed
- FR-PROF-002: Users can edit profile information
- FR-PROF-003: Users can set profile privacy (public, members-only, private)
- FR-PROF-004: Profile shows user's active listings (offers and wants)
- FR-PROF-005: Profile shows trade history (past 10 trades)
- FR-PROF-006: Users can set location preferences (willing to travel distance, preferred delivery methods)
- FR-PROF-007: Users can set timing preferences (immediate, flexible, specific dates)

**User Preferences** (Advanced):
- FR-PREF-001: Users can specify motivations (sustainability, budget, hobby, community, decluttering)
- FR-PREF-002: Users can set minimum acceptable match rating (Low/Medium/High)
- FR-PREF-003: Users can indicate interest in third-party fulfillment
- FR-PREF-004: Users can enable/disable automatic preference inference

---

### 3.2 Item Management

#### 3.2.1 Item Listing
**Priority**: P0 (MVP)

**Requirements**:
- FR-ITEM-001: Users can create listings with: name, description, category, photos, specifications
- FR-ITEM-002: Listing type must be specified: "Offer" (what I have) or "Want" (what I need)
- FR-ITEM-003: Users can mark items as "Gift It Forward" (willing to give without receiving)
- FR-ITEM-004: Users can mark items as "Open to Any Opportunity" (flexible on what to receive)
- FR-ITEM-005: Users can specify item-specific logistics: location, delivery methods, timing, notes
- FR-ITEM-006: AI suggests category based on item name/description
- FR-ITEM-007: AI infers listing type ("Offer" vs "Want") from description
- FR-ITEM-008: Users can add custom specifications (key-value pairs) for detailed items
- FR-ITEM-009: Users can upload up to 5 photos per item
- FR-ITEM-010: Items have status: Available, Pending, Traded

**Specifications System**:
- Example: Book (Author, ISBN, Edition, Condition)
- Example: Electronics (Brand, Model, Year, Condition, Warranty)
- Example: Clothing (Size, Brand, Color, Condition)

**User Stories**:
- As a user, I want to quickly list items so I can start trading
- As a user, I want AI to suggest the category so I don't have to browse a long list
- As a user, I want to specify delivery options so I only match with compatible traders

#### 3.2.2 Item Discovery
**Priority**: P0 (MVP)

**Requirements**:
- FR-DISC-001: Users can browse all available items
- FR-DISC-002: Users can search items by keyword (name, description)
- FR-DISC-003: Users can filter by category
- FR-DISC-004: Users can filter by listing type (Offer/Want)
- FR-DISC-005: Users can filter by location (proximity)
- FR-DISC-006: Users can filter by "Gift It Forward" items only
- FR-DISC-007: Users can sort by: newest, closest, highest-rated owner
- FR-DISC-008: Item list is paginated (20 items per page)
- FR-DISC-009: Item cards show: image, name, category, owner, distance, match score (if applicable)

**User Stories**:
- As a user, I want to see what's available near me so I can avoid shipping
- As a user, I want to find items by keyword so I can quickly locate what I need

---

### 3.3 AI-Powered Matching

#### 3.3.1 Match Algorithm
**Priority**: P0 (MVP Core Differentiator)

**Requirements**:
- FR-MATCH-001: AI matches "Offer" items with "Want" items (and vice versa)
- FR-MATCH-002: AI considers reciprocal opportunities (if A has what B wants, does B have what A wants?)
- FR-MATCH-003: AI assigns match scores: High, Medium, Low
- FR-MATCH-004: AI provides reasoning for each match
- FR-MATCH-005: AI considers user preferences when enabled (motivations, timing, location sensitivity)
- FR-MATCH-006: "Gift It Forward" items always matched if category/description relevant
- FR-MATCH-007: "Open to Any Opportunity" items receive broader matches
- FR-MATCH-008: Two matching modes: Simple (keyword/category) and Advanced (AI-powered with preferences)
- FR-MATCH-009: Users can view match explanations (why AI suggested this trade)
- FR-MATCH-010: Match results cached for 24 hours (unless user refreshes)

**Simple Mode** (Lightweight):
- Keyword overlap in descriptions
- Category matching
- Listing type alignment (Offer matches Want)
- Basic logistics compatibility

**Advanced Mode** (AI-Powered):
- All Simple Mode criteria PLUS:
- User preference alignment
- Reciprocal trade detection
- Multi-party trade suggestions
- Historical trade pattern analysis

**User Stories**:
- As a user, I want to see potential matches for my items so I can discover trade opportunities
- As a user, I want to understand why AI suggested a match so I can trust the recommendations

#### 3.3.2 Match Reporting & Analytics
**Priority**: P1 (Post-MVP)

**Requirements**:
- FR-REPORT-001: System logs all match suggestions with metadata (timestamp, mode, model, scores)
- FR-REPORT-002: Admin can view match report history
- FR-REPORT-003: Users can provide feedback on match quality
- FR-REPORT-004: Feedback influences future matching (ML learning loop)

---

### 3.4 Trade Negotiation

#### 3.4.1 AI-Powered Chat
**Priority**: P0 (MVP Core Feature)

**Requirements**:
- FR-CHAT-001: Users can initiate chat from a match or item page
- FR-CHAT-002: Chat scoped to specific trade (trade offer context)
- FR-CHAT-003: AI assistant participates in negotiation to facilitate agreement
- FR-CHAT-004: AI has access to Smart Suggestion Tool to propose trade structures
- FR-CHAT-005: Chat history persists and loads on return
- FR-CHAT-006: Real-time message delivery (WebSocket or Firestore listeners)
- FR-CHAT-007: Users can see typing indicators
- FR-CHAT-008: Chat supports text messages (voice/video in future)

**AI Chat Capabilities**:
- Answer questions about items
- Suggest fair trade structures
- Propose multi-item bundles
- Identify third-party trades (A→B→C)
- Mediate disagreements
- Suggest compromises

**User Stories**:
- As a user, I want AI to help negotiate so I can find fair trades
- As a user, I want to see creative trade options so I'm not limited to 1:1 swaps

#### 3.4.2 Smart Suggestion Tool
**Priority**: P1 (MVP Enhancement)

**Requirements**:
- FR-SUGGEST-001: AI can query all items owned by both users
- FR-SUGGEST-002: AI suggests multi-item bundles (e.g., 2 of mine for 3 of yours)
- FR-SUGGEST-003: AI identifies reciprocal value (both users get high-value matches)
- FR-SUGGEST-004: Suggestions include reasoning
- FR-SUGGEST-005: Users can accept, reject, or counter suggestions

---

### 3.5 Trade Execution

#### 3.5.1 Trade Offers
**Priority**: P0 (MVP)

**Requirements**:
- FR-OFFER-001: Users can send formal trade offers specifying items from both sides
- FR-OFFER-002: Trade offers have status: Pending, Accepted, Rejected, Completed, Cancelled
- FR-OFFER-003: Users can view incoming and outgoing offers
- FR-OFFER-004: Users can accept or reject offers with one click
- FR-OFFER-005: Both parties must confirm completion before trade marked as Completed
- FR-OFFER-006: Items involved in accepted offers marked as "Pending"
- FR-OFFER-007: Items in completed trades marked as "Traded"
- FR-OFFER-008: Users notified of offer status changes

**User Stories**:
- As a user, I want to formalize agreements so both parties are clear on the trade
- As a user, I want to track my pending trades so I can follow up

#### 3.5.2 Trade Completion & Ratings
**Priority**: P0 (MVP)

**Requirements**:
- FR-COMPLETE-001: Both users mark trade as completed independently
- FR-COMPLETE-002: Users prompted to rate trading partner (1-5 stars + comment)
- FR-COMPLETE-003: Ratings visible on user profiles
- FR-COMPLETE-004: Average rating calculated and displayed
- FR-COMPLETE-005: Users can report problematic trades
- FR-COMPLETE-006: Trade history includes ratings and comments

**User Stories**:
- As a user, I want to rate my trading partner so I can help the community
- As a user, I want to see ratings so I can trade with trustworthy people

---

### 3.6 Trust & Safety

#### 3.6.1 Reputation System
**Priority**: P0 (MVP)

**Requirements**:
- FR-TRUST-001: User ratings aggregated into overall score
- FR-TRUST-002: Number of completed trades displayed on profile
- FR-TRUST-003: Users can view detailed rating breakdowns (responsiveness, item accuracy, etc.)
- FR-TRUST-004: New users flagged as "New Trader" until 3+ completed trades

#### 3.6.2 Reporting & Moderation
**Priority**: P1 (Post-MVP)

**Requirements**:
- FR-MOD-001: Users can report items (spam, inappropriate, scam)
- FR-MOD-002: Users can report other users (fraud, harassment, no-show)
- FR-MOD-003: Admin review queue for reported content
- FR-MOD-004: Automated flags for suspicious behavior (duplicate items, too-good-to-be-true offers)
- FR-MOD-005: AI content moderation for item descriptions (hate speech, prohibited items)
- FR-MOD-006: Users can block other users

---

### 3.7 Admin Dashboard

**Priority**: P1 (Post-MVP)

**Requirements**:
- FR-ADMIN-001: Admin can view all users, items, trades
- FR-ADMIN-002: Admin can view match reports and logs
- FR-ADMIN-003: Admin can toggle AI settings (Simple/Advanced mode, model selection)
- FR-ADMIN-004: Admin can view user feedback on matches
- FR-ADMIN-005: Admin can view AI diagnostic logs
- FR-ADMIN-006: Admin can review reported content
- FR-ADMIN-007: Admin can suspend or ban users
- FR-ADMIN-008: Admin dashboard protected by role-based access

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-PERF-001**: Page load time <3 seconds (Lighthouse score >90)
**NFR-PERF-002**: AI matching completes within 10 seconds for Simple mode, 30 seconds for Advanced mode
**NFR-PERF-003**: Chat messages delivered within 2 seconds
**NFR-PERF-004**: Image optimization (WebP, lazy loading, CDN delivery)
**NFR-PERF-005**: Database queries optimized (indexes on category, location, status)

### 4.2 Security

**NFR-SEC-001**: All user inputs validated and sanitized
**NFR-SEC-002**: Firestore security rules enforce user ownership
**NFR-SEC-003**: API rate limiting (100 requests/minute per user)
**NFR-SEC-004**: HTTPS enforced for all traffic
**NFR-SEC-005**: Passwords hashed with bcrypt (or Firebase Auth default)
**NFR-SEC-006**: No sensitive data in client-side code
**NFR-SEC-007**: CORS configured to allow only trusted domains

### 4.3 Scalability

**NFR-SCALE-001**: Support 10,000 concurrent users
**NFR-SCALE-002**: Support 100,000 items in database
**NFR-SCALE-003**: Horizontal scaling via Firebase/Cloud Functions
**NFR-SCALE-004**: AI API quota monitoring and alerts

### 4.4 Availability

**NFR-AVAIL-001**: 99.9% uptime SLA
**NFR-AVAIL-002**: Graceful degradation when AI services unavailable (fallback to Simple mode)
**NFR-AVAIL-003**: Database backups daily

### 4.5 Accessibility

**NFR-ACCESS-001**: WCAG 2.1 Level AA compliance
**NFR-ACCESS-002**: Keyboard navigation support
**NFR-ACCESS-003**: Screen reader compatible
**NFR-ACCESS-004**: Color contrast ratio >4.5:1

### 4.6 Compatibility

**NFR-COMPAT-001**: Support latest 2 versions of Chrome, Firefox, Safari, Edge
**NFR-COMPAT-002**: Responsive design for mobile (375px), tablet (768px), desktop (1024px+)
**NFR-COMPAT-003**: Progressive Web App (PWA) for mobile installation

### 4.7 Maintainability

**NFR-MAINT-001**: 70%+ code test coverage
**NFR-MAINT-002**: TypeScript strict mode enabled
**NFR-MAINT-003**: ESLint with no ignored errors
**NFR-MAINT-004**: Automated CI/CD pipeline
**NFR-MAINT-005**: Error tracking and monitoring (Sentry or similar)

---

## 5. Technical Architecture

### 5.1 Technology Stack

**Frontend**:
- Next.js 15 (React 18)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui components
- React Hook Form + Zod validation

**Backend**:
- Firebase Authentication
- Firestore (NoSQL database)
- Firebase Storage (images)
- Firebase Cloud Functions (serverless)

**AI/ML**:
- Google Genkit framework
- Gemini 1.5 Pro (primary model)
- Gemini 1.5 Flash (fast responses)
- Gemini Exp (experimental features)

**Infrastructure**:
- Firebase Hosting
- Google Cloud Platform
- GitHub Actions (CI/CD)

### 5.2 Data Models

**Users Collection**:
```typescript
{
  id: string
  email: string
  name: string
  bio?: string
  avatarUrl?: string
  rating: number
  tradesCompleted: number
  locations?: Location[]
  preferences?: UserProfilePreferences
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Items Collection**:
```typescript
{
  id: string
  ownerId: string
  name: string
  description: string
  category: string
  listingType: 'offer' | 'want'
  status: 'available' | 'pending' | 'traded'
  imageUrls: string[]
  specifications?: Record<string, string>
  logistics?: ItemLogistics
  isGiftItForward?: boolean
  openToAnyOpportunity?: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

**TradeOffers Collection**:
```typescript
{
  id: string
  offeringUserId: string
  receivingUserId: string
  offeredItemIds: string[]
  requestedItemIds: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  chatHistory: Message[]
  createdAt: timestamp
  updatedAt: timestamp
  completedAt?: timestamp
}
```

**Ratings Collection**:
```typescript
{
  id: string
  tradeId: string
  raterId: string
  ratedUserId: string
  score: 1 | 2 | 3 | 4 | 5
  comment?: string
  createdAt: timestamp
}
```

### 5.3 API Endpoints (Cloud Functions)

**Authentication**:
- POST /api/auth/signup
- POST /api/auth/signin
- POST /api/auth/signout
- POST /api/auth/reset-password

**Items**:
- GET /api/items (list with pagination)
- GET /api/items/:id
- POST /api/items (create)
- PUT /api/items/:id (update)
- DELETE /api/items/:id (soft delete)

**Matching**:
- POST /api/match (get matches for item)
- GET /api/opportunities/:userId (get all matches for user)

**Trades**:
- POST /api/trades (create offer)
- GET /api/trades/:userId (list user's trades)
- PUT /api/trades/:id/accept
- PUT /api/trades/:id/reject
- PUT /api/trades/:id/complete

**Ratings**:
- POST /api/ratings (submit rating)
- GET /api/ratings/:userId (get user's ratings)

---

## 6. User Flows

### 6.1 New User Onboarding
1. Land on homepage → See value proposition
2. Click "Sign Up" → Choose email or Google
3. Complete registration → Verify email
4. Onboarding wizard:
   - Set location
   - Set profile photo (optional)
   - List first item (guided)
5. View matches for first item → Discover platform value

### 6.2 Creating a Listing
1. Click "List Item"
2. Upload photo(s)
3. Enter name and description
4. AI suggests category → User confirms or edits
5. AI infers listing type (Offer/Want) → User confirms
6. Add specifications (optional)
7. Set logistics (delivery methods, location, timing)
8. Mark "Gift It Forward" if applicable
9. Submit → Item goes live
10. View immediate matches

### 6.3 Finding & Negotiating a Trade
1. Browse items or view "My Opportunities"
2. Click item → See match score and reasoning
3. Click "Start Chat" → Chat window opens with AI assistant
4. User: "I'm interested in this book"
5. AI: "Great! You have [Item X] that [Owner] might like. Would you like to propose a trade?"
6. User: "Yes"
7. AI suggests trade structure → User reviews
8. User sends formal offer
9. Owner receives notification → Reviews offer
10. Owner accepts → Both users coordinate logistics in chat
11. Both mark as completed → Rate each other

### 6.4 Multi-Party Trade Flow (Advanced)
1. User A has Item 1, wants Item 2
2. User B has Item 2, wants Item 3
3. User C has Item 3, wants Item 1
4. AI detects circular trade opportunity
5. AI suggests 3-way trade in chat with User B
6. Users agree to AI's suggestion
7. AI creates group chat with all 3 users
8. Users coordinate logistics
9. All users confirm → Trade completed

---

## 7. MVP Scope

### In Scope (MVP Launch)
✅ User authentication (email/password, Google OAuth)
✅ Create, edit, delete items
✅ AI-powered matching (Simple + Advanced modes)
✅ AI-assisted negotiation chat
✅ Send, accept, reject trade offers
✅ Rate trading partners
✅ User profiles with ratings
✅ Basic admin dashboard
✅ Item search and filtering

### Out of Scope (Post-MVP)
❌ Image upload (use URLs only for MVP)
❌ Real-time chat (async messaging okay for MVP)
❌ Email notifications (in-app only)
❌ Multi-party trades (suggest but don't orchestrate)
❌ Mobile app (PWA only)
❌ Payment/escrow
❌ Shipping integrations
❌ Advanced analytics

---

## 8. Success Criteria

### MVP Launch Criteria
- 100 beta users acquired
- 50 completed trades in first month
- 4.0+ average user rating
- <5% reported issues with AI matching
- 70%+ test coverage
- Zero critical security vulnerabilities

### 6-Month Goals
- 5,000 registered users
- 1,000 completed trades/month
- 60% user retention (30-day)
- 4.5+ average platform rating
- 80%+ AI match acceptance rate

### 12-Month Goals
- 50,000 registered users
- 10,000 completed trades/month
- Revenue model validated (premium features, ads, or commission)
- Mobile app launched
- Expansion to 3+ countries

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low user adoption | Medium | High | Beta test with target communities, referral incentives |
| AI match quality poor | Medium | High | A/B test Simple vs Advanced, collect user feedback |
| Fraud/scams | Medium | High | Strong reputation system, reporting tools, ID verification (future) |
| AI API costs too high | Low | Medium | Cache matches, use Flash model for simple queries |
| No monetization path | Medium | Medium | Premium features (unlimited matches, priority support), ads |
| Competitors copy AI features | High | Low | Build community/brand loyalty, continuous AI improvement |
| Regulatory issues (trades = sales?) | Low | High | Legal review, terms of service clarity, tax guidance |

---

## 10. Open Questions

1. **Monetization**: Free with premium tier? Commission on trades? Ads?
2. **Liability**: If trade goes wrong, is platform liable?
3. **Tax Implications**: Are barter trades taxable events? Do we report to IRS?
4. **International Expansion**: How to handle cross-border trades?
5. **Prohibited Items**: What categories are banned (alcohol, weapons, etc.)?
6. **Dispute Resolution**: How to handle "item not as described" complaints?
7. **Multi-Party Trades**: Should platform orchestrate or just suggest?

---

## 11. Appendices

### Appendix A: Glossary
- **Offer**: Item a user has and is willing to trade
- **Want**: Item a user needs and is seeking
- **Gift It Forward**: Willing to give without receiving anything in return
- **Open to Any Opportunity**: Flexible on what to receive in trade
- **Match Score**: AI's confidence that a trade would be mutually beneficial (High/Medium/Low)
- **Reciprocal Trade**: A↔B trade where A has what B wants AND B has what A wants
- **Multi-Party Trade**: A→B→C trade chain (A gives to B, B gives to C, C gives to A)

### Appendix B: Competitive Analysis
- **Craigslist Barter**: No AI, manual searching, limited trust signals
- **Facebook Marketplace**: Primarily cash sales, some barter, no AI matching
- **Bunz**: Social network + barter, manual matching, niche audience
- **TradeYa**: Item-for-item only, no AI, limited adoption
- **BarterVerse Advantage**: AI matching + negotiation, multi-party trades, trust/safety

### Appendix C: Design References
- Primary Color: Dusty Blue (#7EA9CC)
- Background: Very Light Blue (#F0F4F7)
- Accent: Soft Orange (#CC937E)
- Fonts: Belleza (headers), Alegreya (body)
- Style: Clean, card-based, minimal icons

---

**Document End**

**Approval Required From**:
- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] Legal/Compliance
- [ ] Executive Sponsor
