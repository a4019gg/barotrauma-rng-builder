# 🛠 TOOLS.md

This document describes **offline developer tools** used in the Barotrauma RNG Builder project.

These tools are **not part of the runtime application** and are **not used on GitHub Pages**.  
They exist solely to **extract and normalize data from the Barotrauma game files**.

---

## 📁 Folder structure

```

/tools
└─ parse_afflictions.py

````

All scripts in this folder are:
- run manually
- executed locally
- written for developers, not end users

---

## 🧪 parse_afflictions.py

> ℹ️ Script filename was normalized to `parse_afflictions.py` (old typo variant removed) for consistency.

### Purpose

Parses **Barotrauma Afflictions.xml** and converts it into a **normalized JSON format** used by the project database.

This script:
- reads raw game data
- extracts only relevant information
- adds **semantic metadata**
- outputs clean, predictable JSON

---

### Input

- **Source file**:  
  `Barotrauma/Content/Afflictions.xml`

- The path is configured at the top of the script:
  ```python
  XML_PATH = r".../Barotrauma/Content/Afflictions.xml"
  ````

### Output

* **Generated file**:
  `afflictions.json`

* Structure (simplified):

```json
{
  "id": "blunttrauma",
  "name": "Blunt force trauma",
  "description": "",
  "type": "damage",
  "maxstrength": 200,
  "limbspecific": true,
  "isbuff": false,
  "icon": {
    "texture": "assets/MainIconsAtlas.png",
    "sourcerect": "768,896,128,128",
    "role": "damage",
    "colorMode": "dynamic",
    "palette": "damage"
  }
}
```

---

### What the parser DOES

* ✔ Reads `<Affliction>` and `<InternalDamage>` nodes
* ✔ Extracts:

  * identifier
  * name
  * type
  * max strength
  * limb specificity
* ✔ Extracts icon atlas data:

  * `texture`
  * `sourcerect`
* ✔ Rewrites texture paths:

  ```
  Content/UI/... → assets/...
  ```
* ✔ Assigns **semantic icon metadata**:

  * `role`
  * `colorMode`
  * `palette`
* ✔ Produces stable JSON compatible with:

  * database UI
  * icon renderer
  * node UI

---

### What the parser DOES NOT do

* ❌ Does NOT store RGB colors
* ❌ Does NOT process themes
* ❌ Does NOT know about UI or rendering
* ❌ Does NOT normalize filenames
* ❌ Does NOT load images
* ❌ Does NOT include localization text

The parser is intentionally **data-only and semantic-only**.

---

## 🎨 Icon colors and themes

The parser **does not store actual color values**.

Instead, it outputs **semantic color identifiers**:

* `role`
* `palette`
* `colorMode`

Concrete colors (RGB / gradients / transitions) are defined **exclusively in CSS theme files**
(e.g. `css/themes/dark.css`, `css/themes/light.css`).

This separation allows:

* consistent visuals across the UI
* easy theme switching
* centralized color tuning
* dynamic color interpolation based on effect strength

---

### ⚠️ Note about raw XML color values

The original XML `<icon>` node may contain a `color` attribute:

```xml
<icon color="195,136,60,255" />
```

This value is **not reliable** as a final visual color:

* it may not match actual UI appearance
* it may be overridden elsewhere
* it may represent a placeholder or debug value

For this reason, the parser **intentionally ignores** the `color` attribute by default.

---

### 🔧 Optional: Parsing raw RGB values (advanced)

If needed, the parser **can be modified** to extract raw RGB values.

Example approach:

* read the `color` attribute from `<icon>`
* split it into RGBA components
* store it in JSON, for example:

```json
"icon": {
  "texture": "...",
  "sourcerect": "...",
  "role": "damage",
  "colorMode": "static",
  "rgb": [195, 136, 60]
}
```

⚠️ **Important warning**:

* raw XML color values may be inconsistent
* some colors may appear arbitrary or misleading
* additional UI-related logic may affect final appearance

For these reasons, **semantic colors are preferred** unless raw values are explicitly required.


---

## 🔮 Planned tools (placeholders)

### parse_items.py

*(planned)*

---

### parse_creatures.py

*(planned)*

---

### validate_database.py

*(maybe)*

---

### 🤖 Note on AI-assisted development

All tools in the `tools/` directory, as well as the project as a whole, were created with the assistance of **Large Language Models (LLMs)**.

LLMs were used as:
- a programming assistant
- an architectural discussion partner
- a refactoring and documentation aid

All design decisions, validation, testing, and final responsibility for the code and data structures remain with the project author.

This note is provided for transparency and documentation purposes.
