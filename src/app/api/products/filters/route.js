import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle");

    const client = await clientPromise;
    const db = client.db("next_local_db");
    const productsCollection = db.collection("products");

    // 1. Build the Base Match Stage (Collection & Search)
    const buildBaseMatch = () => {
      const match = {};
      if (handle && handle !== "all") {
        if (!handle.startsWith("all-")) {
          match.collectionHandles = handle;
        } else {
          const keywords = handle.replace("all-", "").split("-").map(k => k.replace(/s$/, ""));
          match.$and = keywords.map(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, "i");
            return {
              $or: [
                { collectionHandles: { $regex: regex } },
                { type: { $regex: regex } },
                { tags: { $regex: regex } },
                { title: { $regex: regex } }
              ]
            };
          });
        }
      }
      const q = searchParams.get("q");
      if (q) match.title = { $regex: q, $options: "i" };
      return match;
    };

    // 2. Map Shopify URL keys to MongoDB fields
    const keyMap = {
      "filter.v.m.custom.in_store_available": "variants.metafields.in_store_available",
      "filter.v.m.custom.ring_size_inventory": "variants.metafields.ring_size_inventory",
      "filter.p.m.custom.shop_for": "productMetafields.shop_for",
      "filter.p.m.custom.weight": "productMetafields.weight",
      "filter.v.m.custom.diamond_1_shape": "variants.metafields.diamond_1_shape",
      "filter.p.m.custom.carat_range": "productMetafields.carat_range",
      "filter.p.m.ornaverse.material_type": "productMetafields.material_type",
      "filter.p.product_type": "type",
      "filter.v.m.custom.metal_purity": "variants.metafields.metal_purity",
      "filter.p.m.custom.finishing": "productMetafields.finishing",
      "filter.p.m.custom.fit": "productMetafields.fit"
    };

    // 3. Current Active Filters from URL
    const activeFilters = {};
    searchParams.forEach((val, key) => {
      if (keyMap[key] && val) activeFilters[keyMap[key]] = val;
    });

    // 4. Aggregation Helper for Faceted Search
    const getFacetedCounts = async (field, isVariantArray = false, isMetafieldArray = false) => {
      const currentMatch = { ...buildBaseMatch() };
      Object.entries(activeFilters).forEach(([activeField, val]) => {
        if (activeField !== field) currentMatch[activeField] = val;
      });

      const pipeline = [{ $match: currentMatch }];
      if (isVariantArray) pipeline.push({ $unwind: "$variants" });
      if (isMetafieldArray) pipeline.push({ $unwind: `$${field}` });

      pipeline.push({ $group: { _id: { shopifyId: "$shopifyId", val: `$${field}` } } });
      pipeline.push({ $group: { _id: "$_id.val", count: { $sum: 1 } } });

      const data = await productsCollection.aggregate(pipeline).toArray();
      return data.filter(d => d._id).map(d => ({
        label: d._id,
        value: d._id,
        count: d.count
      }));
    };

    const results = {};

    const categories = [
      { name: "In Store Available", field: "variants.metafields.in_store_available", type: "variant", ns: "custom", key: "in_store_available", isV: true, isM: true },
      { name: "Ring Size", field: "variants.metafields.ring_size_inventory", type: "variant", ns: "custom", key: "ring_size_inventory", isV: true },
      { name: "Shop For", field: "productMetafields.shop_for", type: "product", ns: "custom", key: "shop_for" },
      { name: "Weight", field: "productMetafields.weight", type: "product", ns: "custom", key: "weight" },
      { name: "Diamond Shape", field: "variants.metafields.diamond_1_shape", type: "variant", ns: "custom", key: "diamond_1_shape", isV: true },
      { name: "Carat range", field: "productMetafields.carat_range", type: "product", ns: "custom", key: "carat_range" },
      { name: "Material Type", field: "productMetafields.material_type", type: "product", ns: "ornaverse", key: "material_type" },
      { name: "Product Category", field: "type", type: "type", key: "product_type" },
      { name: "Metal Purity", field: "variants.metafields.metal_purity", type: "variant", ns: "custom", key: "metal_purity", isV: true },
      { name: "Finishing", field: "productMetafields.finishing", type: "product", ns: "custom", key: "finishing" },
      { name: "Fit", field: "productMetafields.fit", type: "product", ns: "custom", key: "fit" }
    ];

    for (const cat of categories) {
      const counts = await getFacetedCounts(cat.field, cat.isV, cat.isM);
      results[cat.name] = counts.map(c => {
        let urlKey = cat.type === "type" ? "filter.p.product_type" : 
                     cat.type === "variant" ? `filter.v.m.${cat.ns}.${cat.key}` : 
                     `filter.p.m.${cat.ns}.${cat.key}`;
        return {
          ...c,
          urlKey,
          input: JSON.stringify({ [cat.type === "type" ? "productType" : cat.type === "variant" ? "variantMetafield" : "productMetafield"]: { namespace: cat.ns, key: cat.key, value: c.value } })
        };
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("❌ Filters Error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
