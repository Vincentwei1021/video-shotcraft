import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { Readable, Writable } from "node:stream";
import { after, test } from "node:test";
import { createUploaderServer, validateVideoMetadata } from "../server.mjs";

const runningServers = [];

async function freePort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startTestServer(
  fetchImpl = async () => {
    throw new Error("External Google requests are not expected in this test.");
  },
  httpsRequestImpl,
  envCredentials = {},
) {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = createUploaderServer({
    env: {
      APP_ORIGIN: origin,
      GOOGLE_CLIENT_ID: envCredentials.GOOGLE_CLIENT_ID ?? "test-client-id",
      GOOGLE_CLIENT_SECRET: envCredentials.GOOGLE_CLIENT_SECRET ?? "test-client-secret",
      GOOGLE_REDIRECT_URI: `${origin}/oauth/callback`,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
    fetchImpl,
    httpsRequestImpl,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  runningServers.push(server);
  return { origin, server };
}

async function connectAccount(origin) {
  const session = await getSession(origin);
  const authStart = await fetch(`${origin}/auth/google`, {
    headers: { Cookie: session.cookie },
    redirect: "manual",
  });
  const state = new URL(authStart.headers.get("location")).searchParams.get("state");
  const callback = await fetch(`${origin}/oauth/callback?state=${encodeURIComponent(state)}&code=test-code`, {
    headers: { Cookie: session.cookie },
    redirect: "manual",
  });
  assert.equal(callback.status, 303);
  return session;
}

function providerResponse(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

function googleAccountFetch(onYouTubeRequest = () => providerResponse({})) {
  return async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/token") {
      return providerResponse({
        access_token: "server-only-access-token",
        refresh_token: "server-only-refresh-token",
        expires_in: 3600,
      });
    }
    if (url.pathname === "/v1/userinfo") {
      return providerResponse({ email: "creator@example.test", name: "Video Creator" });
    }
    if (url.origin === "https://youtube.googleapis.com") {
      return onYouTubeRequest(url, init);
    }
    throw new Error(`Unexpected external request to ${url.origin}${url.pathname}`);
  };
}

async function getSession(origin) {
  const response = await fetch(`${origin}/api/session`);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    body: await response.json(),
  };
}

after(async () => {
  await Promise.all(runningServers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

test("video metadata validation enforces YouTube title, description, and privacy limits", () => {
  assert.deepEqual(validateVideoMetadata({
    title: "  A finished cut  ",
    description: "",
    privacyStatus: "private",
  }), {
    title: "A finished cut",
    description: "",
    privacyStatus: "private",
  });
  assert.throws(() => validateVideoMetadata({
    title: "x".repeat(101),
    description: "",
    privacyStatus: "private",
  }), /100 characters/);
  assert.throws(() => validateVideoMetadata({
    title: "Video",
    description: "",
    privacyStatus: "scheduled",
  }), /visibility/);
});

test("OAuth start uses an expiring state and only server-side credentials", async () => {
  const { origin } = await startTestServer();
  const session = await getSession(origin);
  const response = await fetch(`${origin}/auth/google`, {
    headers: { Cookie: session.cookie },
    redirect: "manual",
  });
  const authorization = new URL(response.headers.get("location"));

  assert.equal(response.status, 302);
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(authorization.searchParams.get("client_id"), "test-client-id");
  assert.equal(authorization.searchParams.get("redirect_uri"), `${origin}/oauth/callback`);
  assert.ok(authorization.searchParams.get("state").length >= 40);
  assert.match(authorization.searchParams.get("scope"), /youtube\.upload/);
  assert.match(authorization.searchParams.get("scope"), /youtube\.readonly/);
  assert.match(authorization.searchParams.get("scope"), /youtube\.force-ssl/);
  assert.equal(authorization.searchParams.has("client_secret"), false);
});

test("Google credentials can be entered through the local settings API and cleared", async () => {
  const { origin } = await startTestServer(
    async () => {
      throw new Error("No Google request is expected before OAuth callback.");
    },
    undefined,
    { GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
  );
  const session = await getSession(origin);
  const initial = await session.body;
  assert.equal(initial.googleConfigured, false);
  assert.equal(initial.credentialSource, null);
  assert.equal("clientSecret" in initial, false);

  const save = await fetch(`${origin}/api/settings/google`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": initial.csrfToken,
    },
    body: JSON.stringify({
      clientId: "ui-client.apps.googleusercontent.com",
      clientSecret: "private-ui-secret-value",
    }),
  });
  const configured = await save.json();

  assert.equal(save.status, 200);
  assert.equal(configured.googleConfigured, true);
  assert.equal(configured.credentialSource, "runtime");
  assert.equal(configured.hasEnvironmentCredentials, false);
  assert.equal(configured.csrfToken, initial.csrfToken);
  assert.equal(JSON.stringify(configured).includes("private-ui-secret-value"), false);
  assert.equal(JSON.stringify(configured).includes("ui-client.apps.googleusercontent.com"), false);

  const authStart = await fetch(`${origin}/auth/google`, {
    headers: { Cookie: session.cookie },
    redirect: "manual",
  });
  const authorization = new URL(authStart.headers.get("location"));
  assert.equal(authorization.searchParams.get("client_id"), "ui-client.apps.googleusercontent.com");

  const clear = await fetch(`${origin}/api/settings/google`, {
    method: "DELETE",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "X-CSRF-Token": initial.csrfToken,
    },
  });
  const cleared = await clear.json();
  assert.equal(clear.status, 200);
  assert.equal(cleared.googleConfigured, false);
  assert.equal(cleared.credentialSource, null);
});

test("temporary OAuth credentials never override configured environment values after reset", async () => {
  const { origin } = await startTestServer();
  const session = await getSession(origin);
  assert.equal(session.body.credentialSource, "environment");
  assert.equal(session.body.hasEnvironmentCredentials, true);

  await fetch(`${origin}/api/settings/google`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      clientId: "temporary-client.apps.googleusercontent.com",
      clientSecret: "temporary-secret-value",
    }),
  });
  const reset = await fetch(`${origin}/api/settings/google`, {
    method: "DELETE",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "X-CSRF-Token": session.body.csrfToken,
    },
  });
  const configuration = await reset.json();

  assert.equal(reset.status, 200);
  assert.equal(configuration.googleConfigured, true);
  assert.equal(configuration.credentialSource, "environment");
});

