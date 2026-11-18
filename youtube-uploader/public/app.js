const accountStatus = document.querySelector("#account-status");
const accountLabel = document.querySelector("#account-label");
const accountEmail = document.querySelector("#account-email");
const channelName = document.querySelector("#channel-name");
const connectPanel = document.querySelector("#connect-panel");
const dashboard = document.querySelector("#dashboard");
const connectButton = document.querySelector("#connect-button");
const oauthMissing = document.querySelector("#oauth-missing");
const oauthSettings = document.querySelector("#oauth-settings");
const oauthSettingsForm = document.querySelector("#oauth-settings-form");
const googleClientId = document.querySelector("#google-client-id");
const googleClientSecret = document.querySelector("#google-client-secret");
const settingsSummary = document.querySelector("#settings-summary");
const settingsState = document.querySelector("#settings-state");
const saveCredentialsButton = document.querySelector("#save-credentials-button");
const clearCredentialsButton = document.querySelector("#clear-credentials-button");
const disconnectButton = document.querySelector("#disconnect-button");
const notice = document.querySelector("#notice");
const videoInput = document.querySelector("#video-file");
const dropzone = document.querySelector("#dropzone");
const fileName = document.querySelector("#file-name");
const fileSize = document.querySelector("#file-size");
const titleInput = document.querySelector("#upload-title");
const titleCount = document.querySelector("#title-count");
const descriptionInput = document.querySelector("#upload-description");
const descriptionCount = document.querySelector("#description-count");
const uploadPrivacy = document.querySelector("#upload-privacy");
const uploadForm = document.querySelector("#upload-form");
const uploadButton = document.querySelector("#upload-button");
const progressPanel = document.querySelector("#upload-progress");
const progressMessage = document.querySelector("#progress-message");
const progressPercent = document.querySelector("#progress-percent");
const progressBar = document.querySelector("#progress-bar");
const videoList = document.querySelector("#video-list");
const emptyVideos = document.querySelector("#empty-videos");
const videoCount = document.querySelector("#video-count");

const state = {
  csrfToken: "",
  connected: false,
  credentialSource: null,
  googleConfigured: false,
  file: null,
  uploading: false,
  videos: [],
};

function showNotice(message, type = "") {
  notice.textContent = message;
  notice.className = `notice ${type}`.trim();
  notice.hidden = !message;
}

