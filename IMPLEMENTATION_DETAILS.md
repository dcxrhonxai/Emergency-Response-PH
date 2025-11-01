# Emergency Response PH - Complete Implementation Documentation

## Project Overview
- **App ID**: com.dcxrhonx.emergencyresponseph
- **App Name**: EmergencyResponsePH
- **Platform**: React + Vite + Capacitor (Android/iOS)
- **Backend**: Lovable Cloud (Supabase)

---

## 1. DATABASE SCHEMA

### Tables

#### `profiles`
**Purpose**: Store user profile and medical information
**Columns**:
- `id` (uuid, PK) - References auth.users
- `full_name` (text, nullable)
- `phone_number` (text, nullable)
- `blood_type` (text, nullable)
- `allergies` (text, nullable)
- `medical_conditions` (text, nullable)
- `emergency_notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies**:
- ✅ Users can view own profile (SELECT)
- ✅ Users can insert own profile (INSERT)
- ✅ Users can update own profile (UPDATE)
- ❌ DELETE not allowed

**Triggers**:
- `update_profiles_updated_at` - Auto-updates `updated_at` on row modification

---

#### `emergency_alerts`
**Purpose**: Store active and historical emergency alerts
**Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `emergency_type` (text, NOT NULL) - Type of emergency
- `situation` (text, NOT NULL) - Description of situation
- `latitude` (numeric, NOT NULL)
- `longitude` (numeric, NOT NULL)
- `status` (text, default: 'active')
- `evidence_files` (jsonb, default: []) - Array of file references
- `created_at` (timestamp)
- `resolved_at` (timestamp, nullable)

**RLS Policies**:
- ✅ Users can view own alerts (SELECT where user_id = auth.uid())
- ✅ Users can insert own alerts (INSERT where user_id = auth.uid())
- ✅ Users can update own alerts (UPDATE where user_id = auth.uid())
- ❌ DELETE not allowed

---

#### `alert_notifications`
**Purpose**: Track notifications sent for each alert
**Columns**:
- `id` (uuid, PK)
- `alert_id` (uuid, NOT NULL) - References emergency_alerts
- `contact_name` (text, NOT NULL)
- `contact_phone` (text, NOT NULL)
- `notified_at` (timestamp, NOT NULL)
- `viewed_at` (timestamp, nullable)
- `created_at` (timestamp)

**RLS Policies**:
- ✅ Users can view notifications for their alerts (SELECT via alert_id lookup)
- ✅ Users can insert notifications for their alerts (INSERT via alert_id lookup)
- ❌ UPDATE not allowed
- ❌ DELETE not allowed

---

#### `personal_contacts`
**Purpose**: Store user's emergency contact list
**Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `phone` (text, NOT NULL)
- `relationship` (text, nullable)
- `created_at` (timestamp)

**RLS Policies**:
- ✅ Users can view own contacts (SELECT where user_id = auth.uid())
- ✅ Users can insert own contacts (INSERT where user_id = auth.uid())
- ✅ Users can update own contacts (UPDATE where user_id = auth.uid())
- ✅ Users can delete own contacts (DELETE where user_id = auth.uid())

---

#### `emergency_services`
**Purpose**: Store emergency service locations (police, hospitals, fire stations)
**Columns**:
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `type` (text, NOT NULL) - e.g., 'police', 'hospital', 'fire'
- `phone` (text, NOT NULL)
- `address` (text, nullable)
- `city` (text, nullable)
- `latitude` (numeric, NOT NULL)
- `longitude` (numeric, NOT NULL)
- `is_national` (boolean, default: false)
- `created_at` (timestamp)

**RLS Policies**:
- ✅ Anyone can view (SELECT with true)
- ❌ INSERT not allowed (admin only via SQL)
- ❌ UPDATE not allowed
- ❌ DELETE not allowed

---

## 2. DATABASE FUNCTIONS

### `handle_new_user()`
**Purpose**: Auto-create profile when user signs up
**Trigger**: AFTER INSERT on auth.users
**Security**: DEFINER
**Logic**: Inserts row in profiles table with user's full_name from metadata

### `update_updated_at_column()`
**Purpose**: Auto-update timestamp on row changes
**Security**: DEFINER
**Used By**: profiles table

---

## 3. STORAGE BUCKETS

### `emergency-photos`
- **Public**: No
- **Purpose**: Store emergency photo evidence

### `emergency-videos`
- **Public**: No
- **Purpose**: Store emergency video evidence

### `emergency-audio`
- **Public**: No
- **Purpose**: Store emergency audio recordings

**Storage Policies**: Need to be configured for user access

---

## 4. EDGE FUNCTIONS

### `send-emergency-email`
**Path**: `supabase/functions/send-emergency-email/index.ts`
**Purpose**: Send email and SMS notifications to emergency contacts
**Dependencies**:
- Resend API (for emails)
- Semaphore API (for SMS in Philippines)

**Input**:
```typescript
{
  alertId: string
  contacts: Array<{name, email?, phone}>
  emergencyType: string
  situation: string
  location: {latitude, longitude}
  evidenceFiles?: Array<{url, type}>
}
```

**Output**:
```typescript
{
  success: boolean
  emailSent: number
  emailFailed: number
  smsSent: number
  smsFailed: number
  results: {email: [], sms: []}
}
```

**Features**:
- Sends HTML emails with emergency details
- Includes Google Maps link to location
- Attaches evidence files
- Sends SMS via Semaphore API
- Records notifications in `alert_notifications` table

---

## 5. SECRETS CONFIGURATION

Required environment variables:
- ✅ `RESEND_API_KEY` - For sending emails
- ✅ `SEMAPHORE_API_KEY` - For sending SMS
- ✅ `SUPABASE_URL` - Auto-configured
- ✅ `SUPABASE_ANON_KEY` - Auto-configured
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured
- ✅ `SUPABASE_DB_URL` - Auto-configured
- ✅ `SUPABASE_PUBLISHABLE_KEY` - Auto-configured

---

## 6. FRONTEND IMPLEMENTATION

### Pages

#### `src/pages/Index.tsx`
**Purpose**: Main dashboard with tabbed interface
**Features**:
- Emergency SOS activation
- Quick SOS button
- Tabbed navigation (Emergency, Contacts, Profile, History)
- Active alert view with map and contact list
- Real-time alert updates
- Location sharing

**State Management**:
- Authentication check with redirect
- Active alert tracking
- Real-time subscriptions

#### `src/pages/Auth.tsx`
**Purpose**: User authentication (login/signup)

#### `src/pages/NotFound.tsx`
**Purpose**: 404 error page

---

### Components

#### Emergency Components
- **`EmergencyForm.tsx`**: Form to trigger emergency alerts
- **`ActiveAlerts.tsx`**: Display active emergency alerts
- **`AlertHistory.tsx`**: View past emergency alerts

#### Media Capture
- **`MediaCapture.tsx`**: Main media capture interface
- **`CameraCapture.tsx`**: Capture photos
- **`AudioRecorder.tsx`**: Record audio evidence
- **Video Recording**: Via browser-image-compression

#### Contact Management
- **`ContactList.tsx`**: Display contact list
- **`ContactCard.tsx`**: Individual contact display
- **`PersonalContacts.tsx`**: Manage personal emergency contacts

#### Location
- **`LocationMap.tsx`**: Display emergency location on map
- **`ShareLocation.tsx`**: Share location with contacts

#### Profile
- **`EmergencyProfile.tsx`**: Manage medical and personal info

#### UI Components (shadcn/ui)
Full set of 50+ shadcn components in `src/components/ui/`

---

### Custom Hooks

#### `useEmergencyNotifications.ts`
**Purpose**: Send notifications to contacts via edge function
**Methods**:
- `sendNotifications(alertId, contacts, emergencyType, situation, location, evidenceFiles?)`

#### `useRealtimeAlerts.ts`
**Purpose**: Subscribe to real-time alert updates
**Features**:
- Fetches initial alerts
- Subscribes to INSERT/UPDATE/DELETE events
- Shows toast notifications for changes

#### `useOfflineSync.ts`
**Purpose**: Handle offline data synchronization
**Features**:
- Detects online/offline status
- Queues operations when offline
- Auto-syncs when back online
- Stores pending operations in localStorage

---

### Utilities

#### `src/lib/storage.ts`
**Purpose**: File upload to Supabase storage
**Functions**: File management for evidence

#### `src/lib/validation.ts`
**Purpose**: Form validation helpers

#### `src/lib/videoCompression.ts`
**Purpose**: Compress videos before upload

#### `src/lib/distance.ts`
**Purpose**: Calculate distances between coordinates

---

## 7. MOBILE (CAPACITOR) IMPLEMENTATION

### Configuration
**File**: `capacitor.config.ts`
- App ID: `com.dcxrhonx.emergencyresponseph`
- App Name: `EmergencyResponsePH`
- Web Directory: `dist`

### Installed Plugins
1. **@capacitor/core** (v7.4.3)
2. **@capacitor/android** (v7.4.3)
3. **@capacitor/ios** (v7.4.3)
4. **@capacitor/camera** (v7.0.2) - Photo/video capture
5. **@capacitor/filesystem** (v7.1.4) - File operations
6. **@capacitor-community/media** (v8.0.1) - Media management
7. **capacitor-voice-recorder** (v1.1.1) - Audio recording

### Android Configuration

#### `android/app/build.gradle`
- Compile SDK: 34
- Min SDK: 22
- Target SDK: 34
- Java Version: 21

#### `android/build.gradle`
- Gradle: 8.13.0
- Google Services: 4.4.2

#### `android/variables.gradle`
- minSdkVersion: 22
- compileSdkVersion: 34
- targetSdkVersion: 34

#### `android/app/src/main/AndroidManifest.xml`
**Permissions**:
- ✅ INTERNET
- Additional permissions added by plugins

**Features**:
- FileProvider configured for file sharing
- Main activity exported and launchable

---

## 8. ROUTING

**File**: `src/App.tsx`

Routes:
- `/` - Index (Main Dashboard)
- `/auth` - Authentication
- `*` - NotFound (404)

**State Management**:
- React Query for data fetching
- React Router for navigation
- Zustand/Context (if implemented)

---

## 9. AUTHENTICATION FLOW

1. User lands on Index page (`/`)
2. `useEffect` checks for authenticated session
3. If not authenticated → redirect to `/auth`
4. User signs up/logs in
5. `handle_new_user()` trigger creates profile
6. User redirected to dashboard
7. Session persisted in localStorage

**Auth Configuration**:
- Provider: Supabase Auth
- Storage: localStorage
- Session persistence: Enabled
- Auto-refresh tokens: Enabled

---

## 10. EMERGENCY ALERT WORKFLOW

### Triggering Alert
1. User fills `EmergencyForm` or taps Quick SOS
2. App requests geolocation
3. Optional: Capture photo/video/audio evidence
4. Alert created in `emergency_alerts` table
5. Edge function `send-emergency-email` invoked
6. Notifications sent via email and SMS
7. Records saved to `alert_notifications`

### Real-time Updates
1. `useRealtimeAlerts` subscribes to changes
2. New alerts trigger toast notifications
3. Status changes update UI immediately
4. Map updates with latest location

### Resolving Alert
1. User clicks "I'm Safe" or "End Alert"
2. Alert status updated to 'resolved'
3. `resolved_at` timestamp set
4. Contacts may receive resolution notification

---

## 11. OFFLINE CAPABILITIES

**Implementation**: `useOfflineSync` hook

**Features**:
- Detects browser online/offline events
- Queues CRUD operations when offline
- Persists queue in localStorage
- Auto-syncs on reconnection

**Operations Supported**:
- INSERT
- UPDATE
- DELETE

---

## 12. DESIGN SYSTEM

**Files**:
- `src/index.css` - CSS variables and global styles
- `tailwind.config.ts` - Tailwind configuration

**Theme**:
- Semantic color tokens (HSL format)
- Dark mode support
- Responsive breakpoints
- Custom animations via tailwindcss-animate

**UI Library**: shadcn/ui components

---

## 13. DEPENDENCIES

### Core
- react (18.3.1)
- react-dom (18.3.1)
- react-router-dom (6.30.1)
- vite (build tool)

### Backend
- @supabase/supabase-js (2.58.0)
- @tanstack/react-query (5.83.0)

### Mobile
- @capacitor/* packages (7.4.3)
- capacitor-voice-recorder (1.1.1)

### UI
- @radix-ui/* components (40+ packages)
- lucide-react (0.462.0) - Icons
- tailwindcss
- class-variance-authority
- tailwind-merge

### Forms
- react-hook-form (7.61.1)
- zod (3.25.76) - Validation
- @hookform/resolvers (3.10.0)

### Utils
- date-fns (3.6.0)
- browser-image-compression (2.0.2)
- sonner (1.7.4) - Toast notifications

---

## 14. TESTING & DEPLOYMENT

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Mobile Sync
```bash
npx cap sync
```

### Run on Android
```bash
npx cap run android
```

### Run on iOS
```bash
npx cap run ios
```

---

## 15. MISSING/TODO IMPLEMENTATIONS

### Storage Policies
⚠️ **CRITICAL**: Storage bucket RLS policies need to be implemented for:
- emergency-photos
- emergency-videos  
- emergency-audio

**Required policies**:
```sql
-- Users can upload their own evidence
CREATE POLICY "Users can upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own evidence
CREATE POLICY "Users can view own evidence"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Email Configuration
⚠️ Resend sender email is currently `onboarding@resend.dev` (test domain)
- Should update to custom domain email

