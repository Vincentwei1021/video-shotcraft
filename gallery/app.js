const translations = window.GALLERY_I18N;
const staticGallery = true;
const libraryEndpoint = staticGallery ? './api/library.json' : '/api/library';
const savedLanguage = (() => {
  try {
    return localStorage.getItem('video-shot-gallery-language');
  } catch {
    return null;
  }
})();
const savedTheme = (() => {
  try {
    const value = localStorage.getItem('video-shot-gallery-theme');
    return ['system', 'light', 'dark'].includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
})();

const initialCategory = (() => {
  try {
    const cat = new URLSearchParams(window.location.search).get('cat');
    // 只认侧栏里真实存在的筛选键；旧链接（如已删除的 ?cat=missing）回退 all
    return cat && document.querySelector(`#filters [data-filter="${CSS.escape(cat)}"]`)
      ? cat : 'all';
  } catch {
    return 'all';
  }
})();

const state = {
  library: null,
  query: '',
  filter: initialCategory,
  revision: '',
  hasLoaded: false,
  language: savedLanguage === 'zh' ? 'zh' : 'en',
  theme: savedTheme,
  selectedStyles: {},
  selectedCards: new Set(),
};

const elements = {
  cardCount: document.querySelector('#cardCount'),
  clearFilters: document.querySelector('#clearFilters'),
  emptyState: document.querySelector('#emptyState'),
  filters: document.querySelector('#filters'),
  languageSwitch: document.querySelector('#languageSwitch'),
  library: document.querySelector('#library'),
  pageTitle: document.querySelector('#pageTitle'),
  previewCount: document.querySelector('#previewCount'),
  searchInput: document.querySelector('#searchInput'),
  styleCount: document.querySelector('#styleCount'),
  syncStatus: document.querySelector('#syncStatus'),
  themeSwitch: document.querySelector('#themeSwitch'),
  toast: document.querySelector('#toast'),
  selectionBar: document.querySelector('#selectionBar'),
  selectionCount: document.querySelector('#selectionCount'),
  copySelected: document.querySelector('#copySelected'),
  clearSelected: document.querySelector('#clearSelected'),
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#039;',
  '"': '&quot;',
}[character]));

const text = (key) => translations.ui[state.language][key] || key;
// 入库 14 天内的卡在卡片和分类导航上挂 NEW 徽标（过期自动消失，无需维护）；
// addedAt 由 sync 脚本在卡首次进 library.json 时写死，之后编辑只动 updatedAt
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const isNewCard = (card) =>
  Boolean(card.addedAt) && Date.now() - Date.parse(card.addedAt) < NEW_WINDOW_MS;
const cardName = (card) => state.language === 'zh'
  ? translations.cardsZh[card.name] || card.name
  : card.name;
const styleName = (style) => state.language === 'zh'
  ? translations.stylesZh[style.key] || style.label
  : style.key;
// 多式卡的描述跟随当前所选式（zh 用 library.json 的 style.description，
// en 用 translations.stylesEn）；单式卡沿用整卡描述
const cardDescription = (card, style) => {
  const multi = card.styles.length > 1;
  if (state.language === 'zh') {
    return (multi && style?.description) || card.summary || card.intention;
  }
  return (multi && translations.stylesEn[style?.key])
    || translations.cardsEn[card.name] || card.name.split('-').join(' ');
};

function implementationStatusLabel(style) {
  if (style.implementationStatus === 'reference-only') return text('referenceOnly');
  if (style.implementationStatus === 'missing-preview') return text('missingPreview');
  return '';
}


function resolveTheme(choice = state.theme) {
  if (choice !== 'system') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const resolved = resolveTheme();
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = state.theme;
  document.documentElement.style.colorScheme = resolved;
  elements.themeSwitch.setAttribute('aria-label', text('themeLabel'));
  elements.themeSwitch.querySelectorAll('[data-theme]').forEach((button) => {
    const active = button.dataset.theme === state.theme;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = text(`theme${button.dataset.theme[0].toUpperCase()}${button.dataset.theme.slice(1)}`);
  });
}

