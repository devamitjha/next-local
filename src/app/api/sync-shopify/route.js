import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { fetchNectorReviews } from "@/lib/nector";

export const dynamic = "force-dynamic";

export async function GET() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE;
  const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });

  try {
    const query = `{ productsCount(query: "status:active") { count } }`;
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ACCESS_TOKEN },
      body: JSON.stringify({ query }),
    });
    const result = await response.json();
    return NextResponse.json({ count: result.data?.productsCount?.count || 0 });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST() {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE;
  const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!SHOPIFY_DOMAIN || !ACCESS_TOKEN) return NextResponse.json({ error: "Missing Shopify credentials" }, { status: 500 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data) => controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      try {
        const client = await clientPromise;
        const db = client.db("next_local_db");
        const productsCollection = db.collection("products");
        
        sendUpdate({ status: "clearing", message: "Preparing database...", progress: 0 });
        await productsCollection.deleteMany({});

        let totalToSync = 0;
        try {
          const countRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products/count.json?status=active`, {
            headers: { "X-Shopify-Access-Token": ACCESS_TOKEN }
          });
          const countData = await countRes.json();
          totalToSync = countData.count || 0;
        } catch (e) { console.error("Count fetch failed", e); }

        let hasNextPage = true;
        let cursor = null;
        let totalProcessed = 0;

        while (hasNextPage) {
          const query = `
            query getProducts($cursor: String) {
              products(first: 10, after: $cursor, query: "status:active") {
                pageInfo { hasNextPage endCursor }
                edges {
                  node {
                    id title handle descriptionHtml vendor productType status tags createdAt
                    featuredImage { url }
                    collections(first: 100) { edges { node { handle } } }
                    shop_for: metafield(namespace: "custom", key: "shop_for") { value }
                    weight: metafield(namespace: "custom", key: "weight") { value }
                    carat_range: metafield(namespace: "custom", key: "carat_range") { value }
                    material_type: metafield(namespace: "ornaverse", key: "material_type") { value }
                    finishing: metafield(namespace: "custom", key: "finishing") { value }
                    fit: metafield(namespace: "custom", key: "fit") { value }
                    matching_products: metafield(namespace: "custom", key: "matching_product") { value }
                    variants(first: 200) {
                      edges {
                        node {
                          id price compareAtPrice inventoryQuantity selectedOptions { name value }
                          image { url }
                          in_store: metafield(namespace: "custom", key: "in_store_available") { value }
                          ring_size: metafield(namespace: "custom", key: "ring_size_inventory") { value }
                          diamond_shape: metafield(namespace: "custom", key: "diamond_1_shape") { value }
                          metal_purity: metafield(namespace: "custom", key: "metal_purity") { value }
                        }
                      }
                    }
                    media(first: 20) {
                      edges {
                        node {
                          mediaContentType
                          ... on MediaImage { image { url altText } }
                        }
                      }
                    }
                  }
                }
              }
            }
          `;

          const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ACCESS_TOKEN },
            body: JSON.stringify({ query, variables: { cursor } }),
          });

          const result = await response.json();
          const products = result.data?.products?.edges || [];

          if (products.length > 0) {
            const mapped = await Promise.all(products.map(async edge => {
              const p = edge.node;
              const variants = p.variants.edges.map(({ node: v }) => {
                const options = {};
                v.selectedOptions.forEach(o => { options[o.name.toLowerCase()] = o.value; });

                let storeArray = [];
                if (v.in_store?.value) {
                  try {
                    const parsed = JSON.parse(v.in_store.value);
                    storeArray = Array.isArray(parsed) ? parsed : [parsed];
                  } catch { storeArray = [v.in_store.value]; }
                }

                return {
                  id: v.id.split("/").pop(),
                  size: options.size || v.ring_size?.value || null,
                  color: options.color || options.colour || options.metal || null,
                  price: Number(v.price),
                  compare_price: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                  inStock: v.inventoryQuantity > 0,
                  image: v.image?.url || p.featuredImage?.url,
                  metafields: {
                    in_store_available: storeArray,
                    ring_size_inventory: v.ring_size?.value,
                    diamond_1_shape: v.diamond_shape?.value,
                    metal_purity: v.metal_purity?.value
                  }
                };
              });

              const images = p.media.edges
                .filter(m => m.node.mediaContentType === "IMAGE")
                .map(m => ({ url: m.node.image.url, alt: m.node.image.altText || "" }));

              const firstVar = variants[0];
              const reviewsData = await fetchNectorReviews(p.id);

              let matchingIds = [];
              if (p.matching_products?.value) {
                try {
                  const parsed = JSON.parse(p.matching_products.value);
                  matchingIds = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  matchingIds = [p.matching_products.value];
                }
              }

              return {
                id: p.id.split("/").pop(),
                shopifyId: p.id,
                title: p.title,
                handle: p.handle,
                description: p.descriptionHtml,
                vendor: p.vendor,
                type: p.productType,
                status: p.status,
                tags: p.tags,
                createdAt: p.createdAt,
                image: p.featuredImage?.url || (images.length > 0 ? images[0].url : null),
                images: images,
                price: firstVar?.price || 0,
                compare_price: firstVar?.compare_price || null,
                selectedColor: firstVar?.color,
                colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
                variants: variants,
                reviews: reviewsData.count > 0 ? reviewsData : null,
                collectionHandles: p.collections.edges.map(e => e.node.handle),
                matchingProductIds: matchingIds,
                productMetafields: {
                  shop_for: p.shop_for?.value,
                  weight: p.weight?.value,
                  carat_range: p.carat_range?.value,
                  material_type: p.material_type?.value,
                  finishing: p.finishing?.value,
                  fit: p.fit?.value
                },
                lastUpdated: new Date()
              };
            }));

            await productsCollection.insertMany(mapped);
            totalProcessed += products.length;
            const progressPercent = totalToSync > 0 ? Math.round((totalProcessed / totalToSync) * 100) : 0;
            sendUpdate({ 
              status: "progress", 
              message: `Processed ${totalProcessed} products...`, 
              count: totalProcessed,
              progress: Math.min(progressPercent, 99)
            });
          }
          hasNextPage = result.data?.products?.pageInfo?.hasNextPage;
          cursor = result.data?.products?.pageInfo?.endCursor;
        }
        sendUpdate({ status: "complete", message: `Sync Complete!`, count: totalProcessed, progress: 100 });
        controller.close();
      } catch (error) {
        sendUpdate({ status: "error", message: error.message });
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
}
