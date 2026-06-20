<!-- SYNC IMPACT REPORT
Version Bump: 1.0.0 (initial version)
Rationale: First constitution for BloomStock project
New Principles: 5 (Type Safety, Multi-User Ready, Responsive Design, Local-First Storage, API Contract Clarity)
New Sections: Technology Stack, Testing Standards, Development Workflow
Templates Updated: All templates aligned with constitution principles
Follow-up TODOs: None
-->

# BloomStock Constitution

## Core Principles

### I. Type Safety First
Every piece of shared data (types, API contracts, state shapes) MUST be defined in TypeScript. No `any` types in non-legacy code. Runtime validation at system boundaries (API responses, AsyncStorage deserialization) is non-negotiable. This ensures the codebase remains navigable and catch-able as the team scales.

### II. Multi-User Ready
Data models MUST be designed with future multi-florist expansion in mind, even though v1 serves a single user. No hardcoded user state at the top level. Every collection (orders, inventory, receipts) must have a user/owner field. This prevents costly refactoring when monetization expands.

### III. Responsive Design by Default
iOS layouts MUST function identically on iPhone and iPad. Use responsive grid breakpoints (2-col iPhone, 3-col iPad) and test both form factors before shipping. Screen-specific logic is acceptable only for true platform differences (Safe Area handling, keyboard interactions).

### IV. Local-First Storage with Audit Trail
AsyncStorage is the source of truth for v1. All state mutations MUST be persisted immediately. Every data write includes a timestamp. Schema versioning (via `bloomstock:schema_version`) is mandatory—migrations must be reversible where possible. This makes debugging user issues transparent and enables safe future cloud sync.

### V. API Contract Clarity
Claude API calls (receipt parsing) MUST include explicit prompts and return types in code. Error handling distinguishes API errors (network, rate limits, malformed response) from parse failures (OCR too noisy, flower name ambiguity). Prompts are stored in `lib/claude.ts` as documented constants, not scattered strings.

## Technology Stack & Constraints

**Language & Typing**: TypeScript (strict mode). No JavaScript outside of tooling.  
**Runtime**: React Native 0.73+ via Expo. iOS only for v1.  
**State Management**: React Context + `useReducer` for app state. AsyncStorage for persistence.  
**UI Components**: React Native built-ins + Expo components. Third-party UI libs require team consensus.  
**External APIs**: Claude API (Sonnet 4.6) for receipt parsing. Vision framework for on-device OCR.  
**Testing**: Jest for unit tests. React Native Testing Library for component tests. No UI test framework required for v1 (manual verification acceptable).

## Development Workflow

**Feature Branches**: Create feature branches from `main` following `feat/feature-name` naming.  
**Code Review**: All PRs require review before merge. Linting and type checking must pass.  
**Testing Gates**: New features touching data models or allocation logic require test coverage. Manual testing of UI changes acceptable in v1.  
**Commit Hygiene**: Descriptive commit messages. Squash multi-commit PRs into logical chunks before merge.  
**Documentation**: Types are self-documenting. Complex business logic (allocation algorithm, receipt parsing) requires inline comments explaining the *why*, not the *what*.

## Governance

All decisions regarding scope, architecture, and quality standards defer to this constitution. Amendments require explicit justification (e.g., new principle if a technical debt becomes critical, version bump if implementation guidance changes).

Version increments follow semantic rules:
- **MAJOR**: Backward-incompatible governance changes or principle removals.
- **MINOR**: New principle, new section, or materially expanded guidance.
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements.

**Version**: 1.0.0 | **Ratified**: 2026-06-20 | **Last Amended**: 2026-06-20
