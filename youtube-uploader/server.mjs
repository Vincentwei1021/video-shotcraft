import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { fileURLToPath } from "node:url";
import path from "node:path";

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
const BRAND_MARK = path.resolve(APP_ROOT, "../assets/brand/logo-mark-reverse.svg");
const API_ORIGIN = "https://youtube.googleapis.com/youtube/v3";
const OAUTH_ORIGIN = "https://oauth2.googleapis.com";
const SESSION_COOKIE = "shotcraft_youtube_session";
const MAX_JSON_BYTES = 16 * 1024;
const MAX_UPLOAD_BYTES = 256 * 1024 ** 3;
const VIDEO_MIME_TYPES = new Set([
  "video/3gpp",
  "video/mp2t",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-flv",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-msvideo",
  "video/x-ms-wmv",
]);
const YOUTUBE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];
const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https://i.ytimg.com data:; style-src 'self'; script-src 'self'; connect-src 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validateVideoMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "invalid_metadata", "Enter a title, description, and privacy setting.");
  }

  const { title, description, privacyStatus } = value;
  if (typeof title !== "string" || !title.trim() || [...title].length > 100) {
    throw new AppError(400, "invalid_title", "Title is required and must be 100 characters or fewer.");
  }
  if (typeof description !== "string" || [...description].length > 5000) {
    throw new AppError(400, "invalid_description", "Description must be 5,000 characters or fewer.");
  }
  if (!["private", "unlisted", "public"].includes(privacyStatus)) {
    throw new AppError(400, "invalid_privacy", "Choose private, unlisted, or public visibility.");
  }

  return {
    title: title.trim(),
    description,
    privacyStatus,
  };
}

function readConfig(env) {
  const port = Number(env.PORT ?? 4175);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be a whole number between 0 and 65535.");
  }

  const appOriginUrl = new URL(env.APP_ORIGIN ?? `http://localhost:${port}`);
  if (!["http:", "https:"].includes(appOriginUrl.protocol) || appOriginUrl.pathname !== "/") {
    throw new Error("APP_ORIGIN must be an http or https origin without a path.");
  }

  const redirectUri = new URL(env.GOOGLE_REDIRECT_URI ?? `${appOriginUrl.origin}/oauth/callback`);
  if (redirectUri.origin !== appOriginUrl.origin || redirectUri.pathname !== "/oauth/callback") {
    throw new Error("GOOGLE_REDIRECT_URI must use APP_ORIGIN and the /oauth/callback path.");
  }

  return {
    appOrigin: appOriginUrl.origin,
    environmentCredentials: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
    host: env.HOST ?? "127.0.0.1",
    port,
    redirectUri: redirectUri.href,
    runtimeCredentials: null,
    secureCookie: appOriginUrl.protocol === "https:",
  };
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function readCookies(request) {
  const cookies = new Map();
  for (const piece of (request.headers.cookie ?? "").split(";")) {
    const separator = piece.indexOf("=");
    if (separator > 0) {
      cookies.set(piece.slice(0, separator).trim(), piece.slice(separator + 1).trim());
    }
  }
  return cookies;
}

function setSessionCookie(response, id, secure) {
  const parts = [
    `${SESSION_COOKIE}=${id}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) parts.push("Secure");
  response.setHeader("Set-Cookie", parts.join("; "));
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function sendCallbackError(response, status, message) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>YouTube connection</title><body><main><h1>YouTube connection needs attention</h1><p>${escapeHtml(message)}</p><a href="/">Return to ShotCraft YouTube Uploader</a></main></body></html>`,
  );
}

async function readJson(request) {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AppError(415, "json_required", "Send the form as JSON.");
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_JSON_BYTES) {
      throw new AppError(413, "request_too_large", "Request is too large.");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function requireMutation(request, session, config) {
  if (request.headers.origin !== config.appOrigin) {
    throw new AppError(403, "invalid_origin", "Request origin was not accepted. Reload the app and try again.");
  }
  if (!safeEqual(request.headers["x-csrf-token"], session.csrfToken)) {
    throw new AppError(403, "invalid_csrf", "Your session expired. Reload the page and try again.");
  }
}

function getGoogleCredentials(config) {
  return config.runtimeCredentials ?? config.environmentCredentials;
}

function googleConfigurationStatus(config) {
  const credentials = getGoogleCredentials(config);
  const configured = Boolean(credentials.clientId && credentials.clientSecret);
  return {
    googleConfigured: configured,
    credentialSource: !configured
      ? null
      : config.runtimeCredentials
        ? "runtime"
        : "environment",
    hasEnvironmentCredentials: Boolean(
      config.environmentCredentials.clientId && config.environmentCredentials.clientSecret,
    ),
  };
}

function requireGoogleCredentials(config) {
  const credentials = getGoogleCredentials(config);
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new AppError(
      503,
      "oauth_not_configured",
      "Google sign-in is not configured. Enter your OAuth client ID and secret in Google OAuth settings.",
    );
  }
  return credentials;
}