### Features Not Yet Implemented
- [ ] Admin dashboard for emergency services
- [ ] Push notifications (requires native implementation)
- [ ] Background location tracking
- [ ] Emergency contact auto-dial
- [ ] Integration with local emergency services APIs
- [ ] Multi-language support
- [ ] In-app chat with emergency contacts
- [ ] Medical ID card display
- [ ] Emergency service routing/directions
- [ ] Alert escalation (if not resolved in X minutes)

### Security Enhancements
- [ ] Rate limiting on alert creation
- [ ] Evidence file size limits enforcement
- [ ] Abuse detection (too many false alerts)
- [ ] Two-factor authentication option
- [ ] Biometric authentication for quick SOS

---

## 16. SECURITY CONSIDERATIONS

### Implemented
✅ Row-Level Security on all tables
✅ Server-side notification sending
✅ Service role key stored as secret
✅ File uploads to private buckets
✅ Authentication required for all operations

### Potential Vulnerabilities
⚠️ Storage buckets lack RLS policies (see #15)
⚠️ No rate limiting on emergency alerts
⚠️ Evidence files not size-limited at storage level
⚠️ No abuse detection mechanism

---

## 17. SUPABASE PROJECT DETAILS

- **Project ID**: jbznnjhcqdhvjtdfxtuv
- **Region**: Auto-assigned
- **Database**: PostgreSQL (via Supabase)
- **Realtime**: Enabled for emergency_alerts table

---

## SUMMARY

This is a fully functional emergency response application with:
- ✅ User authentication
- ✅ Emergency alert creation with location
- ✅ Multi-media evidence capture
- ✅ Email and SMS notifications  
- ✅ Personal emergency contacts management
- ✅ Medical profile storage
- ✅ Real-time alert updates
- ✅ Offline operation support
- ✅ Native mobile app support (Android/iOS)
- ✅ Alert history tracking

**Critical Gap**: Storage bucket RLS policies must be implemented before production use.

---

**Last Updated**: Based on commit 7f9c4c5
