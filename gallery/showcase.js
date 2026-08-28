// Showcase 页：渲染社区投稿（./api/showcase.json，由 showcase-publish.yml
// 维护在 showcase-media release 上，部署时装配进站点）。自带 L10N，
// 不依赖 translations.js / app.js（那两者与镜头库 DOM 强耦合）。
const SHOWCASE_L10N = {
  en: {
    documentTitle: 'Showcase — videos made with video-shotcraft',
    skip: 'Skip to showcase',
    brandHome: 'video-shotcraft home',
    navLibrary: 'Shot library',
    title: 'Community Showcase',
    intro: 'Product videos the community made with video-shotcraft. Every card links back to its author — submit yours and leave your handles so viewers can find you.',
    submitCta: 'Submit your video',
    empty: 'No submissions yet — be the first one featured here.',
    loadFailed: 'Could not load the showcase list.',
    retry: 'Retry',
    cardsUsed: 'Shot cards',
    by: 'by',
    fullscreen: 'Fullscreen',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeToDark: 'Switch to dark mode',
    themeToLight: 'Switch to light mode',
    languageToggle: 'Switch to Chinese',
  },
  zh: {
    documentTitle: '社区作品展示 | video-shotcraft',
    skip: '跳到作品列表',
    brandHome: '回到主页',
    navLibrary: '镜头库',
    title: '社区作品展示',
    intro: '社区用 video-shotcraft 做出的产品视频。每张卡片都带作者的社交账号——投稿你的成片，让观众找到你。',
    submitCta: '投稿我的作品',
    empty: '还没有投稿——来做第一个被展示的作品吧。',
    loadFailed: '作品列表加载失败。',
    retry: '重试',
    cardsUsed: '用到的镜头卡',
    by: '作者',
    fullscreen: '全屏播放',
    themeDark: '深色',
    themeLight: '浅色',
    themeToDark: '切换到深色模式',
    themeToLight: '切换到浅色模式',
    languageToggle: '切换到英文',
  },
};

const state = {
  items: null,
  language: (() => {
    try { return localStorage.getItem('video-shot-gallery-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
  })(),
  theme: (() => {
    try {
      const value = localStorage.getItem('video-shot-gallery-theme');
      return ['system', 'light', 'dark'].includes(value) ? value : 'system';
    } catch { return 'system'; }
  })(),
};

const elements = {
  grid: document.querySelector('#showcase'),
  emptyState: document.querySelector('#emptyState'),
  languageToggle: document.querySelector('#languageToggle'),
  languageToggleLabel: document.querySelector('#languageToggleLabel'),
  themeToggle: document.querySelector('#themeToggle'),
  themeToggleLabel: document.querySelector('#themeToggleLabel'),
};

const text = (key) => SHOWCASE_L10N[state.language][key] || SHOWCASE_L10N.en[key] || key;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#039;',
  '"': '&quot;',
}[character]));

function resolveTheme(choice = state.theme) {
  if (choice !== 'system') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const resolved = resolveTheme();
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = state.theme;
  document.documentElement.style.colorScheme = resolved;
  // 单键切换，标签写"点了会变成什么"；没点过的用户仍跟随系统（state.theme = system）
  const next = resolved === 'dark' ? 'light' : 'dark';
  elements.themeToggle.dataset.next = next;
  elements.themeToggle.setAttribute('aria-label', text(next === 'dark' ? 'themeToDark' : 'themeToLight'));
  elements.themeToggleLabel.textContent = text(next === 'dark' ? 'themeDark' : 'themeLight');
}

function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.title = text('documentTitle');
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', text(node.dataset.i18nAriaLabel));
  });
  elements.languageToggleLabel.textContent = state.language === 'zh' ? 'EN' : '中文';
  elements.languageToggle.setAttribute('aria-label', text('languageToggle'));
  applyTheme();
}

// 平台图标沿用 library 侧栏 social-badge 的 SVG path
const PLATFORM_ICONS = {
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>',
  douyin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  xiaohongshu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"/></svg>',
};

// x/github 的裸 handle 能可靠拼出主页 URL；小红书号/抖音号拼不出，
// 只有用户填的是链接才可点，否则渲染成纯文本徽章
function platformHref(platform, value) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (platform === 'x') return `https://x.com/${v.replace(/^@/, '')}`;
  if (platform === 'github') return `https://github.com/${v.replace(/^@/, '')}`;
  return '';
}

function platformLabel(platform, value) {
  const v = value.trim();
  if (platform === 'github') return `@${v.replace(/^@/, '')}`;
  if (platform === 'x') {
    if (/^https?:\/\//i.test(v)) {
      const handle = v.replace(/\/+$/, '').split('/').pop().split('?')[0];
      return handle ? `@${handle.replace(/^@/, '')}` : 'X';
    }
    return `@${v.replace(/^@/, '')}`;
  }
  const names = {xiaohongshu: '小红书', douyin: '抖音'};
  return /^https?:\/\//i.test(v) ? names[platform] : `${names[platform]} ${v}`;
}

