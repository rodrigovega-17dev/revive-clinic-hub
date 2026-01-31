# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration for your clinic management system.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console
3. Your clinic management application running locally

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add the following authorized redirect URIs:
   - `http://localhost:5173/google-auth-callback` (for development)
   - `https://yourdomain.com/google-auth-callback` (for production)
5. Click "Create"
6. Note down your Client ID and Client Secret

## Step 3: Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/google-auth-callback

# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Go to Settings page
3. Click "Connect Google Calendar"
4. Complete the OAuth flow
5. Verify that appointments are syncing to Google Calendar

## Features

### Phase 1 (Current Implementation)
- ✅ Connect to Google Calendar via OAuth 2.0
- ✅ Create appointments in Google Calendar
- ✅ Update appointments in Google Calendar
- ✅ Delete appointments from Google Calendar
- ✅ Automatic token refresh
- ✅ Basic sync settings

### Future Phases
- 🔄 Two-way sync (Google Calendar → App)
- 🔄 Recurring appointments
- 🔄 Meeting links (Google Meet)
- 🔄 Calendar sharing
- 🔄 Advanced conflict resolution

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Make sure the redirect URI in your Google Cloud Console matches exactly
   - Check that your environment variables are set correctly

2. **"Access denied" error**
   - Ensure the Google Calendar API is enabled
   - Check that your OAuth consent screen is configured

3. **Appointments not syncing**
   - Verify that you're connected to Google Calendar
   - Check the browser console for errors
   - Ensure the appointment has all required fields

### Debug Mode

To enable debug logging, add this to your environment variables:
```env
VITE_DEBUG_GOOGLE_CALENDAR=true
```

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client Secret secure
- Use environment variables for all sensitive configuration
- Consider using a service account for production deployments

## API Limits

Google Calendar API has the following limits:
- 1,000,000 queries per day per user
- 10,000 queries per 100 seconds per user
- 1,000 queries per 100 seconds per user per calendar

Monitor your usage in the Google Cloud Console to avoid hitting these limits. 