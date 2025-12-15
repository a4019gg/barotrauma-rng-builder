declare global {
  const L: Record<string, string>;
  function loc(key: string, fallback?: string): string;
  function updateAll(): void;
  function populateDatalist(): void;
  function showScriptVersions(): void;
  const d3: any;
}

export {};