async function api(path, options = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-CSRF-Token", state.csrfToken);
  }
  if (options.body && !(options.body instanceof Blob)) {
    headers.set("Content-Type", "application/json");
  }
  let response;
  try {
    response = await fetch(path, {
      ...options,
      method,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new Error("The uploader could not be reached. Check the local server and try again.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The uploader returned an unreadable response. Reload the page and try again.");
  }
  if (!response.ok) {
    const error = new Error(result.error?.message ?? "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function setConnectionStatus(connected, label) {
  state.connected = connected;
  accountStatus.classList.toggle("connected", connected);
  accountStatus.classList.toggle("checking", label === "Checking connection");
  accountLabel.textContent = label;
  if (!connected) {
    accountEmail.textContent = "";
    channelName.textContent = "YouTube channel";
  }
  connectPanel.hidden = connected;
  dashboard.hidden = !connected;
  disconnectButton.hidden = !connected;
}

function updateGoogleSettings(result) {
  state.googleConfigured = result.googleConfigured;
  state.credentialSource = result.credentialSource;
  connectButton.hidden = !state.googleConfigured;
  oauthMissing.hidden = state.googleConfigured;
  oauthSettings.open = !state.googleConfigured;
  settingsSummary.textContent = state.googleConfigured ? "Google OAuth settings" : "Configure Google OAuth";
  settingsState.textContent = !state.googleConfigured
    ? "Not configured"
    : state.credentialSource === "runtime"
      ? "Temporary credentials are held in server memory"
      : "Using server environment credentials";
  clearCredentialsButton.hidden = state.credentialSource !== "runtime";
  oauthSettingsForm.reset();
}

async function saveGoogleSettings(event) {
  event.preventDefault();
  saveCredentialsButton.disabled = true;
  saveCredentialsButton.textContent = "Saving…";
  try {
    const result = await api("/api/settings/google", {
      method: "POST",
      body: JSON.stringify({
        clientId: googleClientId.value,
        clientSecret: googleClientSecret.value,
      }),
    });
    state.csrfToken = result.csrfToken;
    updateGoogleSettings(result);
    setConnectionStatus(false, "Not connected");
    renderVideos([]);
    updateUploadButton();
    showNotice("Google OAuth credentials are ready. Connect your YouTube channel to continue.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    saveCredentialsButton.disabled = false;
    saveCredentialsButton.textContent = "Save credentials in memory";
  }
}

async function clearGoogleSettings() {
  clearCredentialsButton.disabled = true;
  try {
    const result = await api("/api/settings/google", { method: "DELETE" });
    state.csrfToken = result.csrfToken;
    updateGoogleSettings(result);
    setConnectionStatus(false, "Not connected");
    renderVideos([]);
    updateUploadButton();
    showNotice(result.googleConfigured
      ? "Temporary credentials cleared. The server's environment settings are active."
      : "Temporary Google credentials cleared from server memory.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    clearCredentialsButton.disabled = false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const units = ["MB", "GB", "TB"];
  let value = bytes / (1024 * 1024);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function fileMimeType(file) {
  if (file.type.startsWith("video/")) return file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension = {
    "3gp": "video/3gpp",
    avi: "video/x-msvideo",
    flv: "video/x-flv",
    m2ts: "video/mp2t",
    mkv: "video/x-matroska",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    mp4: "video/mp4",
    mpe: "video/mpeg",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    webm: "video/webm",
    wmv: "video/x-ms-wmv",
  };
  return byExtension[extension] ?? "";
}

function selectFile(file) {
  if (!file) return;
  const mimeType = fileMimeType(file);
  if (!mimeType || file.size < 1 || file.size > 256 * 1024 ** 3) {
    state.file = null;
    fileName.textContent = "Choose a video file";
    fileSize.textContent = "";
    updateUploadButton();
    showNotice(file.size < 1
      ? "The selected file is empty. Choose another video."
      : file.size > 256 * 1024 ** 3
        ? "YouTube uploads are limited to 256 GB."
        : "Choose a supported video file, such as MP4, MOV, or WebM.", "error");
    return;
  }
  state.file = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  if (!titleInput.value.trim()) titleInput.value = file.name.replace(/\.[^.]+$/, "");
  updateCounts();
  updateUploadButton();
  showNotice("");
}

function updateCounts() {
  titleCount.textContent = `${[...titleInput.value].length} / 100`;
  descriptionCount.textContent = `${[...descriptionInput.value].length.toLocaleString()} / 5,000`;
}

function updateUploadButton() {
  uploadButton.disabled = state.uploading || !state.file || !titleInput.value.trim() || !state.connected;
}

function privacyLabel(privacy) {
  return privacy === "unlisted" ? "Unlisted" : privacy === "public" ? "Public" : "Private";
}

function createField(labelText, value, options = {}) {
  const label = document.createElement("label");
  label.className = "field";
  const caption = document.createElement("span");
  caption.textContent = labelText;
  label.append(caption);

  let input;
  if (options.select) {
    input = document.createElement("select");
    for (const [valueText, labelText] of [
      ["private", "Private · only you can watch"],
      ["unlisted", "Unlisted · anyone with the link"],
      ["public", "Public · anyone can watch"],
    ]) {
      const option = document.createElement("option");
      option.value = valueText;
      option.textContent = labelText;
      option.selected = valueText === value;
      input.append(option);
    }
  } else if (options.multiline) {
    input = document.createElement("textarea");
    input.rows = 3;
    input.maxLength = 5000;
    input.value = value;
    input.placeholder = "Add context or links for viewers";
  } else {
    input = document.createElement("input");
    input.type = "text";
    input.maxLength = 100;
    input.value = value;
    input.required = true;
  }
  label.append(input);
  return { label, input };
}

function renderVideo(video) {
  const row = document.createElement("article");
  row.className = "video-row";

  const thumbnail = document.createElement("img");
  thumbnail.className = "video-thumb";
  thumbnail.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/mqdefault.jpg`;
  thumbnail.alt = "";
  thumbnail.loading = "lazy";
  thumbnail.onerror = () => {
    thumbnail.removeAttribute("src");
    thumbnail.alt = "Thumbnail unavailable";
  };

  const info = document.createElement("div");
  info.className = "video-info";
  const title = document.createElement("h3");
  title.className = "video-title";
  title.textContent = video.title || "Untitled video";
  const meta = document.createElement("div");
  meta.className = "video-meta";
  const date = document.createElement("span");
  date.textContent = video.publishedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(video.publishedAt))
    : "Date unavailable";
  const privacy = document.createElement("span");
  privacy.className = "privacy-tag";
  privacy.textContent = privacyLabel(video.privacyStatus);
  meta.append(date, privacy);
  info.append(title, meta);

  const details = document.createElement("details");
  details.className = "video-editor";
  const summary = document.createElement("summary");
  summary.textContent = "Edit details";
  const form = document.createElement("form");
  form.className = "edit-fields";
  const titleField = createField("Title", video.title);
  const descriptionField = createField("Description", video.description, { multiline: true });
  const privacyField = createField("Visibility", video.privacyStatus, { select: true });
  const saveButton = document.createElement("button");
  saveButton.className = "button primary";
  saveButton.type = "submit";
  saveButton.textContent = "Save changes";
  form.append(titleField.label, descriptionField.label, privacyField.label, saveButton);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    try {
      await api(`/api/videos/${encodeURIComponent(video.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: titleField.input.value,
          description: descriptionField.input.value,
          privacyStatus: privacyField.input.value,
        }),
      });
      const refreshed = await loadVideos();
      if (refreshed) {
        showNotice("Video details updated.", "success");
      } else {
        showNotice(`Video details were saved, but the list could not be refreshed. ${notice.textContent}`, "error");
      }
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  });
  details.append(summary, form);

  const link = document.createElement("a");
  link.className = "video-link";
  link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Open on YouTube ↗";
  row.append(thumbnail, info, details, link);
  return row;
}

function renderVideos(videos) {
  state.videos = videos;
  videoList.replaceChildren(...videos.map(renderVideo));
  emptyVideos.hidden = videos.length > 0;
  videoCount.textContent = videos.length ? `${videos.length} shown` : "";
}

async function loadVideos() {
  const refreshButton = document.querySelector("#refresh-button");
  refreshButton.disabled = true;
  try {
    const result = await api("/api/videos");
    channelName.textContent = result.channel.title;
    renderVideos(result.videos);
    showNotice("");
    return true;
  } catch (error) {
    if (error.status === 401) {
      setConnectionStatus(false, "Not connected");
      showNotice(error.message, "error");
    } else {
      showNotice(error.message, "error");
    }
    return false;
  } finally {
    refreshButton.disabled = false;
  }
}

function uploadFile(file, uploadId, mimeType) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", `/api/uploads/${encodeURIComponent(uploadId)}`);
    request.setRequestHeader("Content-Type", mimeType);
    request.setRequestHeader("X-CSRF-Token", state.csrfToken);
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.floor((event.loaded / event.total) * 100);
      progressBar.value = percent;
      progressPercent.textContent = `${percent}%`;
      progressMessage.textContent = percent === 100 ? "Confirming with YouTube" : "Uploading video";
    });
    request.addEventListener("load", () => {
      let result = {};
      try {
        result = JSON.parse(request.responseText);
      } catch {
        reject(new Error("YouTube's response could not be read. Check YouTube Studio before trying again to avoid a duplicate."));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        const error = new Error(result.error?.message ?? "Upload failed.");
        error.status = request.status;
        reject(error);
        return;
      }
      resolve(result.video);
    });
    request.addEventListener("error", () => reject(new Error(
      "The upload connection was interrupted. Check YouTube Studio before trying again to avoid a duplicate.",
    )));
    request.addEventListener("abort", () => reject(new Error(
      "The upload was interrupted. Check YouTube Studio before trying again to avoid a duplicate.",
    )));
    request.send(file);
  });
}

