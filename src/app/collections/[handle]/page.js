"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Search, Filter, ChevronDown } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

export default function CollectionPage({ params }) {
  const { handle } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 12;

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [availableFilters, setAvailableFilters] = useState({});
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState({ "In Store Available": true, "Price": true, "Product Category": true });

  const toggleGroup = (group) => {
    setExpandedFilters((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/filters?handle=${handle}&${searchParams.toString()}`);
      const data = await res.json();
      setAvailableFilters(data || {});
    } catch (e) {
      console.error(e);
    }
  }, [handle, searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/products/search?handle=${handle}&${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [handle, limit, page, searchParams]);

  useEffect(() => {
    fetchFilters();
    fetchProducts();
  }, [fetchFilters, fetchProducts]);

  const toggleFilter = (urlKey, value) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(urlKey);

    if (current === value) {
      params.delete(urlKey);
    } else {
      params.set(urlKey, value);
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <nav className="border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/collections/all" className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <ShoppingBag className="text-zinc-400" size={24} />
            LUCIRA
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-2 transition-colors">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="hidden lg:block w-72 space-y-2 shrink-0">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
              <h2 className="font-black uppercase tracking-widest text-sm">Filters</h2>
              <button onClick={clearFilters} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-black dark:hover:text-white">Clear All</button>
            </div>

            {Object.entries(availableFilters || {}).map(([groupName, options]) => (
              <div key={groupName} className="border-b border-zinc-50 dark:border-zinc-900 py-4">
                <button onClick={() => toggleGroup(groupName)} className="flex items-center justify-between w-full group text-left">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors">{groupName}</h3>
                  <ChevronDown size={14} className={`text-zinc-300 transition-transform duration-300 ${expandedFilters[groupName] ? "rotate-180" : ""}`} />
                </button>
                <div className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedFilters[groupName] ? "max-h-96 opacity-100 overflow-y-auto" : "max-h-0 opacity-0"}`}>
                  <div className="flex flex-col gap-2">
                    {Array.isArray(options) && options.map((opt) => {
                      const isActive = searchParams.get(opt.urlKey) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFilter(opt.urlKey, opt.value)}
                          className={`text-[11px] font-medium text-left hover:text-black dark:hover:text-white transition-colors py-1 flex justify-between items-center ${isActive ? "text-black dark:text-white font-bold" : "text-zinc-500"}`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-[10px] opacity-60 tabular-nums">({opt.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </aside>

          <div className="flex-1 space-y-12">
            <header className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tight uppercase leading-none">{handle.replace(/-/g, " ")}</h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-base">{pagination.total} products found</p>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowFilterDrawer(true)} className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest">
                    <Filter size={16} /> Filters
                  </button>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search collection..."
                      className="w-full pl-10 pr-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm"
                      value={searchParams.get("q") || ""}
                      onChange={(e) => {
                        const p = new URLSearchParams(searchParams.toString());
                        if (e.target.value) p.set("q", e.target.value);
                        else p.delete("q");
                        p.set("page", "1");
                        router.push(`${pathname}?${p.toString()}`);
                      }}
                    />
                  </div>
                </div>
              </div>
            </header>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 rounded-[2rem]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                  {products.map((product) => (
                    <ProductCard key={product.shopifyId} product={product} />
                  ))}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 pt-12 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.set("page", (pagination.page - 1).toString());
                        router.push(`${pathname}?${p.toString()}`);
                      }}
                      disabled={pagination.page <= 1}
                      className="px-6 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-20 text-xs font-bold uppercase"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-black">{pagination.page} / {pagination.totalPages}</span>
                    <button
                      onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.set("page", (pagination.page + 1).toString());
                        router.push(`${pathname}?${p.toString()}`);
                      }}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-6 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-20 text-xs font-bold uppercase"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