function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.title = text('documentTitle');
  elements.pageTitle.textContent = text('title');
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', text(node.dataset.i18nAriaLabel));
  });
  elements.searchInput.placeholder = text('searchPlaceholder');
  elements.languageSwitch.setAttribute('aria-label', state.language === 'zh' ? '语言' : 'Language');
  elements.languageSwitch.querySelectorAll('[data-language]').forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  applyTheme();
  updateSelectionBar();
  setSyncStatus('ready', state.hasLoaded ? text('synced') : text('scanning'));
}

function mediaMarkup(style, cardIndex) {
  const title = escapeHtml(styleName(style));
  const status = implementationStatusLabel(style);
  if (!style.media) {
    return `
      <div class="preview preview-missing">
        <span class="missing-glyph" aria-hidden="true"></span>
        <p>${escapeHtml(status || text('noSample'))}</p>
        <small>${escapeHtml(status ? text('noSample') : text('noSampleHint'))}</small>
      </div>`;
  }

  if (style.media.type === 'gif') {
    return `
      <figure class="preview">
        <img class="lazy-media" data-src="${escapeHtml(style.media.url)}" alt="${title}" loading="lazy">
      </figure>`;
  }

  return `
    <figure class="preview">
      <video class="lazy-media" data-src="${escapeHtml(style.media.url)}" muted loop playsinline preload="none"
        aria-label="${title}" data-key="${cardIndex}"></video>
      <button class="video-expand" type="button" aria-label="${escapeHtml(text('fullscreen'))} ${title}"
        data-expand-key="${cardIndex}" title="${escapeHtml(text('fullscreen'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4"/></svg>
      </button>
    </figure>`;
}

function styleSelectorMarkup(card, selectedIndex) {
  return `
    <div class="style-selector" role="group" aria-label="${escapeHtml(text('style'))}: ${escapeHtml(card.name)}">
      ${card.styles.map((style, index) => `
        <button type="button" class="style-option${index === selectedIndex ? ' is-active' : ''}"
          data-card-name="${escapeHtml(card.name)}" data-style-index="${index}"
          aria-pressed="${index === selectedIndex}">
          <span>${escapeHtml(styleName(style))}</span>
          ${style.media ? '' : '<i aria-hidden="true"></i>'}
        </button>`).join('')}
    </div>`;
}

function cardMarkup(card, cardIndex) {
  const selectedIndex = Math.min(state.selectedStyles[card.name] || 0, card.styles.length - 1);
  const style = card.styles[selectedIndex];
  const encodedSource = card.source.split('/').map(encodeURIComponent).join('/');
  const sourceUrl = card.sourceUrl || `/source/${encodedSource}`;
  const status = implementationStatusLabel(style);
  const title = cardName(card);
  const subtitle = state.language === 'zh' ? card.name : '';

  const isSelected = state.selectedCards.has(card.name);

  // 单式卡的 style 名等于卡名，重复第三遍没有信息量；多式卡才需要
  // "STYLE 0n + 名称" 这一行来说明当前看的是哪一式
  const multiStyle = card.styles.length > 1;

  return `
    <article class="shot-card${isSelected ? ' is-selected' : ''}" id="${escapeHtml(card.name)}">
      <div class="card-media">
        ${mediaMarkup(style, cardIndex)}
        ${status && style.media ? `<p class="implementation-status implementation-status--${escapeHtml(style.implementationStatus)}">${escapeHtml(status)}</p>` : ''}
        ${multiStyle ? styleSelectorMarkup(card, selectedIndex) : ''}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <div class="card-title">
            <h3>${escapeHtml(title)}${isNewCard(card) ? ' <span class="new-badge">NEW</span>' : ''}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
          </div>
        </div>

        <p class="summary">${escapeHtml(cardDescription(card, style))}</p>

        <div class="card-actions">
          <button type="button" class="select-button${isSelected ? ' is-selected' : ''}" data-select-name="${escapeHtml(card.name)}"
            aria-pressed="${isSelected}" aria-label="${escapeHtml(text('select'))} ${escapeHtml(card.name)}">
            <span class="select-check" aria-hidden="true"></span>${escapeHtml(isSelected ? text('selected') : text('select'))}
          </button>
          <button type="button" class="copy-button" data-copy-name="${escapeHtml(card.name)}" aria-label="${escapeHtml(text('copy'))} ${escapeHtml(card.name)}">${escapeHtml(text('copy'))}</button>
          <a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(text('source'))}</a>
        </div>
      </div>
    </article>`;
}

