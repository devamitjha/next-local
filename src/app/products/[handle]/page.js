import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import ProductPageClient from "@/components/product/ProductPageClient";

async function getProduct(handle) {
  const client = await clientPromise;
  const db = client.db("next_local_db");
  const product = await db.collection("products").findOne({ handle });

  if (product) {
    // Convert MongoDB ObjectId to string for Client Component serialization
    product._id = product._id.toString();
    if (product.lastUpdated instanceof Date) product.lastUpdated = product.lastUpdated.toISOString();
    if (product.createdAt instanceof Date) product.createdAt = product.createdAt.toISOString();
  }

  return product;
}


export default async function ProductPage({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} />;
}
