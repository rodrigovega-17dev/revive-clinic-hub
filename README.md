# Revive Clinic Hub

A comprehensive clinic management system built with React, TypeScript, and Supabase.

## Features

### Core Features
- **Appointment Management**: Schedule, reschedule, and manage appointments
- **Client Management**: Complete client profiles with medical history
- **Therapist Management**: Manage therapist profiles and schedules
- **Financial Tracking**: Payment processing and expense management
- **Multi-language Support**: English and Spanish interfaces

### Google Calendar Integration
- **OAuth2 Authentication**: Secure connection to Google Calendar
- **Automatic Sync**: Appointments are automatically synced when created
- **Real-time Updates**: Changes to appointments are immediately reflected in Google Calendar
- **Manual Sync**: Option to manually sync appointments that weren't automatically synced
- **Event Management**: Create, update, and delete Google Calendar events
- **Color Coding**: Therapist-specific colors for easy identification
- **Meeting Links**: Optional Google Meet integration

## Google Calendar Sync Features

### Automatic Sync
- ✅ **Create**: New appointments are automatically created in Google Calendar
- ✅ **Update**: Modified appointments are automatically updated in Google Calendar
- ✅ **Delete**: Cancelled appointments are automatically removed from Google Calendar
- ✅ **Event ID Tracking**: Google Calendar event IDs are stored for seamless sync

### Manual Sync
- ✅ **Sync Status Indicator**: Visual indicator showing sync status
- ✅ **Manual Sync Button**: Sync appointments that weren't automatically synced
- ✅ **Error Handling**: Graceful handling of sync failures

### Configuration
- ✅ **Calendar Selection**: Choose which Google Calendar to sync with
- ✅ **Reminder Settings**: Configurable reminder notifications
- ✅ **Color Coding**: Assign colors to therapists for visual organization
- ✅ **Meeting Links**: Optional Google Meet integration for virtual sessions

## Setup

### Prerequisites
- Node.js 18+ 
- Supabase account
- Google Cloud Console access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd revive-clinic-hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your environment variables:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Calendar
VITE_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/google-auth-callback
```

5. Set up the database:
```bash
npx supabase db push
```

6. Start the development server:
```bash
npm run dev
```

## Google Calendar Setup

See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed setup instructions.

## Usage

### Connecting Google Calendar
1. Go to Settings page
2. Click "Connect Google Calendar"
3. Complete the OAuth flow
4. Select your preferred calendar

### Managing Appointments
- **Create**: New appointments are automatically synced to Google Calendar
- **Update**: Modified appointments (time, date, therapist, etc.) are automatically updated
- **Cancel**: Cancelled appointments are automatically removed from Google Calendar
- **Manual Sync**: Use the sync button for appointments that weren't automatically synced

## Development

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: TanStack Query
- **Calendar Integration**: Google Calendar API

### Project Structure
```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   ├── google-calendar/ # Google Calendar integration
│   └── supabase/       # Supabase client and types
├── i18n/               # Internationalization
├── lib/                # Utility functions
└── pages/              # Page components
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
