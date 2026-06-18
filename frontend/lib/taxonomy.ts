export const filterChips = [
  "Church-wide use",
  "Internal ministry",
  "Photo",
  "Video",
  "Graphic",
  "No people",
  "Adults only",
  "Children/youth",
  "Worship",
  "Teaching",
  "Fellowship",
  "Seasonal",
  "2026"
];

export const featuredCollections = [
  {
    name: "Sabbath",
    description: "Worship, service, and church life",
    searchQuery: "Bible worship fellowship",
    terms: ["sabbath", "worship", "bible", "scripture", "church", "service", "sermon", "fellowship"]
  },
  {
    name: "Teaching & Study",
    description: "Bible study, lessons, and teaching details",
    searchQuery: "Bible teaching study",
    terms: ["teaching", "study", "bible", "scripture", "lesson"]
  },
  {
    name: "Seasonal Details",
    description: "Flowers, plants, and ministry textures",
    searchQuery: "flowers seasonal plant",
    terms: ["seasonal", "flower", "flowers", "plant", "detail"]
  },
  {
    name: "Welcome Team",
    description: "Hospitality and gathering details",
    searchQuery: "welcome fellowship church",
    terms: ["welcome", "fellowship", "church", "people", "hospitality"]
  },
  {
    name: "Fellowship",
    description: "Church life and ministry gathering",
    searchQuery: "fellowship church life",
    terms: ["fellowship", "church life", "gathering", "people"]
  },
  {
    name: "Website Graphics",
    description: "Graphics, slides, and web-ready assets",
    searchQuery: "graphic slide website",
    terms: ["graphic", "graphics", "slide", "website", "stage"]
  },
  {
    name: "Approved Public",
    description: "Cleared for church-wide use",
    searchQuery: "Approved Public",
    terms: ["approved public", "public"]
  },
  {
    name: "Recently Approved",
    description: "Freshly reviewed assets",
    searchQuery: "",
    terms: ["recently approved", "approved"]
  }
];

export const canonicalTags = {
  visibleTags: ["Bible", "book", "flower", "plant", "fountain", "water", "stage", "people", "landscape", "choir", "classroom", "warm", "welcoming"],
  tjcTerms: ["Sabbath Service", "Religious Education", "Evangelical Service", "Testimony", "Hymns of Praise", "worship", "Bible study", "fellowship", "teaching", "welcome", "baptism", "prayer", "hymn"]
};

export type TaxonomyAliasGroup = {
  canonical: string;
  aliases: string[];
  searchBoosts?: string[];
  filters?: string[];
};

export type TaxonomyGovernanceTerm = {
  canonical: string;
  aliases: string[];
  deprecatedTerms: string[];
  forbiddenTerms: string[];
  sensitiveMapping?: string;
  ministryMapping: string;
  ownerNotes: string;
};