function authorChip(platform, value) {
  if (!value || !value.trim()) return '';
  const href = platformHref(platform, value);
  const icon = PLATFORM_ICONS[platform] || '';
  const label = escapeHtml(platformLabel(platform, value));
  const inner = `${icon}<span>${label}</span>`;
  if (!href) return `<span class="author-chip" data-platform="${platform}">${inner}</span>`;
  return `<a class="author-chip" data-platform="${platform}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

function itemMarkup(item, index) {
  const author = item.author || {};
  const chips = [
    authorChip('github', author.github),
    authorChip('x', author.x),
    authorChip('xiaohongshu', author.xiaohongshu),
    authorChip('douyin', author.douyin),
  ].filter(Boolean).join('');
  const posterAttr = item.poster ? ` poster="${escapeHtml(item.poster)}"` : '';
  return `
    <article class="shot-card showcase-card">
      <div class="card-media">
        <figure class="preview">
          <video class="lazy-media" data-src="${escapeHtml(item.video)}"${posterAttr} muted loop playsinline preload="none"
            aria-label="${escapeHtml(item.title)}" data-key="${index}"></video>
          <button class="video-expand" type="button" aria-label="${escapeHtml(text('fullscreen'))} ${escapeHtml(item.title)}"
            data-expand-key="${index}" title="${escapeHtml(text('fullscreen'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4"/></svg>
          </button>
        </figure>
      </div>
      <div class="card-body">
        <div class="card-title">
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <p class="summary">${escapeHtml(item.description)}</p>
        ${item.cards ? `<p class="showcase-cards-used"><span>${escapeHtml(text('cardsUsed'))}</span> ${escapeHtml(item.cards)}</p>` : ''}
        ${chips ? `<div class="showcase-author" aria-label="${escapeHtml(text('by'))}">${chips}</div>` : ''}
      </div>
    </article>`;
}

function render() {
  if (!state.items) return;
  elements.grid.innerHTML = state.items.map(itemMarkup).join('');
  elements.grid.setAttribute('aria-busy', 'false');
  elements.emptyState.hidden = state.items.length > 0;
  observeMedia();
}

let mediaObserver;
function observeMedia() {
  mediaObserver?.disconnect();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const media = entry.target;
      if (entry.isIntersecting) {
        if (!media.src && media.dataset.src) media.src = media.dataset.src;
        if (!reduceMotion && entry.intersectionRatio > 0.55) media.play().catch(() => {});
      } else {
        media.pause();
      }
    });
  }, {rootMargin: '320px 0px', threshold: [0, 0.55]});
  document.querySelectorAll('.lazy-media').forEach((media) => mediaObserver.observe(media));
}

// 全屏逻辑与 app.js 同款：原生 Fullscreen API 优先，iOS 退化到原生播放器
function openFullscreen(key) {
  const video = document.querySelector(`video[data-key="${key}"]`);
  if (!video) return;
  if (!video.src && video.dataset.src) video.src = video.dataset.src;
  const stage = video.closest('.preview');
  if (stage?.requestFullscreen) {
    stage.requestFullscreen().then(() => {
      video.controls = true;
      video.play().catch(() => {});
    }).catch(() => {});
    return;
  }
  if (video.webkitEnterFullscreen) {
    video.play().catch(() => {});
    video.webkitEnterFullscreen();
    return;
  }
  stage?.scrollIntoView({block: 'center'});
  video.play().catch(() => {});
}

document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll('.preview.is-fullscreen').forEach((el) => {
    el.classList.remove('is-fullscreen');
    const video = el.querySelector('video');
    if (video) video.controls = false;
  });
  document.fullscreenElement?.classList.add('is-fullscreen');
});

elements.grid.addEventListener('click', (event) => {
  const expand = event.target.closest('[data-expand-key]');
  if (expand) openFullscreen(expand.dataset.expandKey);
});

elements.languageToggle.addEventListener('click', () => {
  state.language = state.language === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('video-shot-gallery-language', state.language); } catch {}
  applyLanguage();
  render();
});

elements.themeToggle.addEventListener('click', () => {
  state.theme = elements.themeToggle.dataset.next === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem('video-shot-gallery-theme', state.theme); } catch {}
  applyTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'system') applyTheme();
});

async function loadShowcase() {
  try {
    const response = await fetch('./api/showcase.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    state.items = Array.isArray(manifest.items) ? manifest.items : [];
    render();
  } catch (error) {
    console.error(error);
    elements.grid.setAttribute('aria-busy', 'false');
    elements.grid.innerHTML = `
      <div class="load-error">
        <p>${escapeHtml(text('loadFailed'))}</p>
        <button type="button" id="retryLoad">${escapeHtml(text('retry'))}</button>
      </div>`;
    document.querySelector('#retryLoad')?.addEventListener('click', () => loadShowcase());
  }
}

applyLanguage();
loadShowcase();
