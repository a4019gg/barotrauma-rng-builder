import { documentationGroups, getAllDocumentationArticles, validateDocumentationData } from "./documentation-data.js";
import { tDoc } from "./docs-loc.js";

const articles = getAllDocumentationArticles();
const articlesById = new Map(articles.map(article => [article.id, article]));
const listeners = new Set();

function cloneArticle(article) {
  return {
    ...article,
    sections: article.sections.map(section => ({
      ...section,
      listKeys: section.listKeys ? [...section.listKeys] : undefined,
      definitions: section.definitions ? section.definitions.map(definition => ({ ...definition })) : undefined
    }))
  };
}

const state = {
  activeGroup: "quickstart",
  activeArticleId: "getting-started",
  searchQuery: "",
  filteredArticleIds: articles.map(article => article.id),
  isLoaded: false
};

function emit() {
  const snapshot = getState();
  listeners.forEach(listener => listener(snapshot));
}

function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase();
}

function ensureActiveArticleVisible() {
  const visibleIds = state.searchQuery ? state.filteredArticleIds : getArticlesByGroup(state.activeGroup).map(article => article.id);
  if (visibleIds.includes(state.activeArticleId)) return;
  state.activeArticleId = visibleIds[0] || articles[0]?.id || "";
}

function articleSearchText(article) {
  const parts = [tDoc(article.titleKey)];
  article.sections.forEach(section => {
    if (section.titleKey) parts.push(tDoc(section.titleKey));
    if (section.contentKey) parts.push(tDoc(section.contentKey));
    (section.listKeys || []).forEach(key => parts.push(tDoc(key)));
    (section.definitions || []).forEach(definition => {
      parts.push(definition.termKey.startsWith("docs.") ? tDoc(definition.termKey) : definition.termKey);
      parts.push(tDoc(definition.descriptionKey));
    });
    if (section.codeExample) parts.push(section.codeExample);
  });
  return parts.join(" ").toLowerCase();
}

function refreshFilters() {
  state.filteredArticleIds = searchArticles(state.searchQuery);
  ensureActiveArticleVisible();
}

export function init() {
  if (state.isLoaded) return getState();
  const missingKeys = validateDocumentationData("en");
  if (missingKeys.length) {
    console.warn("Documentation localization keys are missing:", missingKeys);
  }
  state.isLoaded = true;
  refreshFilters();
  emit();
  return getState();
}

export function getState() {
  return {
    ...state,
    filteredArticleIds: [...state.filteredArticleIds]
  };
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setActiveGroup(group) {
  if (!documentationGroups.includes(group)) return;
  state.activeGroup = group;
  if (!state.searchQuery) {
    const firstArticle = getArticlesByGroup(group)[0];
    if (firstArticle) state.activeArticleId = firstArticle.id;
  }
  ensureActiveArticleVisible();
  emit();
}

export function setActiveArticle(id) {
  if (!articlesById.has(id)) return;
  state.activeArticleId = id;
  const article = articlesById.get(id);
  if (article) state.activeGroup = article.group;
  emit();
}

export function setSearchQuery(query) {
  state.searchQuery = normalizeQuery(query);
  refreshFilters();
  emit();
}

export function refreshLocalizedState() {
  refreshFilters();
  emit();
}

export function getArticle(id) {
  const article = articlesById.get(id);
  return article ? cloneArticle(article) : null;
}

export function getArticlesByGroup(group) {
  return articles.filter(article => article.group === group).map(cloneArticle);
}

export function getArticlesByCategory(category) {
  return articles.filter(article => article.category === category).map(cloneArticle);
}

export function searchArticles(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return articles.map(article => article.id);
  return articles.filter(article => articleSearchText(article).includes(normalized)).map(article => article.id);
}
