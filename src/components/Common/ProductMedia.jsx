import React, { useState, useEffect } from 'react';
import { isImageSrc } from '../../utils/helpers';

export default function ProductMedia({
  product,
  variant = 'card', // 'card' | 'thumb' | 'hero'
  className = '',
  topRightOverlay = null,
  topLeftOverlay = null,
  bottomRightOverlay = null,
  bottomLeftOverlay = null,
}) {
  const [imgError, setImgError] = useState(false);

  const imageVal = product?.image || (product?.type === 'pharmacy' ? '💊' : '📦');
  const isPhoto = isImageSrc(imageVal) && !imgError;
  const isPharma = product?.type === 'pharmacy';
  const isDeli = product?.isDeli || product?.isWeighted;

  useEffect(() => {
    setImgError(false);
  }, [imageVal]);

  const fallbackEmoji = isPharma ? '💊' : isDeli ? '🧀' : '📦';

  const auraClass = isPharma
    ? 'from-cyan-400/20 via-sky-300/10 to-transparent dark:from-cyan-500/20 dark:via-blue-900/20 dark:to-slate-950/80'
    : isDeli
    ? 'from-amber-400/25 via-orange-300/10 to-transparent dark:from-amber-500/20 dark:via-orange-950/20 dark:to-slate-950/80'
    : 'from-emerald-400/20 via-teal-300/10 to-transparent dark:from-emerald-500/20 dark:via-teal-950/20 dark:to-slate-950/80';

  const lightBackdrop = isPharma
    ? 'bg-gradient-to-br from-cyan-50 via-sky-50/80 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950'
    : isDeli
    ? 'bg-gradient-to-br from-amber-50 via-orange-50/80 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950'
    : 'bg-gradient-to-br from-emerald-50 via-teal-50/80 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950';

  if (variant === 'thumb') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 ${lightBackdrop} ${
          className || 'w-10 h-10 sm:w-11 sm:h-11'
        }`}
      >
        {isPhoto ? (
          <img
            src={imageVal}
            alt={product?.name || 'صورة المنتج'}
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full ${
              product?.imageFit === 'contain' ? 'object-contain p-0.5 bg-white dark:bg-slate-900' : 'object-cover'
            }`}
          />
        ) : (
          <span className="text-xl sm:text-2xl leading-none select-none">
            {isImageSrc(imageVal) ? fallbackEmoji : imageVal}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`product-card-stage w-full flex-shrink-0 ${
        variant === 'hero' ? 'h-44 sm:h-48' : 'min-h-[100px] aspect-[16/10] sm:aspect-[4/3]'
      } ${lightBackdrop} ${className}`}
    >
      {isPhoto ? (
        <>
          <img
            src={imageVal}
            alt={product?.name || 'صورة المنتج'}
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full transition-transform duration-300 ease-out group-hover:scale-105 ${
              product?.imageFit === 'contain'
                ? 'object-contain p-2 bg-white dark:bg-slate-900/95'
                : 'object-cover object-center'
            }`}
          />
          {/* Subtle top & bottom gradient scrims so overlaid badges remain crisp on bright or dark photos */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-950/25 to-transparent dark:from-slate-950/60" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/30 via-slate-950/10 to-transparent dark:from-slate-950/75 dark:via-slate-950/25" />
        </>
      ) : (
        <div className={`relative w-full h-full flex items-center justify-center bg-gradient-to-br ${auraClass}`}>
          {/* Decorative Halo & Subtle Geometric Ring */}
          <div
            className={`absolute w-24 h-24 rounded-full blur-2xl opacity-50 transition-opacity duration-300 group-hover:opacity-80 ${
              isPharma ? 'bg-cyan-400/35' : isDeli ? 'bg-amber-400/35' : 'bg-emerald-400/35'
            }`}
          />
          <div className="absolute w-20 h-20 rounded-full border border-slate-400/15 dark:border-white/10 group-hover:scale-110 transition-transform duration-300" />
          <span className="relative z-10 text-4xl sm:text-5xl drop-shadow-md select-none transition-transform duration-300 group-hover:scale-110">
            {isImageSrc(imageVal) ? fallbackEmoji : imageVal}
          </span>
        </div>
      )}

      {/* Corner Badge Overlays */}
      {topRightOverlay && (
        <div className="absolute top-2 right-2 z-20 flex flex-col items-start gap-1">
          {topRightOverlay}
        </div>
      )}
      {topLeftOverlay && (
        <div className="absolute top-2 left-2 z-20 flex flex-col items-end gap-1">
          {topLeftOverlay}
        </div>
      )}
      {bottomRightOverlay && (
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
          {bottomRightOverlay}
        </div>
      )}
      {bottomLeftOverlay && (
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1">
          {bottomLeftOverlay}
        </div>
      )}
    </div>
  );
}
