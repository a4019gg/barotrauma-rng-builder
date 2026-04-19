export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function createElement(tagName, options = {}) {
  const el = document.createElement(tagName);
  const { className, text, attrs, dataset } = options;

  if (className) el.className = className;
  if (text != null) el.textContent = String(text);

  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value == null) return;
      el.setAttribute(key, String(value));
    });
  }

  if (dataset && typeof dataset === 'object') {
    Object.entries(dataset).forEach(([key, value]) => {
      if (value == null) return;
      el.dataset[key] = String(value);
    });
  }

  return el;
}

export function appendChildren(parent, ...children) {
  if (!parent) return;
  children.flat().forEach(child => {
    if (child == null) return;
    parent.appendChild(child);
  });
}