function cardMatches(card) {
  const searchable = [
    card.name,
    translations.cardsZh[card.name],
    translations.cardsEn[card.name],
    card.summary,
    card.use,
    card.duration,
    card.energy,
    card.intention,
    ...card.styles.flatMap((style) => [
      style.key,
      style.label,
      translations.stylesZh[style.key],
      translations.stylesEn[style.key],
      style.description,
      style.use,
    ]),
  ].join(' ').toLowerCase();

  if (state.query && !searchable.includes(state.query.toLowerCase())) return false;
  // tags = 主类别（目录）+ frontmatter 标签，一张卡可命中多个筛选类
  if (state.filter !== 'all' && !(card.tags || [card.category]).includes(state.filter)) return false;
  return true;
}

// 整个网格是 innerHTML 重建的，重建后 activeElement 会掉回 body。
// 记下焦点元素的"身份"（卡名 + 角色），重建后按同一身份找回来，
// 否则键盘用户每点一次就被扔回文档顶部。
function captureFocus() {
  const el = document.activeElement;
  if (!el || !elements.library.contains(el)) return null;
  const card = el.closest('.shot-card');
  if (!card) return null;
  const role = el.dataset.selectName ? 'select'
    : el.dataset.copyName ? 'copy'
    : el.dataset.styleIndex !== undefined ? `style-${el.dataset.styleIndex}`
    : el.classList.contains('source-link') ? 'source'
    : null;
  return role ? {card: card.id, role} : null;
}

function restoreFocus(mark) {
  if (!mark) return;
  const card = document.getElementById(mark.card);
  if (!card) return;
  const selector = mark.role === 'select' ? '[data-select-name]'
    : mark.role === 'copy' ? '[data-copy-name]'
    : mark.role === 'source' ? '.source-link'
    : `[data-style-index="${mark.role.slice(6)}"]`;
  card.querySelector(selector)?.focus({preventScroll: true});
}

function render() {
  if (!state.library) return;
  const focusMark = captureFocus();
  const cards = state.library.cards.filter(cardMatches);
  // 跨类标签之后按主类别分组名不副实：All 视图就是一整片按字母序的平铺
  elements.library.innerHTML = cards.map((card, index) => cardMarkup(card, index)).join('');
  elements.library.setAttribute('aria-busy', 'false');
  elements.emptyState.hidden = cards.length > 0;
  restoreFocus(focusMark);
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
        if (media.tagName === 'VIDEO' && !reduceMotion && entry.intersectionRatio > 0.55) {
          media.play().catch(() => {});
        }
      } else if (media.tagName === 'VIDEO') {
        media.pause();
      }
    });
  }, {rootMargin: '320px 0px', threshold: [0, 0.55]});

  document.querySelectorAll('.lazy-media').forEach((media) => mediaObserver.observe(media));
}

