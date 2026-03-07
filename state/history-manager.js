export class HistoryManager {
  constructor({ maxEntries = 120 } = {}) {
    this.maxEntries = maxEntries;
    this.undoStack = [];
    this.redoStack = [];
  }

  push(entry) {
    if (!entry || typeof entry.undo !== 'function' || typeof entry.redo !== 'function') return;
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    const entry = this.undoStack.pop();
    entry.undo();
    this.redoStack.push(entry);
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    const entry = this.redoStack.pop();
    entry.redo();
    this.undoStack.push(entry);
    return true;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
