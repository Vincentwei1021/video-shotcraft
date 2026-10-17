<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-mark-reverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-mark.svg">
  <img alt="Логотип video-shotcraft" src="./assets/brand/logo-mark.svg" width="96" height="96">
</picture>

# video-shotcraft

[English](README.md) | [中文](README_CN.md) | [日本語](README_JA.md) | **Русский**

[![Галерея](https://img.shields.io/badge/Gallery-live%20previews-d3923c)](https://vincentwei1021.github.io/video-shotcraft/)
[![Витрина](https://img.shields.io/badge/Showcase-community%20videos-7c3aed)](https://vincentwei1021.github.io/video-shotcraft/showcase.html)

[![Звёзды GitHub](https://img.shields.io/github/stars/Vincentwei1021/video-shotcraft)](https://github.com/Vincentwei1021/video-shotcraft/stargazers)
[![Лицензия](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-d97757)](SKILL.md)
[![Codex](https://img.shields.io/badge/Codex-skill-10a37f)](SKILL.md)
[![Звезда AtomGit](https://atomgit.com/VincentWei/video-shotcraft/star/badge.svg)](https://atomgit.com/VincentWei/video-shotcraft)

<a href="https://trendshift.io/repositories/88911?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/88911" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>

<img src="./assets/readme/cover.webp" width="100%" alt="Шесть планов из галереи, слева направо, сверху вниз: graze-face-tour, logo-shrink-wordmark-lockup, panel-grid-moves, product-card-progressive-assemble, space-camera-moves · exploded-view, spotlight-hero-card">

[**▶ Все 150 планов в галерее**](https://vincentwei1021.github.io/video-shotcraft/) · [**🎬 Смотреть витрину работ**](https://vincentwei1021.github.io/video-shotcraft/showcase.html)

</div>

## Что это умеет

Скажите Claude Code или Codex: «Сделай проморолик для моего продукта». Агент снимет ваши реальные страницы, подберёт планы
из библиотеки отточенных анимационных приёмов, составит раскадровку, создаст анимацию в
[Remotion](https://www.remotion.dev/), смонтирует под музыку, добавит звуковое оформление, проверит каждый кадр и передаст
готовый MP4, который можно редактировать дальше.

Это не генератор видео. Каждый кадр отрисовывается кодом на основе ваших скриншотов и текстов, поэтому результат —
чёткий, в стиле вашего бренда и полностью редактируемый.

**Как это работает**

![Восьмисекундный цикл работы: продукт → съёмка реальных страниц → раскадровка с карточками планов → анимация в Remotion → синхронизация с музыкой и звуковое оформление → рендер и покадровая проверка → MP4, Motion Workbench и черновик JianYing](assets/readme/workflow.gif)

## Что нового

> [!IMPORTANT]
> ### 🎬 2026-10 · Обновление библиотеки планов
> Все 216 демо доработаны и проверены. Лучшие версии теперь составляют
> **124 карточки / 150 планов** — с обновлёнными превью в галерее и фирменным оформлением video-shotcraft.

- **2026-09 · [Motion Workbench](#motion-workbench).** Продолжайте монтаж готового ролика в браузерном редакторе в духе CapCut.
- **2026-08 · [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft)** — родственный проект для видео с закадровым голосом:
  на входе сценарий и озвучка, каждое движение синхронизировано с речью
  ([78 примеров с озвучкой](https://vincentwei1021.github.io/video-talkcraft/)).
- **2026-08 · Экспорт в JianYing (CapCut CN).** Готовый ролик превращается в редактируемый черновик JianYing: отдельные клипы для каждого плана,
  нативные дорожки субтитров, отдельные дорожки эффектов и музыки. Проверено в JianYing Pro 11.2 для macOS
  ([руководство](references/jianying-export.md)).

## ❤️ Спонсоры

<table>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://go.apimart.ai/tw-video-shotcraft"><img src="./assets/readme/sponsors/apimart.png" width="200" alt="Логотип APIMart"></a><br>
  <a href="https://go.apimart.ai/tw-video-shotcraft"><b>APIMart</b></a>
</td>
<td>
  <p>Спасибо APIMart за поддержку проекта! APIMart — доступная API-платформа для генерации изображений и видео с ИИ: GPT-Image-2 от $0.006 за изображение, 160+ изображений за доллар. Один асинхронный API для изображений и видео: отправьте задачу, получите ID и заберите результат опросом или через обратный вызов. Генерируйте десятки тысяч изображений пакетами без тайм-аутов, меняйте модели без изменения кода. Оплата по использованию, без абонентской платы — <a href="https://go.apimart.ai/tw-video-shotcraft">зарегистрируйтесь здесь</a>, чтобы начать.</p>
</td>
</tr>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://www.packyapi.ai/register?aff=l9IZ"><img src="./assets/readme/sponsors/packycode.png" width="200" alt="Логотип PackyCode"></a><br>
  <a href="https://www.packyapi.ai/register?aff=l9IZ"><b>PackyCode</b></a>
</td>
<td>
  <p>Получите доступ к ведущим ИИ-моделям через PackyCode с единой точкой доступа API и одним API-ключом. Быстрый и надёжный доступ с автоматическим переключением при сбоях и выделенными высокоскоростными маршрутами для Codex и Claude Code.</p>
  <p>Начните с $1 бесплатных средств, скидки на первое пополнение и экономии до 80% на доступных по акции маршрутах. Платите в RMB без наценок за конвертацию валюты и дополнительных комиссий за пополнение.</p>
  <p><a href="https://www.packyapi.ai/register?aff=l9IZ">Начать работу с PackyCode →</a></p>
</td>
</tr>
<tr>
<td align="center" valign="middle" width="25%">
  <a href="https://aws.amazon.com/"><img src="./assets/readme/sponsors/aws.svg" width="200" alt="Логотип AWS"></a><br>
  <a href="https://aws.amazon.com/"><b>AWS</b></a>
</td>
<td>
  <p>Amazon Web Services (AWS) предлагает надёжные и масштабируемые облачные сервисы, включая вычисления, хранение данных и ИИ.</p>
  <p><a href="https://aws.amazon.com/">Узнать об AWS →</a></p>
</td>
</tr>
</table>

## Установка

Разработано и настроено для Claude Code и Codex. Самый простой способ — передать агенту ссылку:

```text
Install this skill for me: https://github.com/Vincentwei1021/video-shotcraft
```

Или через CLI [skills](https://skills.sh/):

```bash
npx skills add Vincentwei1021/video-shotcraft
```

Или вручную:

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
cd video-shotcraft
ln -s "$(pwd)" ~/.claude/skills/video-shotcraft   # Claude Code
ln -s "$(pwd)" ~/.codex/skills/video-shotcraft    # Codex
```

В материковом Китае, если GitHub работает медленно, клонируйте зеркало AtomGit:
`git clone https://atomgit.com/VincentWei/video-shotcraft.git`.

## Использование

Просто опишите ролик. Специальная команда не нужна.

| Что сказать | Что произойдёт |
|---|---|
| `Use video-shotcraft to make a promo for my product.` | Агент представит шаблон Ink Press и спросит, использовать ли его, затем снимет ваши страницы и соберёт ролик |
| `Make a launch film for this repo with the Ink Press template.` | Самый быстрый путь: ваши скриншоты, тексты и логотип в проверенном шаблоне |
| `Use the deck-deal-flyin and row-embed shot cards to present this feature.` | Вы выбираете планы по имени (копируйте имена прямо из галереи) |
| `Design a product close-up inspired by spotlight-hero-card.` | Один план, адаптированный под ваш продукт |

## Библиотека планов

124 карточки с анимационными приёмами в 10 категориях, всего 150 планов. Ищите, фильтруйте и копируйте имена карточек
в [галерее](https://vincentwei1021.github.io/video-shotcraft/).

<table>
<tr>
<td align="center" width="50%"><b>Заставка и бренд</b> · 11 планов<br><img src="./assets/readme/examples/opening.webp" width="100%" alt="text-as-mask: панель управления видна сквозь огромные буквы"><br><sub>text-as-mask: продукт виден сквозь заголовок</sub></td>
<td align="center" width="50%"><b>Камера</b> · 13 планов<br><img src="./assets/readme/examples/camera.webp" width="100%" alt="exploded-view: страница наклоняется в 3D, и её части разлетаются"><br><sub>exploded-view: страница наклоняется и разбирается на части</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>Переходы</b> · 19 планов<br><img src="./assets/readme/examples/transition.webp" width="100%" alt="card-flock-tumble: карточки кувыркаются и складываются в огромное слово"><br><sub>card-flock-tumble: стая карточек превращается в заголовок</sub></td>
<td align="center" width="50%"><b>Типографика</b> · 25 планов<br><img src="./assets/readme/examples/typography.webp" width="100%" alt="flying-words: слова о функциях пролетают через туннель"><br><sub>flying-words: туннель слов складывается в слоган</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>Появление интерфейса</b> · 22 плана<br><img src="./assets/readme/examples/ui-entrance.webp" width="100%" alt="card-stack: карточки с приёмами раздаются из веера"><br><sub>card-stack: карточки из веера занимают свои места</sub></td>
<td align="center" width="50%"><b>Интерактив</b> · 13 планов<br><img src="./assets/readme/examples/interaction.webp" width="100%" alt="palette-theme-ripple: смена темы волной проходит по приложению"><br><sub>palette-theme-ripple: новая тема волной проходит по интерфейсу</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>Данные</b> · 9 планов<br><img src="./assets/readme/examples/data.webp" width="100%" alt="axis-rescale-shock: скачок на графике вызывает пересчёт масштаба оси"><br><sub>axis-rescale-shock: скачок ломает ось</sub></td>
<td align="center" width="50%"><b>Свет и акценты</b> · 23 плана<br><img src="./assets/readme/examples/effects.webp" width="100%" alt="spotlight-sweep: луч прожектора проявляет заголовок"><br><sub>spotlight-sweep: сценический свет находит заголовок</sub></td>
</tr>
<tr>
<td align="center" width="50%"><b>Ритм</b> · 8 планов<br><img src="./assets/readme/examples/rhythm.webp" width="100%" alt="paparazzi-flash: три вспышки переключают кадрирование"><br><sub>paparazzi-flash: три вспышки, три кадрирования, одно число</sub></td>
<td align="center" width="50%"><b>Финал</b> · 7 планов<br><img src="./assets/readme/examples/outro.webp" width="100%" alt="input-morph-assemble: поле ввода превращается в логотип"><br><sub>input-morph-assemble: поле чата собирает логотип</sub></td>
</tr>
</table>

Каждая карточка находится в `references/shots/<category>/<card>.md`, а её реализация на Remotion —
в `demos/<category>/<card>/` (как подключить её к проекту, см. в [demos/README.md](demos/README.md)).

## Motion Workbench

После сдачи ролика навык открывает в браузере редактор в духе CapCut
(`node workbench/scripts/open.mjs <project>`). Ролик разбит на дорожки планов, переходов, субтитров и звуковых эффектов
точно по исходному монтажу. Выберите план, чтобы изменить текст, размеры шрифтов и цвета, перемещайте, обрезайте клипы и плавно меняйте скорость,
добавляйте любой из 150 планов библиотеки и экспортируйте через Remotion. Превью и рендер совпадают покадрово. Языки интерфейса: English / 中文 / Русский.

![Монтажный стол Motion Workbench](workbench/docs/overview.png)

[Руководство по монтажному столу: все панели со скриншотами](workbench/GUIDE.md) (на китайском) ·
[Контракт интеграции](references/workbench.md)

## Что вы получите

| Результат | Подробности |
|---|---|
| Готовый ролик | `MP4`, 1920×1080, 30 fps, h264, с музыкой и звуковым оформлением |
| Проект Remotion | Полный исходный код ролика: каждый план — React-компонент, который можете изменить вы или агент |
| Motion Workbench | Открывается после сдачи: дорожки, панель свойств, изменение тайминга, замена планов, экспорт ([подробнее](#motion-workbench)) |
| Черновик JianYing | По желанию: редактируемый проект JianYing (CapCut CN) с отдельными клипами для каждого плана, субтитрами и аудиодорожками |
| Публикация в соцсетях | По запросу: публикация готового ролика через Upload-Post в TikTok, Instagram, YouTube, LinkedIn, X и других сервисах. Подтвердите подпись и платформы, затем выполните пробный запуск без публикации ([руководство](references/publish-upload-post.md)) |

Также в комплекте: переиспользуемые компоненты Remotion (2.5D-камера для страниц, субтитры, переходы-вспышки, прокрутка цифр), 149 звуковых эффектов и
5 музыкальных треков, скрипты захвата страниц и сам производственный процесс (захват, визуальная концепция, раскадровка,
звуковое оформление, синхронизация с музыкой, финальная проверка качества) в [references/](references/pipeline.md).

## Витрина работ

**Поделитесь своим роликом.** Сделали что-то с video-shotcraft?
[Отправьте работу](https://github.com/Vincentwei1021/video-shotcraft/issues/new?template=showcase.yml) через
форму Showcase. После проверки она появится
на [странице витрины](https://vincentwei1021.github.io/video-shotcraft/showcase.html).

## Требования

| Что нужно | Для чего |
|---|---|
| Node.js и npm | Рендер в Remotion, шаблон и монтажный стол |
| ffmpeg / ffprobe | Покадровая проверка и финальный контроль качества |
| [uv](https://docs.astral.sh/uv/) | Только для анализа ритма музыки (однократный запуск Python-скрипта) |
| puppeteer | Только для захвата страниц; скрипт захвата устанавливает его по необходимости |

При первом рендере Remotion скачивает собственный Chrome без графического интерфейса. Проверено на macOS; для Linux см. примечания ниже.

<details>
<summary><b>Linux без графического интерфейса / CI</b></summary>

При рендере на Linux без графического интерфейса (проверено: 2 ядра, Node 22) возникают три препятствия:

1. **Ограничение параллелизма.** На машинах с малым числом ядер `remotion still/render` завершается ошибкой «Maximum for --concurrency is 2».
   Передайте `--concurrency=1`.
2. **Удаление старого режима headless.** Новые версии Chrome/Chromium больше не поддерживают старый режим headless, поэтому Remotion
   не запускается с системным Chromium. Используйте исполняемый файл chrome-headless-shell вместо полного Chrome.
3. **Недоступный CDN.** Если remotion.media недоступен (часто бывает в материковом Китае), автоматическая загрузка headless-shell
   завершается ошибкой. Передайте `--browser-executable=<path-to-local chrome-headless-shell>`.

С этими тремя флагами покадровый рендер встроенного шаблона работает.

</details>

<details>
<summary><b>Структура репозитория</b></summary>

```text
video-shotcraft/
├── SKILL.md                 # Agent entry point and core production rules
├── references/
│   ├── pipeline.md          # End-to-end production workflow
│   ├── shots/               # 124 shot recipe cards in 10 functional categories
│   ├── sequences/           # Reusable full-video structures and sequence patterns
│   ├── aesthetic-rules.md   # Visual QA criteria
│   ├── music-beat-sync.md   # BGM analysis and beat-sync methodology
│   ├── sound-design.md      # Sound-design guidance and examples
│   ├── jianying-export.md   # JianYing (CapCut CN) project-export guide
│   ├── publish-upload-post.md # Optional social publishing (Upload-Post API)
│   └── workbench.md         # Motion workbench: manifest contract + editability rules
├── demos/                   # Remotion reference implementations (same categories)
├── gallery/                 # Static motion-preview Gallery
├── template/                # Runnable complete video template
├── jianying-export/         # JianYing draft installers (mac tested / win untested)
├── publish/                 # Optional social publisher (stdlib-only Python) + offline tests
├── workbench/               # Post-delivery motion workbench (Vite + Remotion Player)
└── assets/
    ├── lib/                 # Reusable Remotion components
    ├── scripts/             # Page-asset capture scripts
    └── audio/               # Audio assets
        ├── bgm/             # 5 BGM options
        └── sfx/<category>/  # 149 SFX across 16 scene categories
```

Полный процесс описан в [SKILL.md](SKILL.md), [производственном процессе](references/pipeline.md) и
[критериях визуального качества](references/aesthetic-rules.md).

</details>

## Аудио и ресурсы

Звуковые эффекты распределены по 16 категориям сцен и материалов (`transition` `impact` `riser` `camera` `ui` `text`
`paper` `film` `light` `data` `scifi` `mech` `glass` `fluid` `crowd` `counter`): сначала выберите категорию, затем
тембр. Каталог и рекомендации по каждому файлу — в [sound-design.md](references/sound-design.md),
источники и лицензии — в [ATTRIBUTION.md](assets/audio/ATTRIBUTION.md).

Скриншоты продукта в шаблоне — демонстрационные материалы. Перед публикацией замените их скриншотами своего
продукта и проверьте, нужно ли обезличить данные продукта, клиентов или персональные данные.

## Лицензия

- Код и документация: [Apache-2.0](LICENSE).
- Аудио в `assets/audio/`: у каждого файла своя лицензия, см. [ATTRIBUTION.md](assets/audio/ATTRIBUTION.md).
- У [Remotion](https://www.remotion.dev/) своя
  [лицензия](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md): бесплатно для частных лиц и небольших
  команд; компаниям может потребоваться платная лицензия.

## Благодарности

Многие приёмы выработаны при изучении анимационного языка выдающихся официальных продуктовых роликов, в том числе
промо **ClickUp, Perplexity, Slack, Notion, Figma, Framer, Bear, Raycast, Pitch, Miro, Superhuman и
Loom**. Карточки описывают техники (тайминг, сглаживание, хореографию), реализованные с нуля; видеоматериалы,
графика и фирменные ресурсы из этих роликов не включены. Все товарные знаки принадлежат их владельцам; ни одна из этих
компаний не связана с проектом и не заявляла о его поддержке.

Также спасибо **[Remotion](https://www.remotion.dev/)**, на котором работают все демо и шаблоны проекта;
**[Mixkit](https://mixkit.co/)** — источнику звуковых эффектов и музыки, включённых по его бесплатной лицензии; сообществам разработчиков игровой обратной связи
и анимации, чьи опубликованные принципы легли в основу ряда карточек; и **Claude Code**, с помощью которого
эту библиотеку создавали, дорабатывали и проверяли тем же способом, которому учит навык.

## Подписаться

<p>
  <a href="https://x.com/VincentWei93"><img alt="Подписаться на Vincent в X" src="https://img.shields.io/badge/X-Follow_Me-000000?style=for-the-badge&logo=x&logoColor=white"></a>
  <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg"><img alt="Подписаться на Vincent в Douyin" src="https://img.shields.io/badge/Douyin-Follow_Me-000000?style=for-the-badge&logo=tiktok&logoColor=white"></a>
  <a href="https://xhslink.cn/m/At9iP2d5C1V"><img alt="Подписаться на Vincent в Red Note" src="https://img.shields.io/badge/Red_Note-Follow_Me-FF2442?style=for-the-badge&logo=xiaohongshu&logoColor=white"></a>
</p>

## История звёзд

<a href="https://www.star-history.com/?repos=Vincentwei1021%2Fvideo-shotcraft&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&theme=dark&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <img alt="График истории звёзд" src="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
  </picture>
</a>