function setSyncStatus(mode, label) {
  elements.syncStatus.dataset.state = mode;
  elements.syncStatus.lastElementChild.textContent = label;
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  // 选择条占着底部中央；有它在场时 toast 上移，别盖住刚点的按钮
  elements.toast.classList.toggle('has-selection-bar', !elements.selectionBar.hidden);
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

async function loadLibrary({silent = false} = {}) {
  if (!silent) setSyncStatus('loading', text('scanning'));
  try {
    const response = await fetch(libraryEndpoint, {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const library = await response.json();
    const changed = state.hasLoaded && library.revision !== state.revision;
    state.library = library;
    state.revision = library.revision;
    state.hasLoaded = true;

    elements.cardCount.textContent = library.stats.cardCount;
    elements.styleCount.textContent = library.stats.styleCount;
    elements.previewCount.textContent = library.stats.previewCount;
    renderCategoryCounts();
    setSyncStatus('ready', text('synced'));
    if (changed) {
      render();
      showToast(text('updated'));
    } else if (!silent) {
      render();
    }
  } catch (error) {
    console.error(error);
    setSyncStatus('error', text('failed'));
    if (!state.hasLoaded) {
      elements.library.innerHTML = `
        <div class="load-error">
          <p>${escapeHtml(text('loadFailed'))}</p>
          <button type="button" id="retryLoad">${escapeHtml(text('retry'))}</button>
        </div>`;
      document.querySelector('#retryLoad')?.addEventListener('click', () => loadLibrary());
    }
  }
}

function renderCategoryCounts() {
  if (!state.library) return;
  const counts = {all: state.library.cards.length};
  const hasNew = {all: state.library.cards.some(isNewCard)};
  state.library.cards.forEach((card) => {
    (card.tags || [card.category]).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      if (isNewCard(card)) hasNew[tag] = true;
    });
  });
  elements.filters.querySelectorAll('[data-filter]').forEach((button) => {
    const key = button.dataset.filter;
    let badge = button.querySelector('.count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'count';
      button.append(badge);
    }
    badge.textContent = counts[key] ?? 0;
    // NEW 徽标插在文字与计数之间（“all” 恒有新卡时也提示，与卡片徽标同窗口）
    let newBadge = button.querySelector('.new-badge');
    if (hasNew[key] && !newBadge) {
      newBadge = document.createElement('span');
      newBadge.className = 'new-badge';
      newBadge.textContent = 'NEW';
      button.insertBefore(newBadge, badge);
    } else if (!hasNew[key] && newBadge) {
      newBadge.remove();
    }
  });
}

// 104 张卡全量重建，每个按键都重排一次太贵；120ms 防抖
let searchTimer;
elements.searchInput.addEventListener('input', (event) => {
  const value = event.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = value;
    render();
  }, 120);
});

elements.filters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  state.filter = button.dataset.filter;
  elements.filters.querySelectorAll('[data-filter]').forEach((item) => {
    item.classList.toggle('is-active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  render();
});

elements.languageSwitch.addEventListener('click', (event) => {
  const button = event.target.closest('[data-language]');
  if (!button || button.dataset.language === state.language) return;
  state.language = button.dataset.language;
  try {
    localStorage.setItem('video-shot-gallery-language', state.language);
  } catch {}
  applyLanguage();
  render();
});

elements.themeSwitch.addEventListener('click', (event) => {
  const button = event.target.closest('[data-theme]');
  if (!button || button.dataset.theme === state.theme) return;
  state.theme = button.dataset.theme;
  try {
    localStorage.setItem('video-shot-gallery-theme', state.theme);
  } catch {}
  applyTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'system') applyTheme();
});

function cardCopyValue(cardName) {
  const card = state.library?.cards.find((item) => item.name === cardName);
  const selectedIndex = Math.min(state.selectedStyles[cardName] || 0, (card?.styles.length || 1) - 1);
  const styleKey = card && card.styles.length > 1 ? card.styles[selectedIndex]?.key : '';
  return styleKey && styleKey !== cardName ? `${cardName} · ${styleKey}` : cardName;
}

async function copyText(value, toastLabel = value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`${text('copied')}${toastLabel}`);
  } catch {
    try {
      const helper = document.createElement('textarea');
      helper.value = value;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      showToast(`${text('copied')}${toastLabel}`);
    } catch {
      showToast(text('copyFailed'));
    }
  }
}

const copyCardName = (cardName) => copyText(cardCopyValue(cardName));

function updateSelectionBar() {
  const count = state.selectedCards.size;
  elements.selectionBar.hidden = count === 0;
  elements.toast.classList.toggle('has-selection-bar', count > 0);
  elements.selectionCount.textContent = text('selectedCount').replace('{n}', count);
  elements.copySelected.textContent = text('copySelected');
  elements.clearSelected.textContent = text('clearSelected');
}