export const taxonomyGovernanceTerms: TaxonomyGovernanceTerm[] = [
  {
    canonical: "Sabbath Service",
    aliases: ["sabbath", "sabbath worship", "church service", "service"],
    deprecatedTerms: ["Sunday service", "weekend service"],
    forbiddenTerms: ["generic church event"],
    sensitiveMapping: "sacrament-sensitive when communion, baptism, footwashing, or altar prayer is visible",
    ministryMapping: "Worship / Service",
    ownerNotes: "Use specific service context when known; generic worship alone weakens review routing."
  },
  {
    canonical: "Religious Education",
    aliases: ["RE", "children class", "youth class", "lesson"],
    deprecatedTerms: ["kids stuff", "children event"],
    forbiddenTerms: ["child promo", "minor marketing"],
    sensitiveMapping: "youth-sensitive",
    ministryMapping: "Religious Education",
    ownerNotes: "Youth and possible-minor terms require consent and reviewer confirmation before public use."
  },
  {
    canonical: "Hymns of Praise",
    aliases: ["hymn", "hymnal", "music", "singing", "choir", "song"],
    deprecatedTerms: ["background music", "generic song"],
    forbiddenTerms: ["free music", "copyright-free"],
    sensitiveMapping: "music/teaching rights",
    ministryMapping: "Music Ministry",
    ownerNotes: "Music terms route to rights review; do not imply license clearance from taxonomy."
  },
  {
    canonical: "Testimony",
    aliases: ["personal testimony", "healing", "illness", "vision", "family conversion"],
    deprecatedTerms: ["storytime", "personal story"],
    forbiddenTerms: ["medical claim", "trauma content"],
    sensitiveMapping: "testimony-sensitive",
    ministryMapping: "Pastoral / Testimony",
    ownerNotes: "Private, pastoral, illness, grief, and testimony contexts default to review-required."
  },
  {
    canonical: "Baptism",
    aliases: ["water baptism", "sacrament"],
    deprecatedTerms: ["pool event", "water ceremony"],
    forbiddenTerms: ["stock baptism"],
    sensitiveMapping: "sacrament-sensitive",
    ministryMapping: "Sacrament",
    ownerNotes: "Sacrament images need doctrinal and pastoral context review before broad reuse."
  },
  {
    canonical: "Bible Study",
    aliases: ["study", "lesson", "class", "teaching", "scripture study"],
    deprecatedTerms: ["school", "classroom only"],
    forbiddenTerms: ["generic education stock"],
    sensitiveMapping: "teaching rights when sermon, slide, or publication material is visible",
    ministryMapping: "Teaching",
    ownerNotes: "Teaching labels should separate visible Bible object from actual teaching-content rights."
  },
  {
    canonical: "Fellowship",
    aliases: ["church life", "gathering", "meal", "potluck", "community"],
    deprecatedTerms: ["party", "hangout"],
    forbiddenTerms: ["public event crowd"],
    sensitiveMapping: "member-sensitive when people are identifiable",
    ministryMapping: "Fellowship",
    ownerNotes: "People-visible fellowship media may be internal-only even when event seems ordinary."
  },
  {
    canonical: "Stock-safe",
    aliases: ["portal ready", "broad reuse", "ready to use", "reusable library media"],
    deprecatedTerms: ["approved everything", "no review needed"],
    forbiddenTerms: ["rights guaranteed", "master available"],
    sensitiveMapping: "public-safe only after rights, people, review, and derivative checks pass",
    ministryMapping: "Reuse Clearance",
    ownerNotes: "Never tag source-only or unreviewed media as stock-safe."
  }
];

export type TaxonomyHealthSummary = {
  canonicalLabels: string[];
  aliasCount: number;
  deprecatedTerms: string[];
  forbiddenTerms: string[];
  sensitiveMinistryMappings: Array<{ canonical: string; sensitiveMapping?: string; ministryMapping: string }>;
  ownerNotes: Array<{ canonical: string; note: string }>;
};

export function taxonomyHealthSummary(): TaxonomyHealthSummary {
  return {
    canonicalLabels: taxonomyGovernanceTerms.map((term) => term.canonical),
    aliasCount: taxonomyGovernanceTerms.reduce((sum, term) => sum + term.aliases.length, 0),
    deprecatedTerms: taxonomyGovernanceTerms.flatMap((term) => term.deprecatedTerms),
    forbiddenTerms: taxonomyGovernanceTerms.flatMap((term) => term.forbiddenTerms),
    sensitiveMinistryMappings: taxonomyGovernanceTerms.map((term) => ({
      canonical: term.canonical,
      sensitiveMapping: term.sensitiveMapping,
      ministryMapping: term.ministryMapping
    })),
    ownerNotes: taxonomyGovernanceTerms.map((term) => ({ canonical: term.canonical, note: term.ownerNotes }))
  };
}

export function taxonomyGovernanceForRole(role: "Viewer" | "Contributor" | "Reviewer" | "DAM Admin") {
  if (role !== "DAM Admin") {
    return {
      terms: taxonomyGovernanceTerms.map(({ canonical, aliases, ministryMapping }) => ({ canonical, aliases, ministryMapping })),
      health: {
        canonicalLabels: taxonomyGovernanceTerms.map((term) => term.canonical),
        aliasCount: taxonomyGovernanceTerms.reduce((sum, term) => sum + term.aliases.length, 0),
        deprecatedTerms: [],
        forbiddenTerms: [],
        sensitiveMinistryMappings: [],
        ownerNotes: []
      } satisfies TaxonomyHealthSummary
    };
  }
  return {
    terms: taxonomyGovernanceTerms,
    health: taxonomyHealthSummary()
  };
}

