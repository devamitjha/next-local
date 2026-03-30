"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Play, Copy } from "lucide-react";
import ProductGallerySkeleton from "./ProductGallerySkeleton";

export default function ProductGallery({ media = [], title = "", activeColor = "", onViewSimilar }) {
  const sortedMedia = useMemo(() => {
    if (!media || media.length === 0) return [];

    // 1. Define color matching logic
    const colorTerms = ["yellow", "white", "rose"];
    const currentBaseColor = activeColor.toLowerCase().split(" ")[0];

    const isMatch = (item) => {
      const alt = (item.alt || "").toLowerCase();
      const mentionsOtherColor = colorTerms.some(color => 
        color !== currentBaseColor && alt.includes(color)
      );
      return alt.includes(currentBaseColor) || !mentionsOtherColor;
    };

    // 2. Categorization
    const groups = {
      mq: [],
      ci: [],
      mh: [],
      mv: [],
      v360: [],
      cert: [],
      others: []
    };

    media.forEach((item) => {
      const alt = (item.alt || "").toLowerCase();
      if (alt.includes("cert")) groups.cert.push(item);
      else if (alt.includes("mq")) groups.mq.push(item);
      else if (alt.includes("ci")) groups.ci.push(item);
      else if (alt.includes("mh")) groups.mh.push(item);
      else if (alt.includes("mv")) groups.mv.push(item);
      else if (alt.includes("v360") || alt.includes("360v")) groups.v360.push(item);
      else groups.others.push(item);
    });

    const videos = [...groups.mv, ...groups.v360];
    const pool = [...groups.mq, ...groups.ci, ...groups.mh];
    const others = groups.others;
    const certificates = groups.cert;

    // Filter categories for the current active color
    const colorOthers = others.filter(isMatch);
    const colorPool = pool.filter(isMatch);
    const colorVideos = videos.filter(isMatch);
    const colorCerts = certificates.filter(isMatch);

    const result = [];
    
    // Position 1: First "other" image or "pool" image (in color)
    const firstItem = colorOthers[0] || colorPool[0] || colorVideos[0];
    if (firstItem) result.push(firstItem);

    // Position 2: Primary Video
    const mainVideo = colorVideos.find(v => !result.includes(v));
    if (mainVideo) {
      result.push(mainVideo);
    } else {
      const next = colorPool.find(i => !result.includes(i));
      if (next) result.push(next);
    }

    // Position 3: Next from pool
    const third = colorPool.find(i => !result.includes(i));
    if (third) result.push(third);

    // Position 4-5: sequential others
    const remainingOthers = colorOthers.filter(i => !result.includes(i));
    while (result.length < 5 && remainingOthers.length > 0) {
      result.push(remainingOthers.shift());
    }

    // Position 6: next from pool
    const remainingPool = colorPool.filter(i => !result.includes(i));
    if (result.length < 6 && remainingPool.length > 0) {
      result.push(remainingPool.shift());
    }

    // Position 7: Remaining Videos
    const extraVideos = colorVideos.filter(v => !result.includes(v));
    extraVideos.forEach(v => {
      if (!result.includes(v)) result.push(v);
    });

    // Add remaining from pool and others
    const finalImages = [
      ...remainingPool.filter(i => !result.includes(i)),
      ...remainingOthers.filter(i => !result.includes(i)),
    ];
    finalImages.forEach(img => {
      if (!result.includes(img)) result.push(img);
    });

    // Finally, certificates always at the very end
    colorCerts.forEach(c => {
      if (!result.includes(c)) result.push(c);
    });

    return result;
  }, [media, activeColor]);

  if (!sortedMedia.length) {
    return <ProductGallerySkeleton />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sticky top-5">
      {sortedMedia.map((item, index) => {
        const isVideo = item.type === "VIDEO" || item.type === "EXTERNAL_VIDEO";
        const isFirst = index === 0;

        return (
          <div 
            key={`${item.url}-${index}`}
            className={`relative aspect-square rounded-lg overflow-hidden bg-[#F7F7F7] ${isFirst ? "col-span-1" : ""}`}
          >
            {isVideo ? (
              <video 
                poster={item.preview}
                autoPlay 
                muted 
                loop 
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                disablePictureInPicture
                className="w-full h-full object-cover"
              >
                {item.sources && item.sources.length > 0 ? (
                  <>
                    {item.sources.filter(s => s.format === 'mp4').map((source, sIdx) => (
                      <source key={sIdx} src={source.url} type={source.mimeType} />
                    ))}
                    {item.sources.filter(s => s.format !== 'mp4').map((source, sIdx) => (
                      <source key={sIdx} src={source.url} type={source.mimeType} />
                    ))}
                  </>
                ) : (
                  <source src={item.url} type={item.mimeType || "video/mp4"} />
                )}
              </video>
            ) : (
              <img 
                src={item.url} 
                alt={item.alt || title} 
                className="w-full h-full object-cover"
              />
            )}
            
            {isFirst && (
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-white/95 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm">Best Seller</span>
                <span className="bg-white/95 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm">Fast Shipping</span>
              </div>
            )}

            {isVideo && (
              <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-full">
                <Play size={14} fill="black" />
              </div>
            )}

            {index === 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSimilar();
                }}
                className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 transition-colors hover:cursor-pointer z-10 group/sim"
              >
                <Copy size={20} className="text-zinc-700 group-hover/sim:scale-110 transition-transform" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
