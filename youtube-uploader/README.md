# ShotCraft YouTube Uploader

A standalone local web app for sending exported videos from Remotion, Hyperframes, VoiceStudio, Video Shotcraft, or another editor straight to your own YouTube channel. It uses the YouTube Data API v3; it does not depend on those source projects being installed or running.

The MVP supports Google OAuth, direct video upload, a list of the 12 most recent channel uploads, and editing a video's title, description, and visibility. It does not delete videos or schedule publishing. New uploads use YouTube's **People & Blogs** category and default to **private**.

## Requirements

- Node.js 20.12 or newer
- A Google OAuth client configured for a local web app
- YouTube Data API v3 enabled in the same Google Cloud project

## Set up Google OAuth

1. In Google Cloud Console, create or select a project and enable **YouTube Data API v3**.
2. Configure the OAuth consent screen. If the app is in testing, add the Google account that will use it as a test user.
3. Create an OAuth client ID of type **Web application**.
4. Add `http://localhost:4175` as an authorized JavaScript origin and `http://localhost:4175/oauth/callback` as an authorized redirect URI.
5. Start the app and open **Configure Google OAuth** on its home page. Enter the client ID and client secret from that OAuth client, then choose **Save credentials in memory**.

The settings form sends credentials to this app's local server. They stay in server memory only, are not returned to the browser or written to disk, and are cleared when the server stops. The form clears after a successful save. Google access and refresh tokens also remain in server memory. Connect the channel again after restarting the app.

The server binds to `127.0.0.1` by default, and credential settings reject non-local requests. Do not expose this service to other devices. The `.env.example` file is an optional alternative for setting credentials before startup; never commit real credentials. Google may require OAuth consent-screen verification before the app can be used by people outside its configured test users.

## Run

```sh
cd youtube-uploader
npm start
```

Open `http://localhost:4175` in the same browser origin you registered with Google. For a deployment, configure credentials through protected environment variables rather than the local-only settings form, use HTTPS, and set `APP_ORIGIN`, `GOOGLE_REDIRECT_URI`, `HOST`, and `PORT` to the actual deployment values.

The app streams the selected file through the local server to YouTube without saving it. An interrupted or unconfirmed upload may already have reached YouTube; check YouTube Studio before starting another upload to avoid duplicates.

## Validate

```sh
npm test
```
