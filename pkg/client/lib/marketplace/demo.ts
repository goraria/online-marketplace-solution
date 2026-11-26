import { Faker, en } from "@faker-js/faker"

import type { ProductSummary } from "@/lib/marketplace/types"

export const demoStoreCategories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Home & Living", slug: "home-living" },
  { name: "Fashion", slug: "fashion" },
  { name: "Beauty", slug: "beauty" },
  { name: "Outdoor", slug: "outdoor" },
] as const

export interface DemoProduct extends ProductSummary {
  demoCategory: string
  popularity: number
}

export interface DemoReview {
  id: string
  author: string
  title: string
  body: string
  product: string
  rating: number
  daysAgo: number
}

function seededFaker(slug: string) {
  const seed = [...slug].reduce((value, character) =>
    Math.imul(value, 31) + character.charCodeAt(0) | 0, 7)
  const faker = new Faker({ locale: [en] })
  faker.seed(seed)
  return faker
}

export function demoStoreProducts(slug: string, storeName: string): DemoProduct[] {
  const faker = seededFaker(`${slug}:product`)
  return Array.from({ length: 120 }, (_, index) => {
    const id = `demo-${slug}-${index + 1}`
    return {
      id,
      slug: id,
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      kind: "physical",
      brandName: null,
      listingId: id,
      listingVariantId: id,
      price: faker.number.int({ min: 90_000, max: 2_500_000 }),
      compareAtPrice: null,
      currency: "VND",
      storeId: slug,
      storeName,
      storeSlug: slug,
      mediaId: null,
      mediaAlt: null,
      publishedAt: null,
      demoCategory: demoStoreCategories[index % demoStoreCategories.length].slug,
      popularity: faker.number.int({ min: 0, max: 100_000 }),
    }
  })
}

export function demoStoreReviews(slug: string): DemoReview[] {
  const faker = seededFaker(`${slug}:review`)
  return Array.from({ length: 18 }, (_, index) => ({
    id: `${slug}-review-${index + 1}`,
    author: faker.person.fullName(),
    title: faker.lorem.sentence({ min: 3, max: 7 }),
    body: faker.lorem.sentences({ min: 2, max: 4 }),
    product: faker.commerce.productName(),
    rating: faker.number.int({ min: 3, max: 5 }),
    daysAgo: faker.number.int({ min: 1, max: 120 }),
  }))
}