test("OAuth settings reject requests without CSRF protection", async () => {
  const { origin } = await startTestServer(undefined, undefined, {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  });
  const session = await getSession(origin);
  const response = await fetch(`${origin}/api/settings/google`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: "ui-client.apps.googleusercontent.com",
      clientSecret: "private-ui-secret-value",
    }),
  });
  const result = await response.json();

  assert.equal(response.status, 403);
  assert.equal(result.error.code, "invalid_csrf");
  assert.equal(result.error.message.includes("private-ui-secret-value"), false);
});

test("OAuth settings reject malformed credentials without echoing them", async () => {
  const { origin } = await startTestServer(undefined, undefined, {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  });
  const session = await getSession(origin);
  const response = await fetch(`${origin}/api/settings/google`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      clientId: "valid-client.apps.googleusercontent.com",
      clientSecret: "short",
    }),
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error.code, "invalid_google_client_secret");
  assert.equal(JSON.stringify(result).includes("short"), false);
  assert.equal((await (await fetch(`${origin}/api/session`, {
    headers: { Cookie: session.cookie },
  })).json()).googleConfigured, false);
});

test("changing OAuth credentials clears previously authorized sessions", async () => {
  const { origin } = await startTestServer(googleAccountFetch());
  const session = await connectAccount(origin);
  const connected = await fetch(`${origin}/api/session`, {
    headers: { Cookie: session.cookie },
  });
  assert.equal((await connected.json()).authenticated, true);

  const updated = await fetch(`${origin}/api/settings/google`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      clientId: "replacement-client.apps.googleusercontent.com",
      clientSecret: "replacement-secret-value",
    }),
  });
  assert.equal(updated.status, 200);

  const disconnected = await fetch(`${origin}/api/session`, {
    headers: { Cookie: session.cookie },
  });
  assert.equal((await disconnected.json()).authenticated, false);
});

