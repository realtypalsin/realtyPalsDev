'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Property } from '@/types/property';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatPriceCr } from '@/lib/format';
import { API_BASE } from '@/lib/env';
import { Heart, ChevronLeft, ChevronRight, MessageCircle, LineChart, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface PropertyCardProps {
  property: Property;
  userId?: string | null;
  autoPlay?: boolean;
  onAuthRequired?: () => void;
}

export default function PropertyCard({ property, userId, autoPlay = true, onAuthRequired }: PropertyCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const images: string[] = [];
  if (property.image_url) images.push(property.image_url);
  if ((property as any).images?.length) {
    (property as any).images.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img.url || img.image_url;
      if (url && !images.includes(url)) images.push(url);
    });
  }

  useEffect(() => {
    if (images.length > 1 && isInView && autoPlay) {
      const interval = setInterval(() => {
        setCarouselIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        setImgLoaded(false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [images.length, isInView, autoPlay]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    const element = document.getElementById(`property-card-${property.id}`);
    if (element) observer.observe(element);
    return () => { if (element) observer.unobserve(element); };
  }, [property.id]);

  const handleClick = () => router.push(`/property/${property.id}`);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { onAuthRequired?.(); return; }
    if (saving) return;
    setSaving(true);
    try {
      if (isSaved) {
        await fetch(`${API_BASE}/saved-properties/${property.id}`, {
          method: 'DELETE',
          headers: { 'X-User-Id': userId },
        });
        setIsSaved(false);
      } else {
        await fetch(`${API_BASE}/saved-properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({ property_id: property.id }),
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCarouselNav = useCallback((e: React.MouseEvent, dir: 'prev' | 'next') => {
    e.stopPropagation();
    setCarouselIdx(prev => {
      if (dir === 'next') return prev < images.length - 1 ? prev + 1 : 0;
      return prev > 0 ? prev - 1 : images.length - 1;
    });
    setImgLoaded(false);
  }, [images.length]);

  const displayName = property.project_name || property.builder;
  const isLiveResult = String(property.id).startsWith('google-place-');
  const tier = (property as any).tier as string | undefined;
  const address = (property as any).address as string | undefined;

  const locationLine = property.sector?.name
    ? `${property.sector.name}${property.sector.city ? `, ${property.sector.city}` : ''}`
    : address || null;

  const sectorLabel = property.sector?.name || null;
  const configLabel = property.bhk != null ? `${property.bhk} BHK` : null;
  const sqftLabel = property.size_sqft != null
    ? `${property.size_sqft.toLocaleString('en-IN')} sq.ft`
    : null;

  const statusLabel = property.status === 'ready'
    ? 'Ready to Move'
    : property.status === 'under_construction'
    ? 'Under Construction'
    : null;
  const statusStyle = property.status === 'ready'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';

  const formatCrRange = (low: number, high: number) => {
    const toCr = (v: number) => v / 10000000;
    const fmt = (v: number) => v >= 1 ? `${v.toFixed(2).replace(/\.00$/, '')} Cr` : `${(v * 100).toFixed(0)} L`;
    return `₹${fmt(toCr(low))} – ${fmt(toCr(high))}`;
  };

  const minPrice = (property as any).minPrice as number | undefined;
  const maxPrice = (property as any).maxPrice as number | undefined;
  const hasPriceRange = minPrice != null && maxPrice != null && minPrice !== maxPrice;
  const priceLabel = hasPriceRange ? 'Price range' : 'Starting price';

  const displayPrice = property.validation?.market_range
    ? formatCrRange(property.validation.market_range.low, property.validation.market_range.high)
    : property.price != null
    ? formatPriceCr(property.price)
    : null;

  const possessionDate = (property as any).possession_date as string | undefined;
  const possessionLabelRaw = (property as any).possession_label as string | undefined;
  const showPossession = property.status === 'under_construction' || property.status === 'new_launch';
  const possessionDisplay = (() => {
    if (!showPossession) return null;
    if (possessionDate) {
      const d = new Date(possessionDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    }
    return possessionLabelRaw ?? null;
  })();

  const highlights = property.highlights?.length ? property.highlights : null;
  const currentImgUrl = images[carouselIdx] || null;
  const hasTags = sectorLabel || configLabel || statusLabel || sqftLabel;

  return (
    <motion.div
      id={`property-card-${property.id}`}
      onClick={handleClick}
      className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] transition-shadow duration-300 cursor-pointer border border-gray-100 dark:border-gray-800 flex flex-col"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      {/* ── Image Section ── */}
      <div
        className="relative w-full h-48 overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || images.length <= 1) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (delta < -50) {
            setCarouselIdx(prev => prev < images.length - 1 ? prev + 1 : 0);
            setImgLoaded(false);
          } else if (delta > 50) {
            setCarouselIdx(prev => prev > 0 ? prev - 1 : images.length - 1);
            setImgLoaded(false);
          }
        }}
      >
        {!imgLoaded && currentImgUrl && !imgError && (
          <div className="absolute inset-0 img-skeleton z-[1]" />
        )}

        {currentImgUrl && !imgError ? (
          <Image
            src={currentImgUrl}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}

        {/* Bottom scrim for depth */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

        {/* Top-left: rank + match score */}
        {(property.property_index !== undefined || property.match_score !== undefined) && (
          <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
            {property.property_index !== undefined && (
              <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold rounded-full leading-5">
                #{property.property_index + 1}
              </span>
            )}
            {property.match_score !== undefined && (
              <span className="px-2 py-0.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full leading-5">
                {property.match_score}% Match
              </span>
            )}
          </div>
        )}

        {/* Top-right: tier badge */}
        {tier && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2.5 py-0.5 bg-white/85 backdrop-blur-sm text-violet-700 border border-violet-200 text-[10px] font-semibold rounded-full tracking-wide shadow-sm">
              {tier}
            </span>
          </div>
        )}

        {/* Carousel controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => handleCarouselNav(e, 'prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/65 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button
              onClick={(e) => handleCarouselNav(e, 'next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/65 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              aria-label="Next image"
            >
              <ChevronRight size={14} className="text-white" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCarouselIdx(idx); setImgLoaded(false); }}
                  className={`h-1 rounded-full transition-all duration-200 ${idx === carouselIdx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/75 w-1.5'}`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Content Section ── */}
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4 gap-2.5">

        {/* Header: name + save button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug truncate">
              {displayName}
            </h3>
            {property.project_name && property.builder && property.builder !== displayName && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate font-medium">
                {property.builder}
              </p>
            )}
            {locationLine && (
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {locationLine}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`mt-0.5 w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border transition-all duration-200 ${
              isSaved
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-200 dark:hover:border-red-800'
            }`}
            aria-label={isSaved ? 'Unsave property' : 'Save property'}
          >
            <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Tag Row */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5">
            {sectorLabel && (
              <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-medium rounded-full">
                {sectorLabel}
              </span>
            )}
            {configLabel && (
              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 text-[10px] font-medium rounded-full">
                {configLabel}
              </span>
            )}
            {sqftLabel && (
              <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 text-[10px] font-medium rounded-full">
                {sqftLabel}
              </span>
            )}
            {statusLabel && (
              <span className={`inline-flex items-center px-2 py-0.5 border text-[10px] font-medium rounded-full ${statusStyle}`}>
                {statusLabel}
              </span>
            )}
            {possessionDisplay && (
              <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] font-medium rounded-full">
                Possession: {possessionDisplay}
              </span>
            )}
          </div>
        )}

        {/* Highlights */}
        {highlights && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            {highlights.join(' · ')}
          </p>
        )}

        {/* Intelligence chips — only when backed by validated data */}
        {(property.validation?.verdict || property.validation?.confidence_level) && (
          <div className="flex gap-2">
            {property.validation?.verdict && (
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Fair Value</p>
                <p className={`text-[11px] font-semibold ${
                  property.validation.verdict === 'Within market' ? 'text-emerald-600 dark:text-emerald-400' :
                  property.validation.verdict === 'Slightly high' ? 'text-amber-600 dark:text-amber-400' :
                  property.validation.verdict === 'Aggressive' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
                }`}>
                  {property.validation.verdict === 'Within market' ? 'Fair' :
                   property.validation.verdict === 'Slightly high' ? 'Slightly High' :
                   property.validation.verdict === 'Aggressive' ? 'Overpriced' : 'Market Range'}
                </p>
              </div>
            )}
            {property.validation?.confidence_level && (
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Confidence</p>
                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">
                  {property.validation.confidence_level}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-end justify-between gap-2">
          {/* Price block */}
          <div className="min-w-0">
            {displayPrice ? (
              <>
                <p className="text-[10px] text-gray-400 leading-none mb-1">{priceLabel}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none tabular-nums">
                  {displayPrice}
                  {property.price != null && !property.validation?.market_range && (
                    <span className="text-[10px] font-normal text-gray-400 ml-0.5">*</span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Price on request</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isLiveResult) {
                  const q = encodeURIComponent(`${displayName} ${address || ''}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
                } else {
                  handleClick();
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="View details"
            >
              <Info size={12} />
              <span>Details</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(isLiveResult ? '/value-estimator' : `/value-estimator?propertyId=${property.id}`);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors cursor-pointer"
              aria-label="Estimate value"
            >
              <LineChart size={12} />
              <span>Estimate</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const text = property.property_index != null
                  ? `Tell me more about Property ${property.property_index + 1}: ${displayName}`
                  : `Tell me more about ${displayName}`;
                window.dispatchEvent(new CustomEvent('realtypals:ask-ai', { detail: { text } }));
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Ask AI about this property"
            >
              <MessageCircle size={12} />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
