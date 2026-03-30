import clientPromise from "@/lib/mongodb";
import { fetchNectorReviews } from "@/lib/nector";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const reviews = await fetchNectorReviews(productId);

    // Update the database with the latest reviews
    const client = await clientPromise;
    const db = client.db("next_local_db");
    const productsCollection = db.collection("products");

    const id = productId.split("/").pop();

    await productsCollection.updateOne(
      { id: id },
      { $set: { reviews: reviews.list.length > 0 ? reviews : null, lastUpdated: new Date() } }
    );

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Reviews API Error:", error);
    return NextResponse.json({ error: "Failed to fetch/update reviews", message: error.message }, { status: 500 });
  }
}
