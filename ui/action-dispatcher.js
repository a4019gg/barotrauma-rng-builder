import { editorStore } from '../state/store.js';

export function dispatch(action, options) {
  return editorStore.dispatch(action, options);
}
