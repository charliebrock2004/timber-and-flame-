import { FIREWOOD_SECTIONS, WOOD_OPTION_LABEL } from "@/config/catalog";
import type { PublicProduct } from "@/lib/catalog";

export type FirewoodOption = {
  product: PublicProduct;
  /** Wood-type label shown on the selector, e.g. "Softwood" or "Part-seasoned softwood". */
  label: string;
};

export type FirewoodGroupView = {
  id: string;
  name: string;
  options: FirewoodOption[];
};

export type FirewoodSectionView = {
  id: string;
  heading: string;
  note: string;
  groups: FirewoodGroupView[];
};

/**
 * Splits the live catalogue into the two firewood sections (fully seasoned
 * first) and everything else. Prices come from the products themselves —
 * this never invents a price. An option that isn't in the live list (turned
 * off in admin) is left out. A group with no live options is hidden.
 */
export function arrangeCatalogue(products: PublicProduct[]): {
  sections: FirewoodSectionView[];
  other: PublicProduct[];
} {
  const byId = new Map(products.map((p) => [p.id, p]));
  const used = new Set<string>();

  const sections = FIREWOOD_SECTIONS.map((section) => ({
    id: section.id,
    heading: section.heading,
    note: section.note,
    groups: section.groups
      .map((group) => ({
        id: group.id,
        name: group.name,
        options: group.optionIds.flatMap((id) => {
          const product = byId.get(id);
          if (!product) return [];
          used.add(id);
          return [{ product, label: WOOD_OPTION_LABEL[id] ?? product.name }];
        }),
      }))
      .filter((group) => group.options.length > 0),
  })).filter((section) => section.groups.length > 0);

  return { sections, other: products.filter((p) => !used.has(p.id)) };
}
