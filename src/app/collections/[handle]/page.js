"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { LayoutDashboard, ShoppingBag, ArrowRight, Search, Star, Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const colorMap = {
  yellow: "#E2C07E",
  rose: "#E9B4AB",
  white: "#E5E4E2",
};

function getBaseColor(color = "") {
  const normalized = String(color).toLowerCase();

  if (normalized.includes("rose")) return "rose";
  if (normalized.includes("white") || normalized.includes("silver") || normalized.includes("platinum")) return "white";
  if (normalized.includes("yellow") || normalized.includes("gold")) return "yellow";

  return "white";
}

function getUniqueBaseColors(colors = []) {
  const order = ["white", "yellow", "rose"];
  const availableBaseColors = new Set();

  colors.forEach((color) => {
    const base = getBaseColor(color);
    if (base) availableBaseColors.add(base);
  });

  return order.filter((color) => availableBaseColors.has(color));
}

function getSelectedBaseColor(product, selectedColor) {
  return getBaseColor(selectedColor || product?.selectedColor || "white");
}

function getVariantForBase(product, selectedBase) {
  return (
    product?.variants?.find((variant) => getBaseColor(variant.color || variant.title) === selectedBase) ||
    product?.variants?.[0] ||
    null
  );
}

function getProductImageForBase(product, selectedBase) {
  const variant = getVariantForBase(product, selectedBase);

  if (!product?.images?.length) {
    return variant?.image || product?.image || null;
  }

  const variantColor = String(variant?.color || variant?.title || "").toLowerCase();
  if (variantColor) {
    const exactMatch = product.images.find((image) => String(image.alt || "").toLowerCase().includes(variantColor));
    if (exactMatch) return exactMatch.url;
  }

  if (selectedBase) {
    const baseMatch = product.images.find((image) => String(image.alt || "").toLowerCase().includes(selectedBase));
    if (baseMatch) return baseMatch.url;
  }

  return variant?.image || product?.image || product.images?.[0]?.url || null;
}

function getImagesForBase(product, selectedBase) {
  if (!product?.images?.length) {
    const fallbackImage = getProductImageForBase(product, selectedBase);
    return fallbackImage ? [{ url: fallbackImage, alt: product?.title || "Product image" }] : [];
  }

  const variant = getVariantForBase(product, selectedBase);
  const variantColor = String(variant?.color || variant?.title || "").toLowerCase();

  if (variantColor) {
    const exactMatches = product.images.filter((image) => String(image.alt || "").toLowerCase().includes(variantColor));
    if (exactMatches.length > 0) return exactMatches;
  }

  if (selectedBase) {
    const baseMatches = product.images.filter((image) => String(image.alt || "").toLowerCase().includes(selectedBase));
    if (baseMatches.length > 0) return baseMatches;
  }

  const fallbackImage = getProductImageForBase(product, selectedBase);
  if (fallbackImage) return [{ url: fallbackImage, alt: product?.title || "Product image" }];

  return [];
}

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
  const [selectedColors, setSelectedColors] = useState({});
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

  useEffect(() => {
    setSelectedColors((prev) => {
      const next = {};

      for (const product of products) {
        const baseColors = getUniqueBaseColors(product.colors || product.variants?.map((variant) => variant.color) || []);
        next[product.shopifyId] = prev[product.shopifyId] || getBaseColor(product.selectedColor || baseColors[0] || "white");
      }

      return next;
    });
  }, [products]);

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
                  {products.map((product) => {
                    const baseColors = getUniqueBaseColors(product.colors || product.variants?.map((variant) => variant.color) || []);
                    const activeBase = selectedColors[product.shopifyId] || getSelectedBaseColor(product);
                    const galleryImages = getImagesForBase(product, activeBase);
                    const swiperId = `collection-swiper-${String(product.shopifyId || product.id || product.handle).replace(/[^a-zA-Z0-9]/g, "")}`;

                    return (
                      <div key={product.shopifyId} className="space-y-4">
                        <Link href={`/products/${product.handle}`} className="group block space-y-4">
                          <div className="aspect-[4/5] relative rounded-[2rem] border border-zinc-100 dark:border-zinc-900 overflow-hidden bg-white dark:bg-zinc-950 transition-transform duration-500 group-hover:scale-[1.02]">
                            {galleryImages.length > 0 ? (
                              <Swiper
                                spaceBetween={0}
                                loop={galleryImages.length > 1}
                                slidesPerView={1}
                                modules={[Navigation]}
                                navigation={
                                  galleryImages.length > 1
                                    ? {
                                        prevEl: `.custom-prev-${swiperId}`,
                                        nextEl: `.custom-next-${swiperId}`,
                                      }
                                    : false
                                }
                                className="w-full h-full"
                              >
                                {galleryImages.map((image, index) => (
                                  <SwiperSlide key={`${image.url}-${index}`}>
                                    <img
                                      src={image.url}
                                      alt={image.alt || `${product.title}${activeBase ? ` - ${activeBase}` : ""}`}
                                      className="w-full h-full object-contain p-6 grayscale-[0.2] group-hover:grayscale-0 transition-all"
                                    />
                                  </SwiperSlide>
                                ))}
                              </Swiper>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">No Image</div>
                            )}
                            {galleryImages.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Previous image"
                                  className={`custom-prev-${swiperId} absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/85 text-black shadow-md opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                  <ChevronLeft size={18} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Next image"
                                  className={`custom-next-${swiperId} absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/85 text-black shadow-md opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </>
                            )}
                            <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="bg-black text-white p-3 rounded-full shadow-xl"><ArrowRight size={20} /></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{product.vendor}</p>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:underline underline-offset-4 decoration-2">{product.title}</h3>
                            {product.reviews?.count > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="flex text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} fill={i < Math.floor(product.reviews.average) ? "currentColor" : "none"} className={i < Math.floor(product.reviews.average) ? "" : "text-zinc-200 dark:text-zinc-800"} />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400">({product.reviews.count})</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">Rs. {product.price}</p>
                              {product.compare_price && <p className="text-xs text-zinc-400 line-through">Rs. {product.compare_price}</p>}
                            </div>
                          </div>
                        </Link>
                        {baseColors.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                              Color{activeBase ? `: ${activeBase}` : ""}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {baseColors.map((base) => {
                                const isActive = base === activeBase;

                                return (
                                  <button
                                    key={`${product.shopifyId}-${base}`}
                                    type="button"
                                    title={base}
                                    aria-label={`Show ${base} color`}
                                    onClick={() => {
                                      setSelectedColors((prev) => ({
                                        ...prev,
                                        [product.shopifyId]: base,
                                      }));
                                    }}
                                    className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center hover:scale-110 ${
                                      isActive
                                        ? "border-black dark:border-white p-0.5"
                                        : "border-transparent"
                                    }`}
                                  >
                                    <span
                                      className="w-full h-full rounded-full border border-zinc-200 dark:border-zinc-700"
                                      style={{ backgroundColor: colorMap[base] }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
