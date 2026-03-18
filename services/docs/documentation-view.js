import { t } from "../../ui/localization.js";
import { documentationGroups } from "./documentation-data.js";
import * as documentationStore from "./documentation-store.js";
import { tDoc } from "./docs-loc.js";

let rootEl = null;
let unsubscribe = null;
let previousArticleId = "";

function articleIsVisible(articleId, state) {
  return !state.searchQuery || state.filteredArticleIds.includes(articleId);
}

function getVisibleArticlesForGroup(group, state) {
  return documentationStore
    .getArticlesByGroup(group)
    .filter(article => articleIsVisible(article.id, state));
}

function renderDefinitions(definitions) {
  const list = document.createElement("dl");
  list.className = "docs-definition-list";
  definitions.forEach(definition => {
    const term = document.createElement("dt");
    term.textContent = definition.termKey.startsWith("docs.") ? tDoc(definition.termKey) : definition.termKey;
    const description = document.createElement("dd");
    description.textContent = tDoc(definition.descriptionKey);
    list.append(term, description);
  });
  return list;
}

function renderArticle(state) {
  const article = documentationStore.getArticle(state.activeArticleId);
  const headerEl = rootEl.querySelector(".docs-article-header");
  const bodyEl = rootEl.querySelector(".docs-article-body");
  const contentEl = rootEl.querySelector(".docs-content");
  if (!headerEl || !bodyEl || !contentEl) return;

  if (!article) {
    headerEl.innerHTML = "";
    bodyEl.innerHTML = "";
    return;
  }

  headerEl.innerHTML = `
    <div class="docs-article-meta">
      <span class="docs-category-pill">${tDoc(`docs.ui.category.${article.category}`)}</span>
      <span class="docs-group-pill">${tDoc(`docs.ui.group.${article.group}`)}</span>
    </div>
    <h1>${tDoc(article.titleKey)}</h1>
  `;

  bodyEl.innerHTML = "";
  article.sections.forEach(section => {
    const sectionEl = document.createElement("section");
    sectionEl.className = "docs-section";

    if (section.titleKey) {
      const title = document.createElement("h2");
      title.className = "docs-section-title";
      title.textContent = tDoc(section.titleKey);
      sectionEl.appendChild(title);
    }

    if (section.contentKey) {
      const paragraph = document.createElement("p");
      paragraph.className = "docs-section-text";
      paragraph.textContent = tDoc(section.contentKey);
      sectionEl.appendChild(paragraph);
    }

    if (section.listKeys?.length) {
      const list = document.createElement("ul");
      list.className = "docs-list";
      section.listKeys.forEach(key => {
        const item = document.createElement("li");
        item.textContent = tDoc(key);
        list.appendChild(item);
      });
      sectionEl.appendChild(list);
    }

    if (section.definitions?.length) {
      sectionEl.appendChild(renderDefinitions(section.definitions));
    }

    if (section.codeExample) {
      const pre = document.createElement("pre");
      pre.className = "docs-code-block";
      pre.textContent = section.codeExample;
      sectionEl.appendChild(pre);
    }

    bodyEl.appendChild(sectionEl);
  });

  if (previousArticleId !== article.id) {
    contentEl.scrollTo({ top: 0, behavior: "smooth" });
    previousArticleId = article.id;
  }
}