export const taxonomyAliasGroups: TaxonomyAliasGroup[] = [
  {
    canonical: "Bible",
    aliases: ["scripture", "open bible", "word of god", "word", "book"],
    searchBoosts: ["teaching", "study", "sermon", "slide"]
  },
  {
    canonical: "worship",
    aliases: ["service", "sabbath", "sabbath service", "church service", "praise", "sanctuary"],
    searchBoosts: ["stage", "sermon", "hymn", "prayer"]
  },
  {
    canonical: "Sabbath Service",
    aliases: ["sabbath", "sabbath worship", "service", "church service"],
    searchBoosts: ["worship", "Bible", "fellowship", "sermon"],
    filters: ["worship"]
  },
  {
    canonical: "Bible study",
    aliases: ["study", "lesson", "class", "teaching", "religious education", "re"],
    searchBoosts: ["Bible", "scripture", "sermon", "slide"]
  },
  {
    canonical: "Religious Education",
    aliases: ["re", "religious ed", "religious education", "children class", "lesson"],
    searchBoosts: ["Bible study", "teaching", "children/youth", "classroom"],
    filters: ["teaching"]
  },
  {
    canonical: "fellowship",
    aliases: ["church life", "gathering", "meal", "potluck", "community"],
    searchBoosts: ["welcome", "hospitality", "people"]
  },
  {
    canonical: "welcome",
    aliases: ["hospitality", "greeter", "visitors", "entrance", "front desk"],
    searchBoosts: ["fellowship", "church life", "people"]
  },
  {
    canonical: "baptism",
    aliases: ["water baptism", "sacrament", "testimony"],
    searchBoosts: ["water", "worship", "review"]
  },
  {
    canonical: "Evangelical Service",
    aliases: ["evangelical", "evangelism", "gospel service", "outreach", "evangelical service"],
    searchBoosts: ["worship", "testimony", "welcome"],
    filters: ["worship"]
  },
  {
    canonical: "Testimony",
    aliases: ["testimony", "personal testimony", "healing", "illness", "vision", "spiritual battle", "family conversion"],
    searchBoosts: ["review", "context-safe", "sensitive"],
    filters: ["needs review"]
  },
  {
    canonical: "prayer",
    aliases: ["pray", "kneeling", "altar", "spiritual practice"],
    searchBoosts: ["worship", "service", "review"]
  },
  {
    canonical: "hymn",
    aliases: ["hymnal", "music", "singing", "choir", "song", "hymns of praise"],
    searchBoosts: ["worship", "service", "stage"]
  },
  {
    canonical: "Hymns of Praise",
    aliases: ["hymn", "hymnal", "music", "singing", "choir", "song"],
    searchBoosts: ["worship", "service", "stage", "rights review"],
    filters: ["needs review"]
  },
  {
    canonical: "stock-safe",
    aliases: ["portal ready", "public approved", "broad reuse", "ready to use", "reusable library media"],
    searchBoosts: ["Approved Public", "Public", "website", "newsletter"],
    filters: ["approved public", "portal ready"]
  },
  {
    canonical: "context-safe",
    aliases: ["original context", "limited channel", "internal use", "review before reuse"],
    searchBoosts: ["Needs Review", "Internal", "sensitive"],
    filters: ["needs review"]
  },
  {
    canonical: "archive-only",
    aliases: ["archive", "historical record", "preservation", "reference only", "archive only"],
    searchBoosts: ["Searchable Archive", "Archive Only"],
    filters: ["archive only"]
  },
  {
    canonical: "children/youth",
    aliases: ["children", "kids", "youth", "teen", "teens", "minor", "minors", "student", "students"],
    searchBoosts: ["people", "possible minors", "review"],
    filters: ["children/youth", "needs review"]
  },
  {
    canonical: "landscape",
    aliases: ["wide", "horizontal", "banner", "hero", "header", "background"],
    searchBoosts: ["website", "slide", "no people"],
    filters: ["landscape", "no people"]
  },
  {
    canonical: "stage",
    aliases: ["platform", "pulpit", "podium", "sanctuary front"],
    searchBoosts: ["worship", "sermon", "slide"]
  },
  {
    canonical: "flower",
    aliases: ["flowers", "floral", "arrangement", "seasonal detail", "decoration"],
    searchBoosts: ["plant", "detail", "newsletter", "background"]
  }
];
