import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const query = searchParams.get("q");

    const client = await clientPromise;
    const db = client.db("next_local_db");
    const productsCollection = db.collection("products");

    const filter = {};

    // 1. Collection/Keyword filtering
    if (handle && handle !== "all") {
      // Real collection pages should only show products assigned to that exact collection.
      if (!handle.startsWith("all-")) {
        filter.collectionHandles = handle;
      } else {
        const keywords = handle.replace("all-", "").split("-").map(k => k.replace(/s$/, ""));
        filter.$and = keywords.map(kw => {
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

    if (query) {
      filter.title = { $regex: query, $options: "i" };
    }

    // 2. Map Shopify URL keys to MongoDB structure
    searchParams.forEach((value, key) => {
      if (!value) return;
      
      if (key.startsWith("filter.v.m.")) {
        const parts = key.split(".");
        const mongoKey = `variants.metafields.${parts[4]}`;
        filter[mongoKey] = value;
      }
      else if (key.startsWith("filter.p.m.")) {
        const parts = key.split(".");
        const mongoKey = `productMetafields.${parts[4]}`;
        filter[mongoKey] = value;
      }
      else if (key === "filter.p.product_type") {
        filter.type = value;
      }
      else if (key === "filter.v.price.gte") {
        if (!filter.price) filter.price = {};
        filter.price.$gte = Number(value);
      }
      else if (key === "filter.v.price.lte") {
        if (!filter.price) filter.price = {};
        filter.price.$lte = Number(value);
      }
    });

    const products = await productsCollection
      .find(filter)
      .project({
        description: 0,
        "reviews.list": 0,
        tags: 0,
        productMetafields: 0,
      })
      .sort({ type: 1, title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await productsCollection.countDocuments(filter);

    return NextResponse.json({
      products,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: "Failed to search products", message: error.message }, { status: 500 });
  }
}