function renderNavigation(state) {
  const groupsEl = rootEl.querySelector(".docs-groups");
  const articlesEl = rootEl.querySelector(".docs-articles");
  const summaryEl = rootEl.querySelector(".docs-search-summary");
  const emptyEl = rootEl.querySelector(".docs-empty");
  if (!groupsEl || !articlesEl || !summaryEl || !emptyEl) return;

  groupsEl.innerHTML = "";
  documentationGroups.forEach(group => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `docs-group-button${state.activeGroup === group ? " active" : ""}`;
    button.dataset.group = group;
    button.textContent = tDoc(`docs.ui.group.${group}`);
    groupsEl.appendChild(button);
  });

  articlesEl.innerHTML = "";
  const groupsToRender = state.searchQuery ? documentationGroups : [state.activeGroup];
  groupsToRender.forEach(group => {
    const visibleArticles = getVisibleArticlesForGroup(group, state);
    if (!visibleArticles.length) return;

    const section = document.createElement("section");
    section.className = "docs-nav-section";

    const title = document.createElement("h3");
    title.className = "docs-nav-section-title";
    title.textContent = tDoc(`docs.ui.group.${group}`);
    section.appendChild(title);

    visibleArticles.forEach(article => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `docs-article-button${state.activeArticleId === article.id ? " active" : ""}`;
      button.dataset.articleId = article.id;
      button.textContent = tDoc(article.titleKey);
      section.appendChild(button);
    });

    articlesEl.appendChild(section);
  });

  const count = state.filteredArticleIds.length;
  summaryEl.textContent = tDoc("docs.ui.searchSummary").replace("{count}", String(count));
  emptyEl.hidden = count > 0;
}

function render() {
  if (!rootEl) return;
  const state = documentationStore.getState();
  const searchInput = rootEl.querySelector(".docs-search-input");
  const titleEl = rootEl.querySelector(".docs-module-title");
  const subtitleEl = rootEl.querySelector(".docs-module-subtitle");
  const backButton = rootEl.querySelector('[data-action="openEditorModule"]');
  const groupsNav = rootEl.querySelector('.docs-groups');
  if (searchInput) {
    searchInput.placeholder = tDoc("docs.ui.searchPlaceholder");
    if (searchInput.value !== state.searchQuery) searchInput.value = state.searchQuery;
  }
  if (titleEl) titleEl.textContent = tDoc("docs.ui.title");
  if (subtitleEl) subtitleEl.textContent = tDoc("docs.ui.subtitle");
  if (backButton) backButton.textContent = tDoc("docs.ui.backToEditor");
  if (groupsNav) groupsNav.setAttribute('aria-label', t('docsGroupsLabel'));
  const emptyTitle = rootEl.querySelector(".docs-empty h3");
  const emptyText = rootEl.querySelector(".docs-empty p");
  if (emptyTitle) emptyTitle.textContent = tDoc("docs.ui.searchEmptyTitle");
  if (emptyText) emptyText.textContent = tDoc("docs.ui.searchEmptyText");
  renderNavigation(state);
  renderArticle(state);
}

function bindEvents() {
  rootEl.addEventListener("input", event => {
    const input = event.target.closest(".docs-search-input");
    if (!input) return;
    documentationStore.setSearchQuery(input.value);
  });

  rootEl.addEventListener("click", event => {
    const groupButton = event.target.closest(".docs-group-button");
    if (groupButton) {
      documentationStore.setActiveGroup(groupButton.dataset.group);
      return;
    }

    const articleButton = event.target.closest(".docs-article-button");
    if (articleButton) {
      documentationStore.setActiveArticle(articleButton.dataset.articleId);
    }
  });
}

export function initDocumentationView(container) {
  if (rootEl) return rootEl;
  rootEl = document.createElement("section");
  rootEl.className = "docs-module";
  rootEl.innerHTML = `
    <aside class="docs-sidebar">
      <div class="docs-sidebar-head">
        <h2 class="docs-module-title"></h2>
        <p class="docs-module-subtitle"></p>
        <button type="button" class="docs-back-button" data-action="openEditorModule"></button>
      </div>
      <div class="docs-search-wrap">
        <input type="search" class="docs-search-input" />
        <div class="docs-search-summary"></div>
      </div>
      <nav class="docs-groups" aria-label=""></nav>
      <div class="docs-articles"></div>
      <div class="docs-empty" hidden>
        <h3></h3>
        <p></p>
      </div>
    </aside>
    <article class="docs-content">
      <header class="docs-article-header"></header>
      <div class="docs-article-body"></div>
    </article>
  `;
  container.appendChild(rootEl);
  bindEvents();
  documentationStore.init();
  unsubscribe = documentationStore.subscribe(render);
  render();
  return rootEl;
}

export function refreshDocumentationView() {
  render();
}

export function destroyDocumentationView() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  if (rootEl) rootEl.remove();
  rootEl = null;
}
