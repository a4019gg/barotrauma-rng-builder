export function renderMenuBar(root) {
  if (!root) return;
  root.outerHTML = `<header class="top-bar menu-bar">
      <div class="menu-left" role="menubar" aria-label="Main menu">
        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuFile"></button>
          <div class="menu-dropdown" role="menu">
            <div class="menu-group-title" data-l10n="menuProjectGroup"></div>
            <button type="button" role="menuitem" data-action="projectImport" data-l10n="projectImport"></button>
            <button type="button" role="menuitem" data-action="projectExport" data-l10n="projectExport"></button>
            <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
            <div class="menu-group-title" data-l10n="menuXmlGroup"></div>
            <button type="button" role="menuitem" data-action="openImportXmlModal" data-l10n="importXML"></button>
            <button type="button" role="menuitem" data-action="downloadXML" data-l10n="downloadXML"></button>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuEdit"></button>
          <div class="menu-dropdown" role="menu">
            <button type="button" role="menuitem" data-action="undo" data-l10n="undo"></button>
            <button type="button" role="menuitem" data-action="redo" data-l10n="redo"></button>
            <button type="button" role="menuitem" data-action="menuDeleteSelected" data-l10n="menuDeleteSelected"></button>
            <button type="button" role="menuitem" data-action="menuDuplicateSelected" data-l10n="menuDuplicateSelected"></button>
            <button type="button" role="menuitem" data-action="clearAll" data-l10n="clearEvent"></button>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuPresets"></button>
          <div class="menu-dropdown" role="menu">
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="menuBasePresets"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="basePresetPlaceholder" data-l10n="menuOutpostMission"></button>
                <button type="button" role="menuitem" data-action="basePresetPlaceholder" data-l10n="menuWreckExpedition"></button>
              </div>
            </div>
            <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
            <button type="button" role="menuitem" data-action="loadPreset" data-l10n="loadPreset"></button>
            <button type="button" role="menuitem" data-action="savePreset" data-l10n="savePreset"></button>
            <button type="button" role="menuitem" data-action="managePreset" data-l10n="managePreset"></button>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuTools"></button>
          <div class="menu-dropdown" role="menu">
            <button type="button" role="menuitem" data-action="runSimulation" data-l10n="simulation"></button>
            <button type="button" role="menuitem" data-action="validateTree" data-l10n="validateTree"></button>
            <button type="button" role="menuitem" data-action="probabilityAnalysis" data-l10n="probabilityAnalysis"></button>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuView"></button>
          <div class="menu-dropdown" role="menu">
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="menuStyle"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu style-theme-dropdown" role="menu">
                <div class="menu-group-title">Theme</div>
                <div class="menu-theme-mode-grid" role="group" aria-label="Theme">
                  <button type="button" role="menuitemradio" class="theme-mode-icon-btn" data-action="menuSetThemeMode" data-value="dark" aria-label="Dark">🌙</button>
                  <button type="button" role="menuitemradio" class="theme-mode-icon-btn" data-action="menuSetThemeMode" data-value="light" aria-label="Light">☀️</button>
                  <span class="theme-mode-separator" aria-hidden="true">|</span>
                  <button type="button" role="menuitemradio" class="theme-mode-icon-btn" data-action="menuSetThemeFlavor" data-value="synthwave" aria-label="Rainbow">🌈</button>
                  <button type="button" role="menuitemradio" class="theme-mode-icon-btn" data-action="menuSetThemeFlavor" data-value="random" aria-label="Random style">❔</button>
                </div>
                <div class="menu-group-title" data-l10n="menuStyle"></div>
                <div class="menu-subitem style-theme-item" role="none" data-theme-id="debug"><button type="button" class="menu-style-apply" role="menuitem" data-action="menuSetBaseTheme" data-value="debug" data-l10n="themeDebug"></button></div>
                <div class="menu-subitem style-theme-item" role="none" data-theme-id="classic-luna"><button type="button" class="menu-style-apply" role="menuitem" data-action="menuSetBaseTheme" data-value="classic-luna" data-l10n="themeClassicLuna"></button></div>
                <div class="menu-subitem style-theme-item" role="none" data-theme-id="neon-ops"><button type="button" class="menu-style-apply" role="menuitem" data-action="menuSetBaseTheme" data-value="neon-ops" data-l10n="themeNeonOps"></button></div>
                <div class="menu-subitem style-theme-item" role="none" data-theme-id="retro-terminal"><button type="button" class="menu-style-apply" role="menuitem" data-action="menuSetBaseTheme" data-value="retro-terminal" data-l10n="themeRetroTerminal"></button></div>
                <div class="menu-subitem style-theme-item" role="none" data-theme-id="soft-bloom"><button type="button" class="menu-style-apply" role="menuitem" data-action="menuSetBaseTheme" data-value="soft-bloom" data-l10n="themeSoftBloom"></button></div>
                <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
                <div class="menu-style-accent-grid">
                  <div>
                    <div class="menu-group-title" data-l10n="accentColor"></div>
                    <div class="menu-retro-accent-dropdown" role="group" aria-label="Accent color">
                      <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="theme-base" data-l10n-title="accentColor" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="terminal-green" data-l10n-title="retroAccentGreen" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="amber-phosphor" data-l10n-title="retroAccentAmber" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="ice-cyan" data-l10n-title="retroAccentCyan" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="plasma-magenta" data-l10n-title="retroAccentMagenta" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="violet-glow" data-l10n-title="retroAccentViolet" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="neon-blue" data-l10n-title="retroAccentBlue" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="ember-red" data-l10n-title="retroAccentRed" aria-checked="false"><span class="retro-preset-dot"></span></button>
                  <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="phosphor-lime" data-l10n-title="retroAccentLime" aria-checked="false"><span class="retro-preset-dot"></span></button>
                      <button type="button" role="menuitemradio" class="retro-preset-btn retro-preset-option retro-accent-option" data-action="setThemeAccentPreset" data-value="mono-contrast" data-l10n-title="retroAccentMono" aria-checked="false"><span class="retro-preset-dot"></span></button>
                    </div>
                  </div>
                  <div class="menu-style-accent-divider" role="separator" aria-orientation="vertical"></div>
                  <div>
                    <div class="menu-group-title" data-l10n="sfAccentPalette"></div>
                    <div class="menu-sf-accent-dropdown" role="group" aria-label="S/F accents">
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="emerald-crimson" data-l10n-title="sfAccentDefault" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="mint-rose" data-l10n-title="sfAccentMintRose" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="neon-cherry" data-l10n-title="sfAccentNeonCherry" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="forest-ruby" data-l10n-title="sfAccentForestRuby" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="lime-magenta" data-l10n-title="sfAccentLimeMagenta" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="aqua-ember" data-l10n-title="sfAccentAquaEmber" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="teal-violet" data-l10n-title="sfAccentTealViolet" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="sage-coral" data-l10n-title="sfAccentSageCoral" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                      <button type="button" role="menuitemradio" class="sf-preset-btn sf-preset-option" data-action="setSfAccentPreset" data-value="sky-sun" data-l10n-title="sfAccentSkySun" aria-checked="false"><span class="sf-preset-pair"><span class="sf-preset-dot sf-success"></span><span class="sf-preset-dot sf-failure"></span></span></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="menuUiScale"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="menuSetUiScale" data-value="80" data-l10n="uiScale80"></button>
                <button type="button" role="menuitem" data-action="menuSetUiScale" data-value="90" data-l10n="uiScale90"></button>
                <button type="button" role="menuitem" data-action="menuSetUiScale" data-value="100" data-l10n="uiScale100"></button>
                <button type="button" role="menuitem" data-action="menuSetUiScale" data-value="110" data-l10n="uiScale110"></button>
                <button type="button" role="menuitem" data-action="menuSetUiScale" data-value="120" data-l10n="uiScale120"></button>
              </div>
            </div>
            <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
            <div class="menu-group-title" data-l10n="syntaxHighlightGroup"></div>
            <label class="menu-control-row menu-control-switch" role="none"><span data-l10n="syntaxHighlight"></span><input id="xml-feature-syntax" type="checkbox" checked /></label>
            <label class="menu-control-row menu-control-switch" role="none"><span data-l10n="xmlWarnings"></span><input id="xml-feature-warnings" type="checkbox" checked /></label>
            <label class="menu-control-row menu-control-switch" role="none"><span data-l10n="xmlTooltips"></span><input id="xml-feature-tooltips" type="checkbox" checked /></label>
            <label class="menu-control-row menu-control-switch" role="none"><span data-l10n="xmlInlineHints"></span><input id="xml-feature-inline-hints" type="checkbox" checked /></label>
            <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
            <label class="menu-control-row menu-control-switch" role="none">
              <span data-l10n="grid"></span>
              <input id="toggle-grid" type="checkbox" />
            </label>
            <label class="menu-control-row menu-control-switch" role="none">
              <span data-l10n="editableLabelsAdvanced"></span>
              <input id="toggle-editable-labels" type="checkbox" />
            </label>
            <label class="menu-control-row menu-control-switch" role="none">
              <span data-l10n="showButtonIcons"></span>
              <input id="toggle-button-icons" type="checkbox" />
            </label>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuHelp"></button>
          <div class="menu-dropdown" role="menu">
            <button type="button" role="menuitem" data-action="openDocumentation" data-l10n="documentation"></button>
            <button type="button" role="menuitem" data-action="openWiki" data-l10n="openWiki"></button>
            <button type="button" role="menuitem" data-action="openGithub" data-l10n="openGithub"></button>
            <button type="button" role="menuitem" data-action="reportIssue" data-l10n="reportIssue"></button>
            <button type="button" role="menuitem" data-action="aboutApp" data-l10n="aboutApp"></button>
          </div>
        </div>

        <div class="menu-item" role="none">
          <button type="button" class="menu-button" role="menuitem" data-l10n="menuSettings"></button>
          <div class="menu-dropdown" role="menu">
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="language"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="en" data-l10n="langEnglish"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="zh-Hans" data-l10n="langSimplifiedChinese"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="zh-Hant" data-l10n="langTraditionalChinese"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="ru" data-l10n="langRussian"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="fr" data-l10n="langFrench"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="es" data-l10n="langSpanish"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="de" data-l10n="langGerman"></button>
                <button type="button" role="menuitem" data-action="menuSetLanguage" data-value="pl" data-l10n="langPolish"></button>
              </div>
            </div>
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="openSettingsXmlBehavior"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="openImportXmlModal" data-l10n="importXML"></button>
                <button type="button" role="menuitem" data-action="downloadXML" data-l10n="downloadXML"></button>
                <button type="button" role="menuitem" data-action="generateXML" data-l10n="generateXML"></button>
              </div>
            </div>
            <div class="menu-divider" role="separator" aria-orientation="horizontal"></div>
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="chanceInputMode"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="menuSetChanceInputMode" data-value="fraction" data-l10n="chanceModeFraction"></button>
                <button type="button" role="menuitem" data-action="menuSetChanceInputMode" data-value="percent" data-l10n="chanceModePercent"></button>
              </div>
            </div>
            <div class="menu-subitem" role="none">
              <button type="button" class="menu-button submenu-trigger" role="menuitem"><span data-l10n="autoChanceMode"></span> <span class="submenu-arrow">▶</span></button>
              <div class="menu-dropdown submenu" role="menu">
                <button type="button" role="menuitem" data-action="menuSetAutoChanceMode" data-value="off" data-l10n="autoChanceOff"></button>
                <button type="button" role="menuitem" data-action="menuSetAutoChanceMode" data-value="root-split" data-l10n="autoChanceRoot"></button>
                <button type="button" role="menuitem" data-action="menuSetAutoChanceMode" data-value="branch-split" data-l10n="autoChanceBranch"></button>
              </div>
            </div>
            <label class="menu-control-row menu-control-switch" role="none">
              <span data-l10n="softStart"></span>
              <input id="toggle-soft-start" type="checkbox" />
            </label>
            <button type="button" role="menuitem" data-action="resetSettings" data-l10n="resetSettings"></button>
          </div>
        </div>
      </div>

      <div class="menu-right">
        <button data-action="openDB" data-action-tier="secondary" data-l10n="database"></button>
        <button data-action="openDocumentation" data-action-tier="secondary" data-l10n="documentation"></button>
        <button data-action="openEditorModule" data-action-tier="secondary" data-l10n="backToEditor" hidden></button>
        <div id="view-segmented" class="segmented-control" data-view-mode="node" data-segment-count="2" role="tablist" data-l10n-aria-label="editorViewMode">
          <div class="segmented-control-indicator" aria-hidden="true"></div>
          <button type="button" class="segmented-option active" data-action="setViewMode" data-view-mode="node" role="tab" aria-selected="true" data-l10n="nodeMode"></button>
          <button type="button" class="segmented-option" data-action="setViewMode" data-view-mode="tree" role="tab" aria-selected="false" data-l10n="treeMode"></button>
        </div>
      </div>
    </header>`;
}
