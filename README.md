# Leit - AI-Enhanced Flashcard Platform

A modular, AI-enhanced flashcard platform with spaced repetition, smart answer evaluation, and Canvas LTI 1.3 integration capabilities.

## Features

- **Interactive Flashcard Sessions**: Type-to-answer with smart evaluation
- **Spaced Repetition**: FSRS-inspired scheduling (Again/Hard/Good/Easy)
- **Database Persistence**: Supabase-backed session logging and progress tracking
- **CSV Import**: Quick deck creation from CSV files
- **Modular Architecture**: Clean separation for future Canvas LTI 1.3 integration
- **Progress Tracking**: Real-time session statistics and accuracy tracking

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (Lovable Cloud)
- **UI**: Tailwind CSS + shadcn/ui components
- **Architecture**: Modular services for database, LTI, and session management

## Development Setup

1. **Clone and Install**:
   ```bash
   git clone <repo-url>
   cd leit
   npm install
   ```

2. **Environment Configuration**:
   - Copy `.env.example` to `.env`
   - Lovable Cloud automatically configures Supabase variables
   - Canvas LTI variables are placeholders for future implementation

3. **Database Setup**:
   - Database schema is automatically created via Supabase migration
   - Includes tables: `decks`, `cards`, `users`, `sessions`, `session_events`
   - Demo data is seeded automatically

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # React UI components
├── services/           # Business logic services
│   ├── database.ts     # Supabase database operations
│   ├── deckImporter.ts # CSV and CrowdAnki import
│   ├── sessionManager.ts # Session state management
│   └── lti/           # Canvas LTI 1.3 integration (stubs)
│       ├── launch.ts   # OIDC launch handling
│       ├── deeplink.ts # Content item creation
│       └── ags.ts      # Assignment and Grade Services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── pages/             # Route components
```

## Usage

### Quick Start
1. Open the application
2. Click "Quick Demo" to create a sample deck
3. Start studying with interactive flashcards
4. Use keyboard shortcuts: Enter (reveal), 1-4 (quality rating)

### CSV Import
1. Click "Import CSV" on the deck picker
2. Select a CSV file with columns: `front,back,hint,answers,tags`
3. Multiple answers separated by `|`
4. Tags separated by commas

### Example CSV Format
```csv
front,back,hint,answers,tags
What is the capital of France?,Paris,Starts with P,Paris|Paris France,geography europe
What is 2 + 2?,4,Basic arithmetic,4|four,math basic
```

## API Integration

### Session Flow
1. **Start Session**: `SessionManager.startSession(deckId)`
2. **Record Answers**: `SessionManager.recordAnswer(cardId, response, quality, expectedAnswers)`
3. **Finish Session**: `SessionManager.finishSession()`

### Database Operations
- **Decks**: `DatabaseService.getDecks()`, `DatabaseService.createDeck()`
- **Cards**: `DatabaseService.getCardsByDeck()`, `DatabaseService.createCards()`
- **Sessions**: Session and event logging with automatic timestamps

## Canvas LTI 1.3 Integration (Future)

The platform is architected for Canvas LTI 1.3 integration:

- **Launch**: OIDC authentication and context extraction
- **Deep Linking**: Content item creation for Canvas modules
- **AGS**: Grade passback for assessment scores
- **Configuration**: Environment variables for Canvas API endpoints

Canvas API integration uses the `CANVAS_API` secret (configured via Lovable Cloud).

## Environment Variables

```bash
# Application
PORT=3000
NODE_ENV=development

# Supabase (auto-configured by Lovable Cloud)
VITE_SUPABASE_URL=<auto>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto>
VITE_SUPABASE_PROJECT_ID=<auto>

# Canvas LTI 1.3 (for future implementation)
CANVAS_BASE_URL=<canvas-instance>
CANVAS_CLIENT_ID=<lti-client-id>
CANVAS_DEPLOYMENT_ID=<deployment-id>
CANVAS_AUTH_URL=<oidc-auth-endpoint>
CANVAS_TOKEN_URL=<token-endpoint>
CANVAS_JWKS_URL=<jwks-endpoint>
```

## Deployment

The application deploys automatically via Lovable Cloud with:
- Supabase database and RLS policies
- Environment variable management
- Automatic SSL and domain management

## Contributing

1. Follow the modular architecture
2. Add TypeScript types for all interfaces
3. Use semantic tokens from the design system
4. Test CSV import/export functionality
5. Maintain Canvas LTI compatibility in service layer

## License

MIT License - see LICENSE file for details.