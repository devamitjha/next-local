"use client";

import { Star, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import Image from "next/image";
import { Separator } from "@/components/ui/separator"

export default function CustomerReviews({ reviews, productId }) {
  const defaultReviews = {
    count: 0,
    average: 0,
    stats: [],
    list: []
  };

  const data = reviews && reviews.count > 0 ? reviews : defaultReviews;
  
  // Extract all unique images from reviews for the thumbnail slider
  const allReviewImages = data.list?.reduce((acc, review) => {
    if (review.images && review.images.length > 0) {
      review.images.forEach(img => {
        if (!acc.includes(img)) acc.push(img);
      });
    }
    return acc;
  }, []) || [];

  // Fallback static images only if NO real review images exist
  const displayThumbnailImages = allReviewImages.length > 0 ? allReviewImages : [
    "/images/product/review/1.jpg",
    "/images/product/review/2.jpg",
    "/images/product/review/3.jpg",
    "/images/product/review/4.jpg",
    "/images/product/review/5.jpg",
    "/images/product/review/6.jpg",
  ];

  const getPercentage = (count) => {
    if (!data.count) return 0;
    return Math.round((count / data.count) * 100);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    if (dateStr.includes("ago")) return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // If no reviews at all (not even mock), hide section or show empty state
  if (!reviews && !data.count) return null;

  return (
    <section className="w-full py-18 bg-gray-50 mt-15" id="reviews">
      <div className="max-w-480 mx-auto px-17 min-[1440px]:px-17">
        
        {/* Heading */}
        <h2 className="text-28px font-bold mb-8 text-center uppercase tracking-wider">
          Customer Reviews
        </h2>

        {/* Review Summary Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-10">
          
          {/* Average Rating */}
          <div className="text-center flex-1">
            <p className="text-6xl font-bold mb-4">{data.average || "0.0"}</p>
            <div className="flex justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={22} className={`${i < Math.floor(data.average || 0) ? 'fill-black text-black' : 'text-gray-300'}`} />
              ))}
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{data.count} reviews</p>
          </div>

          {/* Progress Bars */}
          <div className="flex-[1.5] w-full max-md:mt-4 max-w-md space-y-3">
            {[5, 4, 3, 2, 1].map(star => {
              const stat = data.stats?.find(s => Number(s.rating) === star);
              return (
                <RatingProgress 
                  key={star} 
                  label={`${star} Stars`} 
                  value={getPercentage(stat?.count || 0)} 
                />
              );
            })}
          </div>

          {/* Recommendation Percentage */}
          <div className="text-center flex-1">
            <p className="text-5xl font-bold mb-3">{data.average >= 4 ? '97%' : '80%'}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
              Would recommend<br />this product
            </p>
          </div>
        </div>

        {/* Write a Review Button */}
        <div className="flex justify-center mb-10">
          <Button className="bg-black text-white px-14 py-7 text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all rounded-none">
            Write a Review
          </Button>
        </div>       

        {/* Thumbnail Slider */}
        <div className="mb-10 -mx-4 md:mx-0">
          <Swiper
            modules={[FreeMode, Navigation]}
            spaceBetween={12}
            slidesPerView={3.5}
            freeMode={true}
            breakpoints={{
              640: { slidesPerView: 5.5 },
              1024: { slidesPerView: 8.5 },
              1280: { slidesPerView: 10.5 },
            }}
            className="px-4 md:px-0"
          >
            {displayThumbnailImages.map((src, i) => (
              <SwiperSlide key={i}>
                <div className="aspect-square bg-gray-200 rounded-sm overflow-hidden relative group cursor-pointer border border-gray-100">
                  <Image 
                    src={src} 
                    alt={`Review ${i}`} 
                    fill 
                    className="object-cover opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

         <Separator className="bg-gray-200" />

        {/* Filter Bar */}
        <div className="flex items-center justify-between py-8 px-2">
          <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            Rating: <span className="text-gray-400 font-bold ml-1">All</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          
          <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">{data.count} reviews</span>
          
          <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            Sort by: <span className="text-gray-400 font-bold ml-1">Featured</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.list?.map((review) => (
            <ReviewCard 
              key={review.id}
              name={review.name}
              initials={review.name?.charAt(0)}
              title={review.title}
              rating={review.rating}
              date={formatDate(review.date)}
              text={review.text}
              images={review.images}
            />
          ))}
        </div>

        {/* Read More */}
        {data.count > (data.list?.length || 0) && (
          <div className="flex justify-center mt-16">
            <Button variant="outline" className="border-2 border-black text-black px-12 py-7 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-none">
              READ MORE REVIEWS
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function RatingProgress({ label, value }) {
  return (
    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-600">
      <span className="w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-black transition-all duration-700 ease-out" 
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 text-right text-black">{value}%</span>
    </div>
  );
}

function ReviewCard({ name, initials, title, rating, date, text, images }) {
  return (
    <div className="bg-white p-10 rounded-none flex flex-col gap-6 border border-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow-md relative group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100 uppercase text-lg shadow-inner">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-base">{name}</span>
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                <CheckCircle size={10} strokeWidth={3} />
                <span className="text-[9px] font-black tracking-[0.1em] uppercase">Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className={`${i < rating ? 'fill-black text-black' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-[11px] font-bold text-gray-400 ml-1.5 uppercase tracking-tighter">({rating}.0)</span>
            </div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{date}</span>
      </div>

      <div className="space-y-3">
        {title && <h4 className="text-base font-bold text-black leading-tight tracking-tight">{title}</h4>}
        <p className="text-gray-600 leading-relaxed text-sm font-medium">
          {text}
        </p>
      </div>

      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {images.map((img, idx) => (
            <div key={idx} className="w-24 h-24 bg-gray-50 rounded-sm overflow-hidden relative border border-gray-100 cursor-zoom-in group-hover:border-gray-300 transition-colors">
              <Image 
                src={img} 
                alt={`Review image ${idx}`} 
                fill 
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
