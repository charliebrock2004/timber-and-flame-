import { ProductCard } from "./product-card";
import { FirewoodGroupCard } from "./firewood-group-card";
import { arrangeCatalogue } from "@/lib/firewood-groups";
import type { PublicProduct } from "@/lib/catalog";

/**
 * Firewood first: fully seasoned, then part-seasoned, then the other products.
 * `level` is the heading level for a section title. Group and product titles
 * sit one level below it.
 */
export function ProductCatalogue({ products, level = 2 }: { products: PublicProduct[]; level?: 2 | 3 }) {
  const { sections, other } = arrangeCatalogue(products);
  const Section = level === 2 ? "h2" : "h3";
  const titleAs = level === 2 ? "h3" : "h4";

  return (
    <div className="mt-8 flex flex-col gap-12">
      {sections.map((section, sectionIndex) => {
        const part = section.id === "part-seasoned";
        return (
          <section
            key={section.id}
            aria-labelledby={`${section.id}-heading`}
            className={part ? "border-amber bg-cream-200/70 rounded-2xl border-2 p-4 md:p-6" : undefined}
          >
            <Section id={`${section.id}-heading`} className="label text-ink text-3xl font-semibold tracking-wide md:text-4xl">
              {section.heading}
            </Section>
            <p className={`mt-2 max-w-2xl ${part ? "text-ink font-semibold" : "text-ink-soft"}`}>{section.note}</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {section.groups.map((group, groupIndex) => (
                <FirewoodGroupCard
                  key={group.id}
                  name={group.name}
                  options={group.options}
                  priority={sectionIndex === 0 && groupIndex === 0}
                  titleAs={titleAs}
                />
              ))}
            </div>
          </section>
        );
      })}

      {other.length > 0 && (
        <section aria-labelledby="other-products-heading">
          <Section id="other-products-heading" className="label text-ink text-2xl font-semibold tracking-wide md:text-3xl">
            Also available
          </Section>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((product) => (
              <ProductCard key={product.id} product={product} titleAs={titleAs} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