function toggleCardSelection(cardName) {
  if (state.selectedCards.has(cardName)) {
    state.selectedCards.delete(cardName);
  } else {
    state.selectedCards.add(cardName);
  }
  updateSelectionBar();
  render();
}

function copySelectedCards() {
  if (!state.selectedCards.size) return;
  // 按当前库顺序输出，保持稳定；含多式卡的当前所选式
  const ordered = (state.library?.cards || [])
    .filter((card) => state.selectedCards.has(card.name))
    .map((card) => cardCopyValue(card.name));
  const value = ordered.join('，');
  copyText(value, text('selectedCount').replace('{n}', ordered.length));
}

// 全屏放大单支样片。优先原生 Fullscreen API（能真全屏、Esc 原生退出）；
// iOS Safari 不支持元素全屏，退化成 webkitEnterFullscreen（视频原生播放器）。
function openFullscreen(key) {
  const video = document.querySelector(`video[data-key="${key}"]`);
  if (!video) return;
  if (!video.src && video.dataset.src) video.src = video.dataset.src;
  const stage = video.closest('.preview');

  if (stage?.requestFullscreen) {
    // native controls only while fullscreen: the card itself has no pause
    // button, so this is the one place a viewer needs scrub/pause
    stage.requestFullscreen().then(() => {
      video.controls = true;
      video.play().catch(() => {});
    }).catch(() => {});
    return;
  }
  if (video.webkitEnterFullscreen) {
    // iOS: 原生播放器需要非 muted 之外的手势上下文，直接进即可
    video.play().catch(() => {});
    video.webkitEnterFullscreen();
    return;
  }
  // 兜底：没有任何全屏能力时，至少把这支放到视口中央播放
  stage?.scrollIntoView({block: 'center'});
  video.play().catch(() => {});
}

// 全屏态下 object-fit: cover 会裁掉画面；标记出来让 CSS 改成 contain
document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll('.preview.is-fullscreen').forEach((el) => {
    el.classList.remove('is-fullscreen');
    const video = el.querySelector('video');
    if (video) video.controls = false;
  });
  document.fullscreenElement?.classList.add('is-fullscreen');
});

elements.library.addEventListener('click', (event) => {
  const selectButton = event.target.closest('[data-select-name]');
  if (selectButton) {
    toggleCardSelection(selectButton.dataset.selectName);
    return;
  }

  const copyButton = event.target.closest('[data-copy-name]');
  if (copyButton) {
    copyCardName(copyButton.dataset.copyName);
    return;
  }

  const styleButton = event.target.closest('[data-style-index]');
  if (styleButton) {
    state.selectedStyles[styleButton.dataset.cardName] = Number(styleButton.dataset.styleIndex);
    render();
    return;
  }

  const expand = event.target.closest('[data-expand-key]');
  if (expand) {
    openFullscreen(expand.dataset.expandKey);
    return;
  }

});

elements.copySelected.addEventListener('click', copySelectedCards);
elements.clearSelected.addEventListener('click', () => {
  state.selectedCards.clear();
  updateSelectionBar();
  render();
});

elements.clearFilters.addEventListener('click', () => {
  clearTimeout(searchTimer);
  state.query = '';
  state.filter = 'all';
  elements.searchInput.value = '';
  elements.filters.querySelectorAll('[data-filter]').forEach((item) => {
    const active = item.dataset.filter === 'all';
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  render();
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
  }
  if (event.key === 'Escape' && document.activeElement === elements.searchInput) {
    clearTimeout(searchTimer);
    elements.searchInput.value = '';
    state.query = '';
    render();
    elements.searchInput.blur();
  }
});

function showLoadingCards() {
  const template = document.querySelector('#loadingTemplate');
  elements.library.innerHTML = '';
  for (let index = 0; index < 8; index += 1) {
    elements.library.append(template.content.cloneNode(true));
  }
}

if (state.filter !== 'all') {
  elements.filters.querySelectorAll('[data-filter]').forEach((item) => {
    const active = item.dataset.filter === state.filter;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}
applyLanguage();
showLoadingCards();
loadLibrary();
if (!staticGallery) setInterval(() => loadLibrary({silent: true}), 8000);
