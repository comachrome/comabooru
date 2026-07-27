# AGENTS.md — Гайд для AI-Агентов и Разработчиков Comabooru

Этот документ содержит полное описание архитектуры, стека, технических решений, соглашений по коду и правил работы для AI-агентов и инженеров, разрабатывающих проект **comabooru**.

---

## 📌 1. Обзор проекта

**comabooru** — это современный клиент для просмотра галерей *booru платформ (в первую очередь [Gelbooru](https://gelbooru.com)).  
Главные задачи проекта:
- Предоставление удобного UX/UI с элементами QoL (быстрый просмотр, горячие клавиши, гибкая фильтрация, кастомные темы).
- Обход технических ограничений платформ (требование авторизации, блокировки Referrer для CDN изображений, CORS).
- Высокая производительность и адаптивность под любые разрешения экранов.

---

## 🛠 2. Технологический стек

| Слой / Инструмент | Технология / Пакет | Описание |
| :--- | :--- | :--- |
| **UI Framework** | [Svelte 5](https://svelte.dev/) | Декларативные компоненты и Svelte stores |
| **Сборщик** | [Vite 8](https://vitejs.dev/) | Быстрый HMR и продакшн-сборка |
| **Язык** | [TypeScript 6](https://www.typescriptlang.org/) | Строгая типизация всей бизнес-логики и компонентов |
| **Runtime / Package Manager** | [Bun](https://bun.sh/) | Менеджер пакетов и выполнение скриптов |
| **Линтинг** | [ESLint 10](https://eslint.org/) (Flat Config) | `eslint-plugin-svelte` + `typescript-eslint` |
| **Иконки** | [Lucide Svelte](https://lucide.dev/) | Набор икон в виде Svelte-компонентов |
| **Тестирование** | [Vitest](https://vitest.dev/) / `bun test` | Модульное тестирование бизнес-логики |

---

## 📁 3. Структура проекта и назначение модулей

```text
comabooru/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions автодеплой при пуше в main
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── booruClient.ts   # Запросы к DAPI Gelbooru, нормализация постов, proxy fallback
│   │   │   └── types.ts         # TypeScript интерфейсы (BooruPost, AppSettings, etc.)
│   │   ├── components/
│   │   │   ├── auth/            # OnboardingModal.svelte (Форма первичного входа)
│   │   │   ├── common/          # Header.svelte, SettingsModal.svelte
│   │   │   ├── gallery/         # GalleryGrid.svelte, MediaCard.svelte, LightboxModal.svelte, PaginationControls.svelte
│   │   │   └── search/          # SearchBar.svelte (Поиск с автодополнением и чипами)
│   │   ├── stores/
│   │   │   ├── authStore.ts     # Состояние авторизации и токенов
│   │   │   ├── galleryStore.ts  # Загрузка и фильтрация списка постов
│   │   │   ├── lightboxStore.ts # Управление полноэкранным просмотром и листанием
│   │   │   └── settingsStore.ts # Темы, блэклист, прокси, политика реферера
│   │   ├── styles/
│   │   │   └── global.css       # Переменные тем (Dark, Light, OLED), glassmorphic стили
│   │   └── utils/
│   │       ├── storage.ts       # Сохранение/загрузка из localStorage и cookies
│   │       └── tagParser.ts     # Парсинг тегов, категории, проверка блэклиста
│   ├── App.svelte               # Главная точка монтирования
│   └── main.ts                  # Инициализация Vite
├── tests/
│   └── unit/                    # Модульные тесты (api, storage, tagParser)
├── eslint.config.js             # ESLint Flat Config
├── svelte.config.js             # Конфигурация Svelte препроцессора
├── vite.config.ts               # Конфигурация Vite и Vitest
└── tsconfig.json                # Конфигурация TypeScript
```

---

## 📐 4. Ключевые архитектурные решения и соглашения

### 4.1. Авторизация и Хранение Данных
- Для работы с Gelbooru DAPI **обязательны** `userId` и `apiKey`.
- При входе вызывается `testConnection()`, проверяющий валидность ключей запросом `limit=1`.
- Токены сохраняются **одновременно** в `localStorage` (`comabooru_credentials`) и в `document.cookie` (атрибуты: `path=/; max-age=31536000; SameSite=Strict`).
- При запуске `authStore.init()` проверяет наличие сохраненных данных и пропускает экран Onboarding.

### 4.2. Обход блокировки Referrer и Хотлинкинга
- Серверы CDN Gelbooru блокируют выдачу картинок при наличии `Referer: https://<external-domain>`.
- На элементах `<img>` и `<video>` **обязательно** задавать атрибут:
  ```svelte
  referrerpolicy={$settingsStore.referrerPolicy || 'no-referrer'}
  ```

### 4.3. Ограничения API и Пагинация
- К DAPI запросам всегда добавляется `json=1`.
- Gelbooru ограничивает значение оффсета (`pid * limit`) порогом в 20 000 постов. В связи с этим значение `totalPages` в [PaginationControls.svelte](file:///e:/comabooru/src/lib/components/gallery/PaginationControls.svelte) ограничено 1000 страницами:
  ```ts
  $: totalPages = Math.min(Math.ceil(totalCount / limit), 1000) || 1;
  ```

### 4.4. Proxy Fallback и Сетевой CORS-прокси
- При сетевых или CORS ошибках (например, блокировке браузером DAPI Gelbooru/Danbooru) функция `fetchWithProxy` в [httpUtils.ts](file:///e:/comabooru/src/lib/api/httpUtils.ts) перенаправляет запросы через автоподставляемый относительный роут **`/api-proxy?url=...`**.
- В dev-режиме `/api-proxy` обрабатывается Vite-плагином из `vite.config.ts`.
- В продакшене `/api-proxy` обрабатывается напрямую в Nginx (см. руководство по деплою в `README.md`).
- Также поддерживается пользовательский кастомный прокси (`customProxyUrl`), если задан в настройках.

### 4.5. Правила написания компонентов (ESLint & Svelte Best Practices)
1. **Ключи в циклах `{#each}`:** Каждое выражение `{#each}` должно содержать уникальный ключ для оптимального перерендеринга Svelte DOM:
   ```svelte
   {#each items as item (item.id)}
   ```
2. **Запрет на отключение и обход ESLint / TypeScript правил:** Категорически запрещается использовать директивы `/* eslint-disable */`, `// @ts-ignore`, `// @ts-nocheck` или делать искусственные хаки для скрытия ошибок линтера. Ошибки линтера и типов должны исправляться строго по существу в коде.
3. **Обязательные регрессионные тесты после каждого багфикса:** Каждое исправление бага, краевого случая или нелогичного поведения UI должно сопровождаться соответствующим регрессионным тестом (юнит или компонентным в `tests/unit/`).
4. **Неиспользуемые переменные:** Избегать лишнего деструктурирования `writable` методов (`set`/`update`), если они не используются.
5. **Именование классов CSS:** Использовать переменные темы из `global.css` (`var(--bg-surface)`, `var(--color-accent-primary)`, `var(--border-glass)`).

---

## 🧭 5. Навигация и Рефакторинг (Serena MCP)

- При поиске символов, функций, классов, типов, объявлений, вызовов и при проведении рефакторинга кода агенты **обязаны** использовать MCP-инструменты Serena (`serena/*`, такие как `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `rename_symbol`).

---

## 🧪 6. Стандарты тестирования

- Проект тестируется двумя способами:
  1. `bun run test` — запуск через Vitest в виртуальном окружении `jsdom`.
  2. `bun test` — запуск через нативный тестовый раннер Bun.
- Утилита [storage.test.ts](file:///e:/comabooru/tests/unit/storage.test.ts) включает полифиллы для `globalThis.window`, `globalThis.localStorage` и `globalThis.document`, благодаря чему все 13 тестов проходят нативно в Bun без использования DOM.
- Любой создаваемый модуль утилит или API обязан сопровождаться соответствующим unit-тестом в `tests/unit/`.

---

## ⚡ 6. Команды для Агентов (Workflow Verification)

Перед отправкой изменений или объявлением о завершении задачи АГЕНТ ОБЯЗАН выполнить следующую цепочку проверок:

```bash
# 1. Проверка типов Svelte и TypeScript (должно быть 0 errors, 0 warnings)
bun run check

# 2. Проверка кода линтером ESLint (должно быть 0 errors, 0 warnings)
bun run lint

# 3. Запуск модульных тестов (100% pass)
bun test

# 4. Проверка production-сборки
bun run build
```

При добавлении новых файлов или изменении архитектуры **обязательно** обновлять соответствующую документацию в `README.md` и `AGENTS.md`.
