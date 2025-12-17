const DB_VERSION = "v0.9.422";
window.DB_VERSION = DB_VERSION;

/* DB cards */

.db-entry {
  border: 1px solid rgba(255,255,255,0.08);
  padding: 10px;
  border-radius: 6px;
  background: rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.db-entry.expanded {
  border-color: rgba(255,255,255,0.2);
}

.db-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.db-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.db-id {
  font-size: 11px;
  opacity: 0.7;
}

.info-toggle {
  cursor: pointer;
  opacity: 0.6;
}
.info-toggle:hover {
  opacity: 1;
}

.db-summary {
  font-size: 13px;
  opacity: 0.85;
}

.db-details {
  display: none;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  font-size: 13px;
  gap: 4px;
}

.db-entry.expanded .db-details {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.db-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.db-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  opacity: 0.85;
}