test("mutating API rejects a missing CSRF token before contacting YouTube", async () => {
  const { origin } = await startTestServer();
  const session = await getSession(origin);
  const response = await fetch(`${origin}/api/uploads`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "invalid_csrf");
});

test("video listing requires a connected YouTube account", async () => {
  const { origin } = await startTestServer();
  const session = await getSession(origin);
  const response = await fetch(`${origin}/api/videos`, {
    headers: { Cookie: session.cookie },
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "not_connected");
});

test("session cookie is HTTP-only and has no access token in the response", async () => {
  const { origin } = await startTestServer();
  const response = await fetch(`${origin}/api/session`);
  const setCookie = response.headers.get("set-cookie");
  const body = await response.json();

  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.equal(body.authenticated, false);
  assert.equal("accessToken" in body, false);
  assert.equal("refreshToken" in body, false);
  assert.ok(body.csrfToken);
});

test("OAuth callback stores tokens on the server and lists recent channel videos", async () => {
  const fetchImpl = googleAccountFetch((url) => {
    if (url.pathname.endsWith("/channels")) {
      return providerResponse({
        items: [{
          id: "channel-1",
          snippet: { title: "My channel", thumbnails: {} },
          contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
        }],
      });
    }
    if (url.pathname.endsWith("/playlistItems")) {
      return providerResponse({ items: [{ contentDetails: { videoId: "abcdefghijk" } }] });
    }
    if (url.pathname.endsWith("/videos")) {
      return providerResponse({
        items: [{
          id: "abcdefghijk",
          snippet: {
            title: "First video",
            description: "A test description",
            categoryId: "22",
            publishedAt: "2026-01-02T03:04:05Z",
            thumbnails: {},
          },
          status: { privacyStatus: "private" },
        }],
      });
    }
    throw new Error(`Unexpected YouTube request to ${url.pathname}`);
  });
  const { origin } = await startTestServer(fetchImpl);
  const session = await connectAccount(origin);
  const connected = await fetch(`${origin}/api/session`, {
    headers: { Cookie: session.cookie },
  });
  const sessionBody = await connected.json();

  assert.equal(sessionBody.authenticated, true);
  assert.equal(sessionBody.user.email, "creator@example.test");
  assert.equal("accessToken" in sessionBody, false);

  const response = await fetch(`${origin}/api/videos`, {
    headers: { Cookie: session.cookie },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.channel.title, "My channel");
  assert.equal(body.videos.length, 1);
  assert.equal(body.videos[0].title, "First video");
});

test("video updates preserve the channel's existing category, tags, and status options", async () => {
  const calls = [];
  const original = {
    id: "abcdefghijk",
    snippet: {
      title: "Before",
      description: "Old description",
      categoryId: "28",
      tags: ["existing-tag"],
      defaultLanguage: "en",
      publishedAt: "2026-01-02T03:04:05Z",
      thumbnails: {},
    },
    status: {
      privacyStatus: "private",
      license: "creativeCommon",
      embeddable: true,
      publicStatsViewable: false,
    },
  };
  const fetchImpl = googleAccountFetch((url, init) => {
    calls.push({ method: init.method ?? "GET", url, body: init.body });
    if (url.pathname.endsWith("/channels")) {
      return providerResponse({
        items: [{
          id: "channel-1",
          snippet: { title: "My channel", thumbnails: {} },
          contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
        }],
      });
    }
    if (url.pathname.endsWith("/playlistItems")) {
      return providerResponse({ items: [{ contentDetails: { videoId: "abcdefghijk" } }] });
    }
    if (url.pathname.endsWith("/videos") && init.method === "PUT") {
      const update = JSON.parse(init.body);
      assert.equal(update.snippet.categoryId, "28");
      assert.deepEqual(update.snippet.tags, ["existing-tag"]);
      assert.equal(update.status.license, "creativeCommon");
      assert.equal(update.status.publicStatsViewable, false);
      return providerResponse({
        items: [{
          ...original,
          snippet: { ...update.snippet },
          status: { ...update.status },
        }],
      });
    }
    if (url.pathname.endsWith("/videos")) {
      return providerResponse({ items: [original] });
    }
    throw new Error(`Unexpected YouTube request to ${url.pathname}`);
  });
  const { origin } = await startTestServer(fetchImpl);
  const session = await connectAccount(origin);
  await fetch(`${origin}/api/videos`, { headers: { Cookie: session.cookie } });

  const response = await fetch(`${origin}/api/videos/abcdefghijk`, {
    method: "PATCH",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      title: "After",
      description: "Updated description",
      privacyStatus: "unlisted",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.video.title, "After");
  assert.equal(body.video.privacyStatus, "unlisted");
  assert.ok(calls.some((call) => call.method === "PUT"));
});

test("upload initiation keeps the resumable URL and Google token off the client", async () => {
  let inserted;
  const fetchImpl = googleAccountFetch((url, init) => {
    if (url.pathname.endsWith("/videos") && init.method === "POST") {
      inserted = JSON.parse(init.body);
      return new Response("", {
        status: 200,
        headers: { Location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test-session" },
      });
    }
    throw new Error(`Unexpected YouTube request to ${url.pathname}`);
  });
  const { origin } = await startTestServer(fetchImpl);
  const session = await connectAccount(origin);
  const response = await fetch(`${origin}/api/uploads`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      title: "Rendered promo",
      description: "A test upload",
      privacyStatus: "private",
      contentType: "video/mp4",
      size: 1024,
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.ok(body.id);
  assert.equal(JSON.stringify(body).includes("upload_id"), false);
  assert.equal(JSON.stringify(body).includes("server-only-access-token"), false);
  assert.equal(inserted.snippet.categoryId, "22");
  assert.equal(inserted.status.privacyStatus, "private");
  assert.equal(inserted.snippet.title, "Rendered promo");
});

test("video bytes stream once to YouTube and the resumable URL cannot be replayed", async () => {
  const file = Buffer.from("rendered video bytes");
  let forwarded;
  const fetchImpl = googleAccountFetch((url, init) => {
    if (url.pathname.endsWith("/videos") && init.method === "POST") {
      return new Response("", {
        status: 200,
        headers: { Location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test-session" },
      });
    }
    throw new Error(`Unexpected YouTube request to ${url.pathname}`);
  });
  const httpsRequestImpl = (location, options, onResponse) => {
    assert.equal(new URL(location).hostname, "www.googleapis.com");
    forwarded = { headers: options.headers, chunks: [] };
    return new Writable({
      write(chunk, _encoding, callback) {
        forwarded.chunks.push(Buffer.from(chunk));
        callback();
      },
      final(callback) {
        forwarded.body = Buffer.concat(forwarded.chunks);
        callback();
        const upstreamResponse = Readable.from([
          Buffer.from(JSON.stringify({
            id: "zyxwvutsrqp",
            snippet: { title: "Rendered promo", categoryId: "22" },
            status: { privacyStatus: "private" },
          })),
        ]);
        upstreamResponse.statusCode = 201;
        setImmediate(() => onResponse(upstreamResponse));
      },
    });
  };
  const { origin } = await startTestServer(fetchImpl, httpsRequestImpl);
  const session = await connectAccount(origin);
  const initiated = await fetch(`${origin}/api/uploads`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: JSON.stringify({
      title: "Rendered promo",
      description: "",
      privacyStatus: "private",
      contentType: "video/mp4",
      size: file.length,
    }),
  });
  const { id } = await initiated.json();
  const uploaded = await fetch(`${origin}/api/uploads/${id}`, {
    method: "PUT",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "video/mp4",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: file,
  });
  const result = await uploaded.json();

  assert.equal(initiated.status, 201);
  assert.equal(uploaded.status, 201);
  assert.equal(result.video.id, "zyxwvutsrqp");
  assert.deepEqual(forwarded.body, file);
  assert.equal(forwarded.headers["Content-Length"], String(file.length));
  assert.equal(forwarded.headers["Content-Type"], "video/mp4");

  const replay = await fetch(`${origin}/api/uploads/${id}`, {
    method: "PUT",
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "video/mp4",
      "X-CSRF-Token": session.body.csrfToken,
    },
    body: file,
  });
  assert.equal(replay.status, 404);
  assert.equal((await replay.json()).error.code, "upload_session_expired");
});
