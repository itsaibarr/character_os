# Setting up Google Authentication

To enable "Sign in with Google", you need to create a project in the Google Cloud Console and obtain a Client ID and Client Secret.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top of the page.
3. Click "New Project".
4. Enter a project name (e.g., "CharacterOS Auth") and click "Create".

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **External** as the User Type and click "Create".
3. Fill in the required fields:
   - **App name**: CharacterOS
   - **User support email**: Select your email.
   - **Developer contact information**: Enter your email.
4. Click "Save and Continue".
5. Skip the "Scopes" section by clicking "Save and Continue".
6. Skip the "Test Users" section by clicking "Save and Continue".
7. Review the summary and click "Back to Dashboard".

## Step 3: Create Credentials

1. In the left sidebar, navigate to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name user client (e.g., "Better Auth Client").
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google`
7. Click "Create".

## Step 4: Add Credentials to Environment Variables

1. Copy the **Client ID** and **Client Secret** from the success modal.
2. Open your `.env.local` file in the project.
3. Paste the values into the corresponding variables:

```env
GOOGLE_CLIENT_ID="your-client-id-here"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

## Step 5: Restart Server

Restart your development server to load the new environment variables:

```bash
npm run dev
```

You should now see the "Sign in with Google" button on the Sign In and Sign Up pages.
