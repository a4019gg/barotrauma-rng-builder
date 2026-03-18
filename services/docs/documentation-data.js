import { hasDocKey } from "./docs-loc.js";

/**
 * @typedef {Object} DocSection
 * @property {string} titleKey
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

function buildStructuredSections(baseKey, config = {}) {
  const sections = [
    {
      titleKey: "docs.ui.section.whatThisIs",
      contentKey: `${baseKey}.whatThisIs`
    },
    {
      titleKey: "docs.ui.section.whereToUse",
      contentKey: `${baseKey}.whereToUse`,
      listKeys: config.whereToUseListKeys
    },
    {
      titleKey: "docs.ui.section.howItWorks",
      contentKey: `${baseKey}.howItWorks`,
      listKeys: config.howItWorksListKeys,
      definitions: config.howItWorksDefinitions
    }
  ];

  if (config.exampleContentKey || config.exampleListKeys || config.exampleCode) {
    sections.push({
      titleKey: "docs.ui.section.example",
      contentKey: config.exampleContentKey,
      listKeys: config.exampleListKeys,
      codeExample: config.exampleCode
    });
  }

  if (config.commonMistakeListKeys?.length) {
    sections.push({
      titleKey: "docs.ui.section.commonMistakes",
      listKeys: config.commonMistakeListKeys
    });
  }

  return sections;
}

const def = (termKey, descriptionKey) => ({ termKey, descriptionKey });
const keys = (baseKey, prefix, count) => Array.from({ length: count }, (_, index) => `${baseKey}.${prefix}${index + 1}`);

/** @type {DocArticle[]} */
export const documentationArticles = [
  {
    id: "getting-started",
    category: "basic",
    group: "quickstart",
    titleKey: "docs.quickstart.title",
    sections: buildStructuredSections("docs.quickstart", {
      whereToUseListKeys: keys("docs.quickstart", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.quickstart", "howItWorksPoint", 4),
      exampleListKeys: keys("docs.quickstart", "exampleStep", 5),
      commonMistakeListKeys: keys("docs.quickstart", "mistake", 3)
    })
  },
  {
    id: "eventset-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.eventset.title",
    sections: buildStructuredSections("docs.concepts.eventset", {
      whereToUseListKeys: keys("docs.concepts.eventset", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.concepts.eventset", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.concepts.eventset", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.concepts.eventset", "mistake", 2)
    })
  },
  {
    id: "event-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.event.title",
    sections: buildStructuredSections("docs.concepts.event", {
      whereToUseListKeys: keys("docs.concepts.event", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.concepts.event", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.concepts.event", "exampleLine", 2),
      commonMistakeListKeys: keys("docs.concepts.event", "mistake", 2)
    })
  },
  {
    id: "rng-concept",
    category: "basic",
    group: "concepts",
    titleKey: "docs.concepts.rng.title",
    sections: buildStructuredSections("docs.concepts.rng", {
      whereToUseListKeys: keys("docs.concepts.rng", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.concepts.rng", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.concepts.rng", "exampleLine", 4),
      commonMistakeListKeys: keys("docs.concepts.rng", "mistake", 2)
    })
  },
  {
    id: "rng-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.rng.title",
    sections: buildStructuredSections("docs.nodes.rng", {
      whereToUseListKeys: keys("docs.nodes.rng", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.rng", "howItWorksPoint", 2),
      exampleListKeys: keys("docs.nodes.rng", "exampleLine", 4),
      commonMistakeListKeys: keys("docs.nodes.rng", "mistake", 2)
    })
  },
  {
    id: "eventset-node",
    category: "advanced",
    group: "nodes",
    titleKey: "docs.nodes.eventset.title",
    sections: buildStructuredSections("docs.nodes.eventset", {
      whereToUseListKeys: keys("docs.nodes.eventset", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.eventset", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.nodes.eventset", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.nodes.eventset", "mistake", 2)
    })
  },
  {
    id: "event-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.event.title",
    sections: buildStructuredSections("docs.nodes.event", {
      whereToUseListKeys: keys("docs.nodes.event", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.event", "howItWorksPoint", 2),
      exampleListKeys: keys("docs.nodes.event", "exampleLine", 2),
      commonMistakeListKeys: keys("docs.nodes.event", "mistake", 2)
    })
  },
  {
    id: "item-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.item.title",
    sections: buildStructuredSections("docs.nodes.item", {
      whereToUseListKeys: keys("docs.nodes.item", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.item", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.nodes.item", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.nodes.item", "mistake", 2)
    })
  },
  {
    id: "creature-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.creature.title",
    sections: buildStructuredSections("docs.nodes.creature", {
      whereToUseListKeys: keys("docs.nodes.creature", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.creature", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.nodes.creature", "exampleLine", 2),
      commonMistakeListKeys: keys("docs.nodes.creature", "mistake", 2)
    })
  },
  {
    id: "affliction-node",
    category: "basic",
    group: "nodes",
    titleKey: "docs.nodes.affliction.title",
    sections: buildStructuredSections("docs.nodes.affliction", {
      whereToUseListKeys: keys("docs.nodes.affliction", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.nodes.affliction", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.nodes.affliction", "exampleLine", 2),
      commonMistakeListKeys: keys("docs.nodes.affliction", "mistake", 2)
    })
  },
  {
    id: "simple-rng",
    category: "basic",
    group: "examples",
    titleKey: "docs.examples.simpleRng.title",
    sections: buildStructuredSections("docs.examples.simpleRng", {
      whereToUseListKeys: keys("docs.examples.simpleRng", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.examples.simpleRng", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.examples.simpleRng", "exampleLine", 4),
      commonMistakeListKeys: keys("docs.examples.simpleRng", "mistake", 2)
    })
  },
  {
    id: "ambush",
    category: "basic",
    group: "examples",
    titleKey: "docs.examples.ambush.title",
    sections: buildStructuredSections("docs.examples.ambush", {
      whereToUseListKeys: keys("docs.examples.ambush", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.examples.ambush", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.examples.ambush", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.examples.ambush", "mistake", 2)
    })
  },
  {
    id: "nested-rng",
    category: "advanced",
    group: "examples",
    titleKey: "docs.examples.nestedRng.title",
    sections: buildStructuredSections("docs.examples.nestedRng", {
      whereToUseListKeys: keys("docs.examples.nestedRng", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.examples.nestedRng", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.examples.nestedRng", "exampleLine", 5),
      commonMistakeListKeys: keys("docs.examples.nestedRng", "mistake", 2)
    })
  },
  {
    id: "basic-intermediate-advanced",
    category: "basic",
    group: "modes",
    titleKey: "docs.modes.title",
    sections: buildStructuredSections("docs.modes", {
      whereToUseListKeys: keys("docs.modes", "whereToUseExample", 3),
      howItWorksDefinitions: [
        def("docs.modes.basic.term", "docs.modes.basic.description"),
        def("docs.modes.intermediate.term", "docs.modes.intermediate.description"),
        def("docs.modes.advanced.term", "docs.modes.advanced.description")
      ],
      exampleListKeys: keys("docs.modes", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.modes", "mistake", 2)
    })
  },
  {
    id: "troubleshooting",
    category: "basic",
    group: "faq",
    titleKey: "docs.faq.troubleshooting.title",
    sections: buildStructuredSections("docs.faq.troubleshooting", {
      whereToUseListKeys: keys("docs.faq.troubleshooting", "whereToUseExample", 3),
      howItWorksDefinitions: [
        def("docs.faq.trigger.question", "docs.faq.trigger.answer"),
        def("docs.faq.rng.question", "docs.faq.rng.answer")
      ],
      exampleListKeys: keys("docs.faq.troubleshooting", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.faq.troubleshooting", "mistake", 2)
    })
  },
  {
    id: "eventset-deep-dive",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.eventset.title",
    sections: buildStructuredSections("docs.advanced.eventset", {
      whereToUseListKeys: keys("docs.advanced.eventset", "whereToUseExample", 3),
      howItWorksDefinitions: [
        def("chooserandom", "docs.advanced.eventset.chooserandom"),
        def("eventcount", "docs.advanced.eventset.eventcount"),
        def("min/max intensity", "docs.advanced.eventset.intensity"),
        def("min/max difficulty", "docs.advanced.eventset.difficulty"),
        def("mindistancetraveled / minmissiontime", "docs.advanced.eventset.progression"),
        def("allowatstart", "docs.advanced.eventset.allowatstart"),
        def("perwreck / perruin / percave", "docs.advanced.eventset.perstructure"),
        def("ignorecooldown", "docs.advanced.eventset.ignorecooldown"),
        def("triggereventcooldown", "docs.advanced.eventset.triggereventcooldown")
      ],
      exampleListKeys: keys("docs.advanced.eventset", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.advanced.eventset", "mistake", 2)
    })
  },
  {
    id: "rng-probability",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.rng.title",
    sections: buildStructuredSections("docs.advanced.rng", {
      whereToUseListKeys: keys("docs.advanced.rng", "whereToUseExample", 3),
      howItWorksListKeys: keys("docs.advanced.rng", "howItWorksPoint", 3),
      exampleListKeys: keys("docs.advanced.rng", "exampleLine", 5),
      commonMistakeListKeys: keys("docs.advanced.rng", "mistake", 2)
    })
  },
  {
    id: "spawning-system",
    category: "advanced",
    group: "advanced",
    titleKey: "docs.advanced.spawning.title",
    sections: buildStructuredSections("docs.advanced.spawning", {
      whereToUseListKeys: keys("docs.advanced.spawning", "whereToUseExample", 3),
      howItWorksDefinitions: [
        def("docs.advanced.spawning.term1", "docs.advanced.spawning.point1"),
        def("docs.advanced.spawning.term2", "docs.advanced.spawning.point2"),
        def("docs.advanced.spawning.term3", "docs.advanced.spawning.point3"),
        def("docs.advanced.spawning.term4", "docs.advanced.spawning.point4"),
        def("docs.advanced.spawning.term5", "docs.advanced.spawning.point5")
      ],
      exampleListKeys: keys("docs.advanced.spawning", "exampleLine", 3),
      commonMistakeListKeys: keys("docs.advanced.spawning", "mistake", 2)
    })
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
