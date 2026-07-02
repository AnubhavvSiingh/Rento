import { Client } from "@elastic/elasticsearch";
import { prisma } from "../database/prisma.js";
import { mapProduct, mapPublicProduct, productIncludes } from "../services/rentoHelpers.js";

const elasticsearchUrl = process.env.ELASTICSEARCH_URL?.trim();
const elasticsearchIndex = process.env.ELASTICSEARCH_INDEX?.trim() || "rento-products";

const client = elasticsearchUrl ? new Client({ node: elasticsearchUrl }) : null;

let indexReady = false;

export type MarketplaceSearchFilters = {
  query?: string;
  category?: string;
  city?: string;
  maxPrice?: number;
  sort?: "recommended" | "price-low" | "price-high";
  approvedOnly?: boolean;
};

type SearchableProduct = Parameters<typeof mapProduct>[0];

export async function syncMarketplaceSearchIndex() {
  if (!client) {
    return;
  }

  await ensureIndex();

  const products = await prisma.product.findMany({
    include: productIncludes(),
    orderBy: { updatedAt: "desc" }
  });

  const operations = products.flatMap((product) => [
    { index: { _index: elasticsearchIndex, _id: product.id } },
    buildSearchDocument(product)
  ]);

  if (operations.length === 0) {
    return;
  }

  await client.bulk({ refresh: true, operations });
}

export async function indexMarketplaceProduct(product: SearchableProduct) {
  if (!client) {
    return;
  }

  try {
    await ensureIndex();
    await client.index({
      index: elasticsearchIndex,
      id: product.id,
      refresh: "wait_for",
      document: buildSearchDocument(product)
    });
  } catch (error) {
    console.warn("Elasticsearch product index update failed:", {
      productId: product.id,
      error
    });
  }
}

export async function searchMarketplaceProducts(filters: MarketplaceSearchFilters) {
  if (client) {
    try {
      await ensureIndex();

      const response = await client.search({
        index: elasticsearchIndex,
        size: 100,
        query: buildElasticQuery(filters),
        sort: buildElasticSort(filters.sort) as unknown as Array<Record<string, "asc" | "desc">>,
        _source: false
      });

      const ids = response.hits.hits
        .map((hit) => (typeof hit._id === "string" ? hit._id : null))
        .filter((id): id is string => Boolean(id));

      if (ids.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: productIncludes()
        });

        const productMap = new Map(products.map((product) => [product.id, mapPublicProduct(product)]));

        return ids
          .map((id) => productMap.get(id))
          .filter((product): product is NonNullable<typeof product> => Boolean(product));
      }
    } catch (error) {
      console.warn("Elasticsearch search failed, falling back to database query:", error);
    }
  }

  return searchProductsFromDatabase(filters);
}

async function searchProductsFromDatabase(filters: MarketplaceSearchFilters) {
  const products = await prisma.product.findMany({
    include: productIncludes(),
    orderBy: { updatedAt: "desc" }
  });

  const normalizedQuery = filters.query?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim();
  const city = filters.city?.trim();
  const maxPrice = typeof filters.maxPrice === "number" ? filters.maxPrice : Number.POSITIVE_INFINITY;
  const approvedOnly = filters.approvedOnly ?? true;

  const filtered = products
    .map(mapPublicProduct)
    .filter((product) => {
      const haystack = [
        product.name,
        product.description,
        product.category,
        product.city,
        product.tags?.join(" ") ?? ""
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesCategory = !category || category === "All" || product.category === category;
      const matchesCity = !city || city === "All" || product.city === city;
      const matchesPrice = product.dailyRate <= maxPrice;
      const matchesApproval =
        !approvedOnly || (product.status === "APPROVED" && product.qaStatus === "APPROVED");

      return matchesQuery && matchesCategory && matchesCity && matchesPrice && matchesApproval;
    });

  return sortProducts(filtered, filters.sort);
}

function buildSearchDocument(product: SearchableProduct) {
  const mapped = mapProduct(product);

  return {
    id: mapped.id,
    name: mapped.name,
    category: mapped.category,
    city: mapped.city,
    dailyRate: mapped.dailyRate,
    deposit: mapped.deposit,
    owner: mapped.owner ?? "",
    description: mapped.description,
    tags: mapped.tags ?? [],
    status: mapped.status,
    qaStatus: mapped.qaStatus,
    searchText: [
      mapped.name,
      mapped.description,
      mapped.category,
      mapped.city,
      mapped.owner,
      mapped.tags?.join(" ") ?? ""
    ]
      .join(" ")
      .toLowerCase(),
    updatedAt: mapped.updatedAt.toISOString()
  };
}

async function ensureIndex() {
  if (!client || indexReady) {
    return;
  }

  const exists = await client.indices.exists({ index: elasticsearchIndex });

  if (!exists) {
    await client.indices.create({
      index: elasticsearchIndex,
      mappings: {
        properties: {
          name: { type: "text" },
          category: { type: "keyword" },
          city: { type: "keyword" },
          dailyRate: { type: "integer" },
          deposit: { type: "integer" },
          owner: { type: "text" },
          description: { type: "text" },
          tags: { type: "keyword" },
          status: { type: "keyword" },
          qaStatus: { type: "keyword" },
          searchText: { type: "text" },
          updatedAt: { type: "date" }
        }
      }
    });
  }

  indexReady = true;
}

function buildElasticQuery(filters: MarketplaceSearchFilters) {
  const should: Array<Record<string, unknown>> = [];
  const filter: Array<Record<string, unknown>> = [];

  if (filters.query?.trim()) {
    should.push({
      multi_match: {
        query: filters.query.trim(),
        fields: ["name^4", "description^3", "tags^2", "category^2", "city^2", "owner^2", "searchText"]
      }
    });
  }

  if (filters.approvedOnly ?? true) {
    filter.push({ term: { status: "APPROVED" } }, { term: { qaStatus: "APPROVED" } });
  }

  if (filters.category && filters.category !== "All") {
    filter.push({ term: { category: filters.category } });
  }

  if (filters.city && filters.city !== "All") {
    filter.push({ term: { city: filters.city } });
  }

  if (typeof filters.maxPrice === "number") {
    filter.push({ range: { dailyRate: { lte: filters.maxPrice } } });
  }

  return {
    bool: {
      must: should.length > 0 ? should : [{ match_all: {} }],
      filter
    }
  };
}

function buildElasticSort(sort: MarketplaceSearchFilters["sort"]) {
  if (sort === "price-low") {
    return [{ dailyRate: "asc" as const }, { updatedAt: "desc" as const }];
  }

  if (sort === "price-high") {
    return [{ dailyRate: "desc" as const }, { updatedAt: "desc" as const }];
  }

  return [{ _score: "desc" as const }, { updatedAt: "desc" as const }];
}

function sortProducts(
  products: ReturnType<typeof mapPublicProduct>[],
  sort?: MarketplaceSearchFilters["sort"]
) {
  const nextProducts = [...products];

  if (sort === "price-low") {
    return nextProducts.sort((left, right) => left.dailyRate - right.dailyRate);
  }

  if (sort === "price-high") {
    return nextProducts.sort((left, right) => right.dailyRate - left.dailyRate);
  }

  return nextProducts.sort((left, right) => left.name.localeCompare(right.name));
}