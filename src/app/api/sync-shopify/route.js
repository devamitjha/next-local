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
        
        sendUpdate({ status: "starting", message: "Fetching Live Gold Rates...", progress: 0 });

        // 1. Fetch Shop-level Gold Rates (from DI-GoldPrice namespace)
        const shopQuery = `
          {
            shop {
              metal_prices: metafield(namespace: "DI-GoldPrice", key: "metal_prices") { value }
              stone_pricing: metafield(namespace: "DI-GoldPrice", key: "stone_pricing") { value }
            }
          }
        `;
        const shopRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ACCESS_TOKEN },
          body: JSON.stringify({ query: shopQuery }),
        });
        const shopData = await shopRes.json();
        const metalRates = JSON.parse(shopData.data?.shop?.metal_prices?.value || "{}");
        const stonePricingDb = JSON.parse(shopData.data?.shop?.stone_pricing?.value || "[]");
        const defaultTax = metalRates.default_tax || 3;

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

        // REMOVED deleteMany to prevent 404s

        while (hasNextPage) {
          const query = `
            query getProducts($cursor: String) {
              products(first: 5, after: $cursor, query: "status:active") {
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
                    complementary_products: metafield(namespace: "shopify--discovery--product_recommendation", key: "complementary_products") { value }
                    variants(first: 200) {
                      edges {
                        node {
                          id price compareAtPrice inventoryQuantity sku selectedOptions { name value }
                          image { url }
                          in_store: metafield(namespace: "custom", key: "in_store_available") { value }
                          ring_size: metafield(namespace: "custom", key: "ring_size_inventory") { value }
                          diamond_shape: metafield(namespace: "custom", key: "diamond_1_shape") { value }
                          metal_purity: metafield(namespace: "custom", key: "metal_purity") { value }
                          metal_weight: metafield(namespace: "custom", key: "metal_weight") { value }
                          metal_color: metafield(namespace: "custom", key: "metal_color") { value }
                          gross_weight: metafield(namespace: "custom", key: "gross_weight") { value }
                          top_height: metafield(namespace: "custom", key: "top_height") { value }
                          top_width: metafield(namespace: "custom", key: "top_width") { value }
                          d1_clarity: metafield(namespace: "custom", key: "diamond_1_clarity") { value }
                          d1_color: metafield(namespace: "custom", key: "diamond_1_color") { value }
                          d1_shape: metafield(namespace: "custom", key: "diamond_1_shape") { value }
                          d1_pcs: metafield(namespace: "custom", key: "diamond_1_numbers") { value }
                          d1_wt: metafield(namespace: "custom", key: "diamond_1_weight") { value }
                          d2_clarity: metafield(namespace: "custom", key: "diamond_2_clarity") { value }
                          d2_color: metafield(namespace: "custom", key: "diamond_2_color") { value }
                          d2_shape: metafield(namespace: "custom", key: "diamond_2_shape") { value }
                          d2_pcs: metafield(namespace: "custom", key: "diamond_2_numbers") { value }
                          d2_wt: metafield(namespace: "custom", key: "diamond_2_weight") { value }
                          variant_config: metafield(namespace: "DI-GoldPrice", key: "variant_config") { value }
                        }
                      }
                    }
                    media(first: 20) {
                      edges {
                        node {
                          mediaContentType
                          alt
                          ... on MediaImage { image { url altText } }
                          ... on Video { sources { url format mimeType } preview { image { url } } }
                          ... on ExternalVideo { embeddedUrl preview { image { url } } }
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
            for (const edge of products) {
              const p = edge.node;
              
              // [Media Mapping - Unchanged]
              const media = p.media.edges.map(({ node: m }) => {
                const type = m.mediaContentType;
                let url = type === "IMAGE" ? m.image?.url : (type === "VIDEO" ? m.sources?.[0]?.url : m.embeddedUrl);
                return { type, url, preview: m.preview?.image?.url || "", alt: m.alt || "", sources: m.sources || [] };
              });

              const variants = p.variants.edges.map(({ node: v }) => {
                const options = {};
                v.selectedOptions.forEach(o => { options[o.name.toLowerCase()] = o.value; });

                // 2. JEWELRY PRICE CALCULATOR (Logic from pdp-details.html)
                let priceBreakup = null;
                const config = v.variant_config?.value ? JSON.parse(v.variant_config.value) : null;
                
                if (config && metalRates) {
                  const metalType = (config.metal_type || "gold").toLowerCase();
                  const purity = config.purity || "14KT";
                  const metalWeight = Number(config.metal_weight || v.metal_weight?.value || 0);
                  
                  const rateKey = metalType === "platinum" ? "platinum_price" : `gold_price_${purity.toLowerCase()}`;
                  const goldRatePerG = (metalRates[rateKey] || 0);
                  const metalCost = goldRatePerG * metalWeight;

                  // Diamond/Stone costs
                  let diamondFinal = 0;
                  let diamondOriginal = 0;
                  let totalCarat = 0;
                  let minedDiamondTotal = 0;

                  (config.advanced_stone_config || []).forEach(stone => {
                    const pricingRef = stonePricingDb.find(s => s.id === stone.pricing_id);
                    let slabRate = 0;
                    let slabDiscount = 0;

                    const stoneQty = Number(stone.stone_quantity || 1);
                    const stoneWeight = Number(stone.stone_weight || 0);
                    const avgWt = stoneWeight / stoneQty;

                    if (pricingRef) {
                      const slab = pricingRef.slabs.find(s => avgWt >= s.from_weight && avgWt <= s.to_weight);
                      if (slab) {
                        slabRate = slab.price;
                        slabDiscount = slab.discount || 0;
                      }
                    }

                    const itemBase = slabRate * stoneWeight;
                    const appliedDisc = config.diamond_discount || slabDiscount;
                    const itemFinal = itemBase * (1 - appliedDisc / 100);

                    if (stone.stone_type === "diamond") {
                      diamondFinal += itemFinal;
                      diamondOriginal += itemBase;
                      totalCarat += stoneWeight;

                      // CALCULATE MINED DIAMOND PRICE BASED ON BRACKETS
                      let minedRate = 0;
                      if (avgWt <= 0.109) minedRate = 86800;
                      else if (avgWt <= 0.249) minedRate = 97020;
                      else if (avgWt <= 0.499) minedRate = 114917;
                      else if (avgWt <= 0.749) minedRate = 74266;
                      else if (avgWt <= 0.999) minedRate = 89373;
                      else if (avgWt <= 1.499) minedRate = 126906;
                      else if (avgWt <= 1.999) minedRate = 179840;
                      else if (avgWt <= 2.999) minedRate = 301515;
                      else minedRate = 395589;

                      minedDiamondTotal += (minedRate * stoneWeight);
                    }
                  });

                  // Making Charges
                  const mcBase = config.making_charges || 0;
                  const mcDisc = config.making_charges_discount || 0;
                  const mcFinal = (mcBase * (1 - mcDisc / 100)) * metalWeight;
                  const mcOriginal = mcBase * metalWeight;

                  const subtotal = metalCost + diamondFinal + mcFinal;
                  const tax = subtotal * (defaultTax / 100);
                  const grandTotal = subtotal + tax;

                  const totalSavings = ((metalCost + diamondOriginal + mcOriginal) * (1 + defaultTax / 100)) - grandTotal;

                  priceBreakup = {
                    price: [
                      { label: `${purity} ${options.color || "Gold"} (₹${Math.round(goldRatePerG).toLocaleString()}/g)`, value: `₹${Math.round(metalCost).toLocaleString()}` },
                      { label: `Diamonds (${Math.round(totalCarat * 1000) / 1000} ct)`, value: `₹${Math.round(diamondFinal).toLocaleString()}`, oldValue: diamondOriginal > diamondFinal ? `₹${Math.round(diamondOriginal).toLocaleString()}` : null },
                      { label: "Making Charges", value: mcFinal === 0 ? "FREE" : `₹${Math.round(mcFinal).toLocaleString()}` },
                      { label: `GST (${defaultTax}%)`, value: `₹${Math.round(tax).toLocaleString()}` }
                    ],
                    total_savings: `₹${Math.round(totalSavings).toLocaleString()}`,
                    grand_total: `₹${Math.round(grandTotal).toLocaleString()}`,
                    comparison: {
                      carat: `${Math.round(totalCarat * 100) / 100} CT`,
                      clarity: { lucira: "VVS", mined: "SI" },
                      color: { lucira: "EF", mined: "IJ" },
                      price: { lucira: `₹${Math.round(diamondFinal).toLocaleString()}`, mined: `₹${Math.round(minedDiamondTotal).toLocaleString()}` },
                      savings: `₹${Math.round(minedDiamondTotal - diamondFinal).toLocaleString()}`
                    }
                  };
                }

                // Diamond Array from individual metafields
                const diamonds = [];
                [1, 2].forEach(i => {
                  if (v[`d${i}_clarity`]?.value) {
                    diamonds.push({
                      quality: `${v[`d${i}_clarity`].value}, ${v[`d${i}_color`]?.value || ""}`.trim().replace(/,$/, ""),
                      shape: v[`d${i}_shape`]?.value || "Round",
                      pieces: v[`d${i}_pcs`]?.value || "1",
                      weight: v[`d${i}_wt`]?.value || "0"
                    });
                  }
                });

                return {
                  id: v.id.split("/").pop(),
                  sku: v.sku || "",
                  size: options.size || v.ring_size?.value || null,
                  color: options.color || v.color || null,
                  price: Number(v.price),
                  compare_price: v.compareAtPrice ? Number(v.compareAtPrice) : null,
                  inStock: v.inventoryQuantity > 0,
                  image: v.image?.url || p.featuredImage?.url,
                  price_breakup: priceBreakup,
                  metafields: {
                    ring_size_inventory: v.ring_size?.value,
                    metal_purity: v.metal_purity?.value || (config?.purity),
                    metal_weight: v.metal_weight?.value || (config?.metal_weight),
                    metal_color: v.metal_color?.value,
                    gross_weight: v.gross_weight?.value,
                    top_height: v.top_height?.value,
                    top_width: v.top_width?.value,
                    diamonds: diamonds.length > 0 ? diamonds : null
                  }
                };
              });

              // Fetch Nector Reviews for this product
              const reviewsData = await fetchNectorReviews(p.id);

              const mappedProduct = {
                shopifyId: p.id,
                title: p.title,
                handle: p.handle,
                description: p.descriptionHtml,
                vendor: p.vendor,
                type: p.productType,
                status: p.status,
                tags: p.tags,
                createdAt: p.createdAt,
                image: p.featuredImage?.url || (media.find(m => m.type === "IMAGE")?.url || null),
                images: media.filter(m => m.type === "IMAGE").map(m => ({ url: m.url, alt: m.alt })),
                media: media,
                price: variants[0]?.price || 0,
                compare_price: variants[0]?.compare_price || null,
                selectedColor: variants[0]?.color,
                colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
                variants: variants,
                reviews: reviewsData.count > 0 ? reviewsData : null,
                collectionHandles: p.collections.edges.map(e => e.node.handle),
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

              // 3. UPSERT Logic to prevent 404s
              await productsCollection.updateOne(
                { shopifyId: p.id },
                { $set: mappedProduct },
                { upsert: true }
              );
            }

            totalProcessed += products.length;
            sendUpdate({ status: "progress", message: `Synced ${totalProcessed} products...`, progress: Math.min(Math.round((totalProcessed / totalToSync) * 100), 99) });
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