function validateGoogleCredentials(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "invalid_google_credentials", "Enter your Google OAuth client ID and client secret.");
  }
  const clientId = typeof value.clientId === "string" ? value.clientId.trim() : "";
  const clientSecret = typeof value.clientSecret === "string" ? value.clientSecret.trim() : "";
  if (!clientId || clientId.length > 512 || /\s/.test(clientId)) {
    throw new AppError(400, "invalid_google_client_id", "Enter a valid Google OAuth client ID without spaces.");
  }
  if (clientSecret.length < 8 || clientSecret.length > 512 || /\s/.test(clientSecret)) {
    throw new AppError(400, "invalid_google_client_secret", "Enter the Google OAuth client secret from your web application.");
  }
  return { clientId, clientSecret };
}

function requireLoopback(request) {
  const address = request.socket.remoteAddress?.replace(/^::ffff:/, "");
  if (address !== "::1" && !address?.startsWith("127.")) {
    throw new AppError(403, "local_settings_only", "Google credentials can only be configured from the local machine running this app.");
  }
}

function clearAuthorizedSessions(sessions, uploads) {
  for (const session of sessions.values()) {
    session.oauthState = null;
    session.oauthStateExpiresAt = 0;
    session.accessToken = null;
    session.refreshToken = null;
    session.expiresAt = 0;
    session.user = null;
    session.channel = null;
    session.ownedVideos.clear();
  }
  uploads.clear();
}

async function providerJson(response, providerName) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError(502, "provider_response_invalid", `${providerName} returned an unreadable response.`);
  }
  return data;
}

function providerMessage(data, fallback) {
  const value = data?.error?.message ?? data?.error_description ?? data?.message;
  return typeof value === "string" ? value.slice(0, 400) : fallback;
}

