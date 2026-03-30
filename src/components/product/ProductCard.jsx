"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { Star, ChevronLeft, ChevronRight, ArrowRight, Copy, X, Loader2, Play } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const colorMap = {
  yellow: "#E2C07E",
  rose: "#E9B4AB",
  white: "#E5E4E2",
};

// Force en-IN formatting to be consistent across environments
const formatPrice = (num) => {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
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

function getVariantForBase(product, selectedBase) {
  // 1. Prefer in-stock variant for the selected base
  const inStockVariant = product?.variants?.find(
    (v) => v.inStock && getBaseColor(v.color || v.title) === selectedBase
  );
  if (inStockVariant) return inStockVariant;

  // 2. Fallback to any variant for the selected base
  return (
    product?.variants?.find((variant) => getBaseColor(variant.color || variant.title) === selectedBase) ||
    product?.variants?.[0] ||
    null
  );
}

function getImagesForBase(product, selectedBase) {
  if (!product?.images?.length) {
    const variant = getVariantForBase(product, selectedBase);
    const fallbackImage = variant?.image || product?.image || null;
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

  return product.images;
}

export default function ProductCard({ product }) {
  const baseColors = getUniqueBaseColors(product.colors || product.variants?.map((v) => v.color) || []);
  
  // Find first in-stock variant to set as initial active base
  const firstInStockVariant = product.variants?.find(v => v.inStock);
  const initialBase = firstInStockVariant 
    ? getBaseColor(firstInStockVariant.color || firstInStockVariant.title)
    : getBaseColor(product.selectedColor || baseColors[0] || "white");

  const [activeBase, setActiveBase] = useState(initialBase);

  const [showSimilar, setShowSimilar] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  const currentVariant = getVariantForBase(product, activeBase);
  const displayPrice = currentVariant ? currentVariant.price : product.price;
  const displayComparePrice = currentVariant ? (currentVariant.compare_price || currentVariant.compareAtPrice) : product.compare_price;

  const videoMedia = product.media?.find(m => m.type === "VIDEO" || m.type === "EXTERNAL_VIDEO");

  const galleryImages = getImagesForBase(product, activeBase);
  const swiperId = `card-swiper-${String(product.shopifyId || product.id || product.handle).replace(/[^a-zA-Z0-9]/g, "")}`;

  const fetchSimilar = async () => {
    if (similarProducts.length > 0) {
      setShowSimilar(true);
      return;
    }
    
    setLoadingSimilar(true);
    setShowSimilar(true);
    try {
      const res = await fetch(`/api/products/similar?handle=${product.handle}`);
      const data = await res.json();
      setSimilarProducts(data.products || []);
    } catch (e) {
      console.error("Failed to fetch similar products", e);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showSimilar || showVideoPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [showSimilar, showVideoPopup]);

  return (
    <>
      <div className="space-y-4">
        <div className="group block space-y-4">
          <div className="aspect-[4/5] relative rounded-[2rem] border border-zinc-100 dark:border-zinc-900 overflow-hidden bg-white dark:bg-zinc-950 transition-transform duration-500 hover:scale-[1.01]">
            <Link href={`/products/${product.handle}`} className="block w-full h-full">
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
            </Link>

            {/* Video Play Button */}
            {videoMedia && (
              <button 
                onClick={(e) => { e.preventDefault(); setShowVideoPopup(true); }}
                className="absolute bottom-4 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-zinc-200 text-zinc-900 shadow-sm hover:bg-black hover:text-white transition-all duration-300"
              >
                <Play size={16} fill="currentColor" />
              </button>
            )}

            {/* View Similar Button */}
            <Drawer open={showSimilar} onOpenChange={setShowSimilar}>
              <DrawerTrigger asChild>
                <button 
                  onClick={(e) => { e.preventDefault(); fetchSimilar(); }}
                  className="absolute bottom-4 right-4 z-10 flex items-center gap-0 hover:gap-2 px-3 hover:px-4 py-2 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-full text-zinc-900 shadow-sm hover:bg-black hover:text-white transition-all duration-500 group/btn overflow-hidden"
                >
                  <span className="max-w-0 opacity-0 group-hover/btn:max-w-[100px] group-hover/btn:opacity-100 transition-all duration-500 ease-in-out text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                    View Similar
                  </span>
                  <Copy size={16} className="shrink-0" />
                </button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh] h-[90vh] bg-white rounded-t-[20px] flex flex-col">
                <div className="mx-auto w-full max-w-7xl flex flex-col h-full overflow-hidden">
                  <DrawerHeader className="px-10 pt-10 flex flex-row items-center justify-between border-b border-zinc-100 pb-6 !text-left !flex-row shrink-0">
                    <DrawerTitle className="text-[15px] font-medium tracking-[0.2em] text-black uppercase">VIEW SIMILAR</DrawerTitle>
                    <DrawerClose asChild>
                      <button className="text-zinc-400 hover:text-black transition-colors hover:cursor-pointer p-1">
                        <X size={22} strokeWidth={1.5} />
                      </button>
                    </DrawerClose>
                  </DrawerHeader>
                  
                  <div className="px-10 py-10 overflow-y-auto flex-1">
                    {loadingSimilar ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4 w-full">
                        <Loader2 className="animate-spin text-zinc-400" size={40} />
                        <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Searching matching designs...</p>
                      </div>
                    ) : similarProducts.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12 pb-10">
                        {similarProducts.slice(0, 10).map((item) => (
                          <div key={item.id} className="space-y-4">
                            <Link href={`/products/${item.handle}`} onClick={() => setShowSimilar(false)} className="block space-y-4 group">
                              <div className="aspect-square relative rounded-md bg-[#F9F9F9] overflow-hidden transition-all duration-300 group-hover:bg-[#f3f3f3]">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                              <div className="space-y-2 px-0">
                                <h4 className="text-[13px] font-normal text-zinc-900 line-clamp-1 leading-relaxed tracking-tight">{item.title}</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-bold text-black tracking-tight">₹{formatPrice(item.price)}</p>
                                    {(item.compare_price || item.compareAtPrice) > item.price && (
                                      <p className="text-[12px] text-zinc-400 line-through font-medium">₹{formatPrice(item.compare_price || item.compareAtPrice)}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 group/link">
                                    <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200 pb-0.5 group-hover/link:border-black transition-colors">
                                      VIEW DETAILS
                                    </span>
                                    <ChevronRight size={10} className="text-zinc-900" />
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                          <Copy className="text-zinc-300" size={30} />
                        </div>
                        <p className="font-bold text-zinc-500 uppercase tracking-widest text-sm">No similar items found for this design.</p>
                      </div>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

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
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{product.vendor}</p>
            <Link href={`/products/${product.handle}`}>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline underline-offset-4 decoration-2">
                {product.title}
              </h3>
            </Link>
            
            {product.reviews?.count > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < Math.floor(product.reviews.average) ? "currentColor" : "none"}
                      className={i < Math.floor(product.reviews.average) ? "" : "text-zinc-200 dark:text-zinc-800"}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-zinc-400">({product.reviews.count})</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Rs. {formatPrice(displayPrice)}</p>
              {displayComparePrice && (
                <p className="text-xs text-zinc-400 line-through">Rs. {formatPrice(displayComparePrice)}</p>
              )}
            </div>
          </div>
        </div>

        {baseColors.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {baseColors.map((base) => {
                const isActive = base === activeBase;
                return (
                  <button
                    key={`${product.shopifyId}-${base}`}
                    type="button"
                    title={base}
                    aria-label={`Show ${base} color`}
                    onClick={() => setActiveBase(base)}
                    className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center hover:scale-110 ${
                      isActive ? "border-black dark:border-white p-0.5" : "border-transparent"
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

      {/* Video Popup Modal */}
      {showVideoPopup && videoMedia && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setShowVideoPopup(false)}
          />
          
          {/* Video Container */}
          <div className="relative w-full max-w-2xl aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowVideoPopup(false)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-all duration-300 shadow-lg border border-white/10"
            >
              <X size={24} />
            </button>
            
            <video 
              autoPlay 
              muted 
              loop 
              playsInline
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              disablePictureInPicture
              className="w-full h-full object-contain"
              poster={videoMedia.preview}
            >
              {videoMedia.sources && videoMedia.sources.length > 0 ? (
                <>
                  {videoMedia.sources.filter(s => s.format === 'mp4').map((source, sIdx) => (
                    <source key={sIdx} src={source.url} type={source.mimeType} />
                  ))}
                  {videoMedia.sources.filter(s => s.format !== 'mp4').map((source, sIdx) => (
                    <source key={sIdx} src={source.url} type={source.mimeType} />
                  ))}
                </>
              ) : (
                <source src={videoMedia.url} type={videoMedia.mimeType || "video/mp4"} />
              )}
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </>
  );
}
