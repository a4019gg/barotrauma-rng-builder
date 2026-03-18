import { hasDocKey } from "./docs-loc.js";

/**
 * @typedef {Object} DocSection
 * @property {string=} titleKey
 * @property {string=} contentKey
 * @property {string[]=} listKeys
 * @property {string=} codeExample
 * @property {Array<{termKey: string, descriptionKey: string}>=} definitions
 */

/**
 * @typedef {Object} DocArticle
 * @property {string} id
 * @property {"basic"|"advanced"} category
 * @property {"quickstart"|"concepts"|"nodes"|"examples"|"modes"|"faq"|"advanced"} group
 * @property {string} titleKey
 * @property {DocSection[]} sections
 */

/** @type {DocArticle[]} */
export const documentationArticles = [
  {
    id: "getting-started",
    category: "basic",
    group: "quickstart",
    titleKey: "docs.quickstart.title",
    sections: [
      {
        contentKey: "docs.quickstart.description"
      },
      {
        titleKey: "docs.quickstart.stepsTitle",
        listKeys: [
          "docs.quickstart.step1",
          "docs.quickstart.step2",
          "docs.quickstart.step3",
          "docs.quickstart.step4",
          "docs.quickstart.step5"
        ]
      }
    ]
  },
  {
    id: "eventset-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.eventset.title",
    sections: [{ contentKey: "docs.concepts.eventset.content" }]
  },
  {
    id: "event-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.event.title",
    sections: [{ contentKey: "docs.concepts.event.content" }]
  },
  {
    id: "rng-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.rng.title",
    sections: [{ contentKey: "docs.concepts.rng.content" }]
  },
  {
    id: "rng-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.rng.title",
    sections: [{ listKeys: ["docs.nodes.rng.point1", "docs.nodes.rng.point2"] }]
  },
  {
    id: "eventset-node",
    category: "advanced",
    group: "nodes",
    titleKey: "docs.nodes.eventset.title",
    sections: [{ listKeys: ["docs.nodes.eventset.point1", "docs.nodes.eventset.point2"] }]
  },
  {
    id: "event-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.event.title",
    sections: [{ listKeys: ["docs.nodes.event.point1"] }]
  },
  {
    id: "item-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.item.title",
    sections: [{ listKeys: ["docs.nodes.item.point1"] }]
  },
  {
    id: "creature-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.creature.title",
    sections: [{ listKeys: ["docs.nodes.creature.point1"] }]
  },
  {
    id: "affliction-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.affliction.title",
    sections: [{ listKeys: ["docs.nodes.affliction.point1"] }]
  },
  {
    id: "simple-rng",
    category: "basic",
    group: "examples",
    titleKey: "docs.examples.simpleRng.title",
    sections: [{ contentKey: "docs.examples.simpleRng.content" }]
  },
  {
    id: "ambush",
    category: "basic",
    group: "examples",
    titleKey: "docs.examples.ambush.title",
    sections: [{ contentKey: "docs.examples.ambush.content" }]
  },
  {
    id: "nested-rng",
    category: "advanced",
    group: "examples",
    titleKey: "docs.examples.nestedRng.title",
    sections: [{ contentKey: "docs.examples.nestedRng.content" }]
  },
  {
    id: "basic-intermediate-advanced",
    category: "basic",
    group: "modes",
    titleKey: "docs.modes.title",
    sections: [{ listKeys: ["docs.modes.basic", "docs.modes.intermediate", "docs.modes.advanced"] }]
  },
  {
    id: "troubleshooting",
    category: "basic",
    group: "faq",
    titleKey: "docs.faq.troubleshooting.title",
    sections: [
      {
        definitions: [
          { termKey: "docs.faq.trigger.question", descriptionKey: "docs.faq.trigger.answer" },
          { termKey: "docs.faq.rng.question", descriptionKey: "docs.faq.rng.answer" }
        ]
      }
    ]
  },
  {
    id: "eventset-deep-dive",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.eventset.title",
    sections: [
      {
        definitions: [
          { termKey: "chooserandom", descriptionKey: "docs.advanced.eventset.chooserandom" },
          { termKey: "eventcount", descriptionKey: "docs.advanced.eventset.eventcount" },
          { termKey: "min/max intensity", descriptionKey: "docs.advanced.eventset.intensity" },
          { termKey: "min/max difficulty", descriptionKey: "docs.advanced.eventset.difficulty" },
          { termKey: "allowatstart", descriptionKey: "docs.advanced.eventset.allowatstart" },
          { termKey: "perwreck / perruin / percave", descriptionKey: "docs.advanced.eventset.perstructure" },
          { termKey: "ignorecooldown", descriptionKey: "docs.advanced.eventset.ignorecooldown" },
          { termKey: "triggereventcooldown", descriptionKey: "docs.advanced.eventset.triggereventcooldown" }
        ]
      }
    ]
  },
  {
    id: "rng-probability",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.rng.title",
    sections: [{ listKeys: ["docs.advanced.rng.point1", "docs.advanced.rng.point2", "docs.advanced.rng.point3"] }]
  },
  {
    id: "spawning-system",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.spawning.title",
    sections: [{ listKeys: ["docs.advanced.spawning.point1", "docs.advanced.spawning.point2", "docs.advanced.spawning.point3", "docs.advanced.spawning.point4", "docs.advanced.spawning.point5"] }]
  }
];

export const documentationGroups = [
  "quickstart",
  "concepts",
  "nodes",
  "examples",
  "modes",
  "faq",
  "advanced"
];

export function getAllDocumentationArticles() {
  return documentationArticles.map(article => ({
    ...article,
    sections: article.sections.map(section => ({
      ...section,
      listKeys: section.listKeys ? [...section.listKeys] : undefined,
      definitions: section.definitions ? section.definitions.map(definition => ({ ...definition })) : undefined
    }))
  }));
}

export function validateDocumentationData(lang = "en") {
  const missingKeys = [];
  documentationArticles.forEach(article => {
    if (!hasDocKey(article.titleKey, lang)) missingKeys.push(article.titleKey);
    article.sections.forEach(section => {
      if (section.titleKey && !hasDocKey(section.titleKey, lang)) missingKeys.push(section.titleKey);
      if (section.contentKey && !hasDocKey(section.contentKey, lang)) missingKeys.push(section.contentKey);
      (section.listKeys || []).forEach(key => {
        if (!hasDocKey(key, lang)) missingKeys.push(key);
      });
      (section.definitions || []).forEach(definition => {
        if (definition.termKey.includes("docs.") && !hasDocKey(definition.termKey, lang)) missingKeys.push(definition.termKey);
        if (!hasDocKey(definition.descriptionKey, lang)) missingKeys.push(definition.descriptionKey);
      });
    });
  });
  return [...new Set(missingKeys)];
}
