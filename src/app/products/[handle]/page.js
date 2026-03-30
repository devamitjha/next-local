import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Info, Tag, Package } from "lucide-react";

async function getProduct(handle) {
  const client = await clientPromise;
  const db = client.db("next_local_db");
  const product = await db.collection("products").findOne({ handle });
  return product;
}

export default async function ProductPage({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={20} /> Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
              {product.images?.[0] ? (
                <img
                  src={product.images[0].url}
                  alt={product.images[0].alt || product.title}
                  className="w-full h-full object-contain p-8"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">No Image</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images?.slice(1, 5).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                  <img src={img.url} alt="" className="w-full h-full object-cover p-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold uppercase tracking-wider">{product.vendor}</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">{product.status}</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
                {product.title}
              </h1>
              <p className="text-xl font-medium text-zinc-500">{product.type}</p>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400" 
                 dangerouslySetInnerHTML={{ __html: product.description }} />

            {/* Variants Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package size={20} /> Variants
              </h3>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-medium">
                    <tr>
                      <th className="px-4 py-2">Option</th>
                      <th className="px-4 py-2">Price</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {product.variants?.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-3 font-medium">{v.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold">₹{v.price}</span>
                            {v.compareAtPrice && (
                              <span className="text-xs text-zinc-400 line-through">₹{v.compareAtPrice}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{v.inventory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Metafields */}
            {product.metafields?.filter(mf => !mf.value.trim().startsWith("<") && mf.namespace !== "judgeme").length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Info size={20} /> Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.metafields
                    .filter(mf => !mf.value.trim().startsWith("<") && mf.namespace !== "judgeme")
                    .map((mf, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{mf.key.replace(/_/g, " ")}</p>
                      <p className="text-sm mt-1 text-zinc-900 dark:text-zinc-100">{mf.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