async function refreshAccessToken(session, config, fetchImpl) {
  if (!session.refreshToken) {
    session.accessToken = null;
    session.user = null;
    session.channel = null;
    session.ownedVideos.clear();
    throw new AppError(401, "reauthorize", "Your YouTube connection expired. Connect your channel again.");
  }

  const credentials = requireGoogleCredentials(config);
  let response;
  try {
    response = await fetchImpl(`${OAUTH_ORIGIN}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(20_000),
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    });
  } catch {
    throw new AppError(502, "google_unavailable", "Google could not be reached. Check your connection and try again.");
  }

  const data = await providerJson(response, "Google");
  if (!response.ok || !data.access_token) {
    session.accessToken = null;
    session.refreshToken = null;
    session.user = null;
    session.channel = null;
    session.ownedVideos.clear();
    throw new AppError(401, "reauthorize", "Your Google authorization is no longer valid. Connect your channel again.");
  }

  session.accessToken = data.access_token;
  session.expiresAt = Date.now() + Number(data.expires_in ?? 3600) * 1000;
}

async function getAccessToken(session, config, fetchImpl) {
  if (!session.accessToken || session.expiresAt < Date.now() + 60_000) {
    await refreshAccessToken(session, config, fetchImpl);
  }
  return session.accessToken;
}

async function youtubeRequest(session, pathname, params, config, fetchImpl, options = {}) {
  const accessToken = await getAccessToken(session, config, fetchImpl);
  const url = new URL(`${API_ORIGIN}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetchImpl(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
        ...(options.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
      body: options.body,
    });
  } catch {
    throw new AppError(502, "youtube_unavailable", "YouTube could not be reached. Check your connection and try again.");
  }

  if (response.status === 401 && session.refreshToken && !options.retried) {
    session.expiresAt = 0;
    await getAccessToken(session, config, fetchImpl);
    return youtubeRequest(session, pathname, params, config, fetchImpl, { ...options, retried: true });
  }

  const data = await providerJson(response, "YouTube");
  if (!response.ok) {
    const code = response.status === 401 ? "reauthorize" : "youtube_request_failed";
    const message = response.status === 401
      ? "YouTube did not accept the connection. Connect your channel again."
      : `YouTube could not complete that request: ${providerMessage(data, "Try again later.")}`;
    throw new AppError(response.status === 401 ? 401 : 502, code, message);
  }
  return { data, headers: response.headers };
}

async function exchangeCode(code, config, fetchImpl) {
  const credentials = requireGoogleCredentials(config);
  let response;
  try {
    response = await fetchImpl(`${OAUTH_ORIGIN}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(20_000),
      body: new URLSearchParams({
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch {
    throw new AppError(502, "google_unavailable", "Google could not be reached. Check your connection and try again.");
  }

  const data = await providerJson(response, "Google");
  if (!response.ok || !data.access_token) {
    throw new AppError(502, "oauth_exchange_failed", `Google sign-in did not finish: ${providerMessage(data, "Try connecting again.")}`);
  }
  return data;
}

async function getUserInfo(accessToken, fetchImpl) {
  let response;
  try {
    response = await fetchImpl("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AppError(502, "google_unavailable", "Google could not be reached. Check your connection and try again.");
  }
  const data = await providerJson(response, "Google");
  if (!response.ok) {
    throw new AppError(502, "google_profile_failed", "Google sign-in finished, but account details could not be loaded.");
  }
  return { email: data.email ?? "", name: data.name ?? "" };
}

async function loadChannel(session, config, fetchImpl) {
  const response = await youtubeRequest(
    session,
    "/channels",
    { part: "snippet,contentDetails", mine: "true", maxResults: 50 },
    config,
    fetchImpl,
  );
  const channel = response.data.items?.[0];
  if (!channel) {
    throw new AppError(404, "channel_missing", "No YouTube channel was found for this Google account.");
  }
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new AppError(502, "uploads_playlist_missing", "YouTube did not return an uploads playlist for this channel.");
  }
  session.channel = {
    id: channel.id,
    title: channel.snippet?.title ?? "YouTube channel",
    thumbnail: channel.snippet?.thumbnails?.default?.url ?? "",
    uploadsPlaylistId,
  };
  return session.channel;
}

async function listVideos(session, config, fetchImpl) {
  const channel = session.channel ?? await loadChannel(session, config, fetchImpl);
  const playlist = await youtubeRequest(
    session,
    "/playlistItems",
    { part: "contentDetails", playlistId: channel.uploadsPlaylistId, maxResults: 12 },
    config,
    fetchImpl,
  );
  const ids = (playlist.data.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id) => typeof id === "string");
  if (!ids.length) {
    session.ownedVideos.clear();
    return [];
  }

  const videos = await youtubeRequest(
    session,
    "/videos",
    { part: "snippet,status", id: ids.join(",") },
    config,
    fetchImpl,
  );
  const byId = new Map((videos.data.items ?? []).map((video) => [video.id, video]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  session.ownedVideos = new Map(ordered.map((video) => [video.id, video.snippet?.categoryId ?? "22"]));
  return ordered.map((video) => ({
    id: video.id,
    title: video.snippet?.title ?? "",
    description: video.snippet?.description ?? "",
    publishedAt: video.snippet?.publishedAt ?? "",
    privacyStatus: video.status?.privacyStatus ?? "private",
    thumbnail: video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url ?? "",
    categoryId: video.snippet?.categoryId ?? "22",
  }));
}

function validateUpload(value) {
  const metadata = validateVideoMetadata(value);
  if (typeof value.contentType !== "string" || !VIDEO_MIME_TYPES.has(value.contentType.toLowerCase())) {
    throw new AppError(415, "unsupported_video_type", "Choose an MP4, MOV, WebM, AVI, MPEG, or other YouTube-supported video file.");
  }
  if (!Number.isSafeInteger(value.size) || value.size < 1 || value.size > MAX_UPLOAD_BYTES) {
    throw new AppError(400, "invalid_file_size", "Choose a video file larger than 0 bytes and no larger than 256 GB.");
  }
  return { ...metadata, contentType: value.contentType.toLowerCase(), size: value.size };
}

async function beginUpload(session, value, config, fetchImpl, uploads) {
  const upload = validateUpload(value);
  const response = await youtubeRequest(
    session,
    "/videos",
    { part: "snippet,status", uploadType: "resumable" },
    config,
    fetchImpl,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title: upload.title,
          description: upload.description,
          categoryId: "22",
        },
        status: { privacyStatus: upload.privacyStatus },
      }),
      headers: {
        "X-Upload-Content-Type": upload.contentType,
        "X-Upload-Content-Length": String(upload.size),
      },
    },
  );
  const location = response.headers.get("location");
  if (!location) {
    throw new AppError(502, "upload_session_missing", "YouTube did not start an upload session. Check your channel and try again.");
  }

  const uploadUrl = new URL(location);
  if (uploadUrl.protocol !== "https:" || !["www.googleapis.com", "youtube.googleapis.com"].includes(uploadUrl.hostname)) {
    throw new AppError(502, "upload_session_invalid", "YouTube returned an invalid upload session.");
  }

  const id = randomToken();
  uploads.set(id, {
    contentType: upload.contentType,
    expiresAt: Date.now() + 60 * 60 * 1000,
    location: uploadUrl.href,
    sessionId: session.id,
    size: upload.size,
    title: upload.title,
  });
  return { id };
}

function copyWritableFields(source, fields) {
  return Object.fromEntries(fields
    .filter((field) => source?.[field] !== undefined)
    .map((field) => [field, source[field]]));
}

async function updateVideo(session, id, value, config, fetchImpl) {
  const metadata = validateVideoMetadata(value);
  if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !session.ownedVideos.has(id)) {
    throw new AppError(404, "video_not_found", "That video is not in this channel's recent uploads. Refresh the list and try again.");
  }

  const existing = await youtubeRequest(
    session,
    "/videos",
    { part: "snippet,status", id },
    config,
    fetchImpl,
  );
  const video = existing.data.items?.[0];
  if (!video || video.id !== id) {
    session.ownedVideos.delete(id);
    throw new AppError(404, "video_not_found", "That video is no longer available on this channel.");
  }

  const snippet = {
    ...copyWritableFields(video.snippet, [
      "categoryId",
      "defaultAudioLanguage",
      "defaultLanguage",
      "tags",
    ]),
    title: metadata.title,
    description: metadata.description,
  };
  const status = {
    ...copyWritableFields(video.status, [
      "embeddable",
      "license",
      "publicStatsViewable",
      "selfDeclaredMadeForKids",
    ]),
    privacyStatus: metadata.privacyStatus,
  };
  const updated = await youtubeRequest(
    session,
    "/videos",
    { part: "snippet,status" },
    config,
    fetchImpl,
    { method: "PUT", body: JSON.stringify({ id, snippet, status }) },
  );
  const result = updated.data.items?.[0];
  if (!result) {
    throw new AppError(502, "video_update_unconfirmed", "YouTube did not confirm the changes. Refresh the video list before trying again.");
  }
  session.ownedVideos.set(id, result.snippet?.categoryId ?? snippet.categoryId ?? "22");
  return {
    id,
    title: result.snippet?.title ?? metadata.title,
    description: result.snippet?.description ?? metadata.description,
    privacyStatus: result.status?.privacyStatus ?? metadata.privacyStatus,
  };
}

function relayVideoUpload(request, response, session, upload, uploads, httpsRequestImpl) {
  if (!upload || upload.sessionId !== session.id || upload.expiresAt < Date.now()) {
    if (upload) uploads.delete(upload.id);
    throw new AppError(404, "upload_session_expired", "That upload session expired. Start a new upload.");
  }
  const contentLength = Number(request.headers["content-length"]);
  if (!Number.isSafeInteger(contentLength) || contentLength !== upload.size) {
    uploads.delete(upload.id);
    throw new AppError(400, "upload_size_mismatch", "The video size changed. Select the file again and start a new upload.");
  }

  uploads.delete(upload.id);
  return new Promise((resolve, reject) => {
    const upstream = httpsRequestImpl(upload.location, {
      method: "PUT",
      headers: {
        "Content-Length": String(upload.size),
        "Content-Range": `bytes 0-${upload.size - 1}/${upload.size}`,
        "Content-Type": upload.contentType,
      },
    }, (upstreamResponse) => {
      const chunks = [];
      let responseBytes = 0;
      upstreamResponse.on("data", (chunk) => {
        responseBytes += chunk.length;
        if (responseBytes <= 64 * 1024) chunks.push(chunk);
      });
      upstreamResponse.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        if (![200, 201].includes(upstreamResponse.statusCode)) {
          reject(new AppError(
            502,
            "upload_unconfirmed",
            "YouTube did not confirm the upload. Check YouTube Studio before trying again to avoid a duplicate.",
          ));
          return;
        }
        if (!data.id) {
          reject(new AppError(
            502,
            "upload_unconfirmed",
            "YouTube returned no video ID. Check YouTube Studio before trying again to avoid a duplicate.",
          ));
          return;
        }

        session.ownedVideos.set(data.id, data.snippet?.categoryId ?? "22");
        sendJson(response, 201, {
          video: {
            id: data.id,
            title: data.snippet?.title ?? upload.title,
            privacyStatus: data.status?.privacyStatus ?? "private",
          },
        });
        resolve();
      });
      upstreamResponse.on("error", () => reject(new AppError(
        502,
        "upload_unconfirmed",
        "YouTube's response was interrupted. Check YouTube Studio before trying again to avoid a duplicate.",
      )));
    });

    upstream.on("error", () => reject(new AppError(
      502,
      "upload_unconfirmed",
      "The upload connection was interrupted. Check YouTube Studio before trying again to avoid a duplicate.",
    )));
    request.on("close", () => {
      if (!request.complete) upstream.destroy(new Error("Browser upload ended before the full file arrived."));
    });
    request.pipe(upstream);
  });
}

export function createUploaderServer({
  env = process.env,
  fetchImpl = globalThis.fetch,
  httpsRequestImpl = httpsRequest,
} = {}) {
  const config = readConfig(env);
  const sessions = new Map();
  const uploads = new Map();

  function getSession(request, response) {
    const id = readCookies(request).get(SESSION_COOKIE);
    let session = id ? sessions.get(id) : undefined;
    if (session) return session;

    session = {
      id: randomToken(),
      csrfToken: randomToken(),
      oauthState: null,
      oauthStateExpiresAt: 0,
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      user: null,
      channel: null,
      ownedVideos: new Map(),
    };
    sessions.set(session.id, session);
    setSessionCookie(response, session.id, config.secureCookie);
    return session;
  }

  function getExistingSession(request) {
    const id = readCookies(request).get(SESSION_COOKIE);
    return id ? sessions.get(id) : undefined;
  }

  async function handleRequest(request, response) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.setHeader(key, value);
    }

    const url = new URL(request.url ?? "/", config.appOrigin);
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      });
      response.end(await readFile(path.join(APP_ROOT, "public/index.html")));
      return;
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/javascript; charset=utf-8",
      });
      response.end(await readFile(path.join(APP_ROOT, "public/app.js")));
      return;
    }
    if (request.method === "GET" && url.pathname === "/styles.css") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/css; charset=utf-8",
      });
      response.end(await readFile(path.join(APP_ROOT, "public/styles.css")));
      return;
    }
    if (request.method === "GET" && url.pathname === "/brand-mark.svg") {
      response.writeHead(200, {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "image/svg+xml",
      });
      response.end(await readFile(BRAND_MARK));
      return;
    }
    if (request.method === "GET" && url.pathname === "/auth/google") {
      const session = getSession(request, response);
      requireGoogleCredentials(config);
      session.oauthState = randomToken();
      session.oauthStateExpiresAt = Date.now() + 10 * 60 * 1000;
      const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorization.searchParams.set("client_id", getGoogleCredentials(config).clientId);
      authorization.searchParams.set("redirect_uri", config.redirectUri);
      authorization.searchParams.set("response_type", "code");
      authorization.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
      authorization.searchParams.set("access_type", "offline");
      authorization.searchParams.set("prompt", "consent");
      authorization.searchParams.set("state", session.oauthState);
      response.writeHead(302, { "Cache-Control": "no-store", Location: authorization.href });
      response.end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/oauth/callback") {
      const session = getExistingSession(request);
      if (!session || !session.oauthState || session.oauthStateExpiresAt < Date.now()
        || !safeEqual(url.searchParams.get("state"), session.oauthState)) {
        sendCallbackError(response, 400, "This sign-in link expired or could not be verified. Return to the app and connect again.");
        return;
      }

      session.oauthState = null;
      session.oauthStateExpiresAt = 0;
      if (url.searchParams.has("error")) {
        sendCallbackError(response, 400, "Google sign-in was cancelled. Return to the app to try again.");
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        sendCallbackError(response, 400, "Google did not return a sign-in code. Return to the app to try again.");
        return;
      }

      try {
        const tokens = await exchangeCode(code, config, fetchImpl);
        const user = await getUserInfo(tokens.access_token, fetchImpl);
        session.accessToken = tokens.access_token;
        session.refreshToken = tokens.refresh_token ?? session.refreshToken;
        session.expiresAt = Date.now() + Number(tokens.expires_in ?? 3600) * 1000;
        session.user = user;
        session.channel = null;
        session.ownedVideos.clear();
        response.writeHead(303, { "Cache-Control": "no-store", Location: "/" });
        response.end();
      } catch (error) {
        if (error instanceof AppError) {
          sendCallbackError(response, error.status, error.message);
          return;
        }
        throw error;
      }
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      const session = getSession(request, response);
      if (request.method === "GET" && url.pathname === "/api/session") {
        sendJson(response, 200, {
          authenticated: Boolean(session.accessToken || session.refreshToken),
          csrfToken: session.csrfToken,
          ...googleConfigurationStatus(config),
          user: session.user,
          channel: session.channel
            ? { id: session.channel.id, title: session.channel.title, thumbnail: session.channel.thumbnail }
            : null,
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/settings/google") {
        requireLoopback(request);
        requireMutation(request, session, config);
        config.runtimeCredentials = validateGoogleCredentials(await readJson(request));
        clearAuthorizedSessions(sessions, uploads);
        sendJson(response, 200, {
          ...googleConfigurationStatus(config),
          csrfToken: session.csrfToken,
        });
        return;
      }
      if (request.method === "DELETE" && url.pathname === "/api/settings/google") {
        requireLoopback(request);
        requireMutation(request, session, config);
        config.runtimeCredentials = null;
        clearAuthorizedSessions(sessions, uploads);
        sendJson(response, 200, {
          ...googleConfigurationStatus(config),
          csrfToken: session.csrfToken,
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/videos") {
        if (!session.accessToken && !session.refreshToken) {
          throw new AppError(401, "not_connected", "Connect a YouTube channel before loading videos.");
        }
        const videos = await listVideos(session, config, fetchImpl);
        sendJson(response, 200, {
          channel: {
            id: session.channel.id,
            title: session.channel.title,
            thumbnail: session.channel.thumbnail,
          },
          videos,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/logout") {
        requireMutation(request, session, config);
        sessions.delete(session.id);
        for (const [id, upload] of uploads) {
          if (upload.sessionId === session.id) uploads.delete(id);
        }
        const cookieParts = [
          `${SESSION_COOKIE}=`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          "Max-Age=0",
        ];
        if (config.secureCookie) cookieParts.push("Secure");
        response.setHeader("Set-Cookie", cookieParts.join("; "));
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/uploads") {
        requireMutation(request, session, config);
        if (!session.accessToken && !session.refreshToken) {
          throw new AppError(401, "not_connected", "Connect a YouTube channel before uploading.");
        }
        const value = await readJson(request);
        sendJson(response, 201, await beginUpload(session, value, config, fetchImpl, uploads));
        return;
      }

      const uploadMatch = url.pathname.match(/^\/api\/uploads\/([A-Za-z0-9_-]+)$/);
      if (request.method === "PUT" && uploadMatch) {
        requireMutation(request, session, config);
        const upload = uploads.get(uploadMatch[1]);
        if (upload) upload.id = uploadMatch[1];
        await relayVideoUpload(request, response, session, upload, uploads, httpsRequestImpl);
        return;
      }

      const videoMatch = url.pathname.match(/^\/api\/videos\/([A-Za-z0-9_-]+)$/);
      if (request.method === "PATCH" && videoMatch) {
        requireMutation(request, session, config);
        const value = await readJson(request);
        sendJson(response, 200, {
          video: await updateVideo(session, videoMatch[1], value, config, fetchImpl),
        });
        return;
      }
    }

    sendJson(response, 404, { error: { code: "not_found", message: "That page was not found." } });
  }

  return createHttpServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      if (error instanceof AppError) {
        sendJson(response, error.status, { error: { code: error.code, message: error.message } });
        return;
      }
      console.error("YouTube uploader request failed:", error);
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: {
            code: "internal_error",
            message: "Something went wrong. Refresh the app and try again.",
          },
        });
      } else {
        response.destroy();
      }
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envFile = path.join(APP_ROOT, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const server = createUploaderServer();
  const config = readConfig(process.env);
  server.listen(config.port, config.host, () => {
    console.log(`ShotCraft YouTube Uploader listening at ${config.appOrigin}`);
  });
}
