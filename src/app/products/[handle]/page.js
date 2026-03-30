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

async function getComplementaryProducts(product) {
  if (!product.complementaryProductIds || product.complementaryProductIds.length === 0) {
    return [];
  }

  const client = await clientPromise;
  const db = client.db("next_local_db");
  
  // Search by shopifyId (full GID) as it's most likely what's stored in the metafield
  const complementaryProducts = await db.collection("products")
    .find({ shopifyId: { $in: product.complementaryProductIds } })
    .toArray();

  return complementaryProducts.map(p => {
    p._id = p._id.toString();
    if (p.lastUpdated instanceof Date) p.lastUpdated = p.lastUpdated.toISOString();
    if (p.createdAt instanceof Date) p.createdAt = p.createdAt.toISOString();
    return p;
  });
}

export default async function ProductPage({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  const complementaryProducts = await getComplementaryProducts(product);

  return <ProductPageClient product={product} complementaryProducts={complementaryProducts} />;
}