async function startUpload(event) {
  event.preventDefault();
  if (!state.file || state.uploading) return;
  const mimeType = fileMimeType(state.file);
  state.uploading = true;
  progressPanel.hidden = false;
  progressMessage.textContent = "Preparing upload";
  progressPercent.textContent = "0%";
  progressBar.value = 0;
  updateUploadButton();

  try {
    const upload = await api("/api/uploads", {
      method: "POST",
      body: JSON.stringify({
        title: titleInput.value,
        description: descriptionInput.value,
        privacyStatus: uploadPrivacy.value,
        contentType: mimeType,
        size: state.file.size,
      }),
    });
    await uploadFile(state.file, upload.id, mimeType);
    showNotice("Video uploaded to YouTube.", "success");
    state.file = null;
    videoInput.value = "";
    fileName.textContent = "Choose a video file";
    fileSize.textContent = "";
    titleInput.value = "";
    descriptionInput.value = "";
    uploadPrivacy.value = "private";
    updateCounts();
    const refreshed = await loadVideos();
    if (refreshed) {
      showNotice("Video uploaded to YouTube.", "success");
    } else {
      showNotice(`Video uploaded, but recent videos could not be refreshed. ${notice.textContent}`, "error");
    }
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    state.uploading = false;
    progressPanel.hidden = true;
    updateUploadButton();
  }
}

async function connectApp() {
  setConnectionStatus(false, "Checking connection");
  try {
    const session = await api("/api/session");
    state.csrfToken = session.csrfToken;
    updateGoogleSettings(session);
    if (!session.authenticated) {
      setConnectionStatus(false, "Not connected");
      return;
    }
    setConnectionStatus(true, "YouTube connected");
    accountEmail.textContent = session.user?.email ?? "";
    if (session.channel?.title) channelName.textContent = session.channel.title;
    updateUploadButton();
    await loadVideos();
  } catch (error) {
    setConnectionStatus(false, "Connection unavailable");
    showNotice(error.message, "error");
  }
}

videoInput.addEventListener("change", () => selectFile(videoInput.files?.[0]));
dropzone.addEventListener("click", () => videoInput.click());
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag-over");
  selectFile(event.dataTransfer?.files?.[0]);
});
titleInput.addEventListener("input", () => {
  updateCounts();
  updateUploadButton();
});
descriptionInput.addEventListener("input", updateCounts);
uploadForm.addEventListener("submit", startUpload);
oauthSettingsForm.addEventListener("submit", saveGoogleSettings);
clearCredentialsButton.addEventListener("click", clearGoogleSettings);
document.querySelector("#refresh-button").addEventListener("click", loadVideos);
disconnectButton.addEventListener("click", async () => {
  disconnectButton.disabled = true;
  try {
    await api("/api/logout", { method: "POST", body: "{}" });
    state.csrfToken = "";
    renderVideos([]);
    setConnectionStatus(false, "Not connected");
    showNotice("YouTube disconnected.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    disconnectButton.disabled = false;
  }
});

updateCounts();
connectApp();
