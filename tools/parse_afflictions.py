import xml.etree.ElementTree as ET
import json
from pathlib import Path

# =========================================================
# CONFIG
# =========================================================

XML_PATH = r"C:\Program Files (x86)\Steam\steamapps\common\Barotrauma\Content\Afflictions.xml"
OUTPUT_JSON = "afflictions.json"

# =========================================================
# SEMANTIC CONSTANTS
# =========================================================

DEFAULT_BUFF_TYPES = {
    "resistance",
    "immunity",
    "buff",
}

# identifier -> (role, palette)
FIXED_ICON_OVERRIDES = {
    # mental / anomaly
    "psychosis": ("mental", "mental-purple"),
    "watchersgaze": ("mental", "mental-purple"),

    # electric
    "electricshock": ("electric", "electric-blue"),
    "emp": ("electric", "electric-blue"),

    # pure status
    "nausea": ("status", "status-gray"),
    "paralysis": ("status", "status-gray"),
    "slowparalysis": ("status", "status-gray"),
    "incrementalstun": ("status", "status-gray"),
    "progressivestun": ("status", "status-gray"),
    "concealed": ("status", "status-gray"),
}

# =========================================================
# HELPERS
# =========================================================

def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() == "true"


def resolve_isbuff(aff: ET.Element) -> bool:
    """
    Determines whether the affliction is a buff.
    Explicit XML attribute has priority.
    """
    if "isbuff" in aff.attrib:
        return parse_bool(aff.attrib.get("isbuff"))

    return aff.attrib.get("type") in DEFAULT_BUFF_TYPES


def remap_texture_path(texture: str) -> str:
    """
    Rewrites Barotrauma UI texture paths for project usage.

    Rule:
      Content/UI/...  -> assets/...

    Everything else is preserved as-is.
    """
    if not texture:
        return ""

    if texture.startswith("Content/UI/"):
        return "assets/" + texture[len("Content/UI/"):]

    return texture


def resolve_icon_semantics(aff: ET.Element) -> dict:
    """
    Resolves semantic icon contract (v2).
    No visual data here.
    """
    aff_id = aff.attrib.get("identifier")
    is_buff = resolve_isbuff(aff)
    aff_type = aff.attrib.get("type")

    if aff_id in FIXED_ICON_OVERRIDES:
        role, palette = FIXED_ICON_OVERRIDES[aff_id]
        return {
            "role": role,
            "colorMode": "static",
            "palette": palette
        }

    if is_buff:
        return {
            "role": "buff",
            "colorMode": "dynamic",
            "palette": "buff"
        }

    if aff_type == "damage":
        return {
            "role": "damage",
            "colorMode": "dynamic",
            "palette": "damage"
        }

    return {
        "role": "debuff",
        "colorMode": "dynamic",
        "palette": "debuff"
    }


def extract_icon_node(aff: ET.Element) -> dict | None:
    """
    Extracts icon atlas data from <icon> node.
    Texture path is remapped but filename is preserved.
    """
    icon_node = aff.find("icon")
    if icon_node is None:
        return None

    texture_raw = icon_node.attrib.get("texture")
    sourcerect = icon_node.attrib.get("sourcerect")

    if not texture_raw or not sourcerect:
        return None

    return {
        "texture": remap_texture_path(texture_raw),
        "sourcerect": sourcerect
    }


def extract_description(_: ET.Element) -> str:
    """
    Descriptions are localized in-game.
    DB keeps them empty by design.
    """
    return ""

# =========================================================
# PARSER
# =========================================================

def parse_afflictions(xml_path: str) -> list[dict]:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    result: list[dict] = []

    for aff in root:
        aff_id = aff.attrib.get("identifier")
        if not aff_id:
            continue

        icon_data = extract_icon_node(aff)
        icon_semantics = resolve_icon_semantics(aff)

        icon = None
        if icon_data:
            icon = {
                **icon_data,
                **icon_semantics
            }

        entry = {
            "id": aff_id,
            "name": aff.attrib.get("name", aff_id),
            "description": extract_description(aff),
            "type": aff.attrib.get("type"),
            "maxstrength": int(aff.attrib.get("maxstrength", "0")),
            "limbspecific": parse_bool(aff.attrib.get("limbspecific")),
            "isbuff": resolve_isbuff(aff),
            "icon": icon
        }

        result.append(entry)

    return result

# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    xml_file = Path(XML_PATH)
    if not xml_file.exists():
        raise FileNotFoundError(f"XML not found: {xml_file}")

    afflictions = parse_afflictions(XML_PATH)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(afflictions, f, indent=2, ensure_ascii=False)

    print(f"✔ Parsed {len(afflictions)} afflictions")
    print(f"✔ Output written to {OUTPUT_JSON}")
