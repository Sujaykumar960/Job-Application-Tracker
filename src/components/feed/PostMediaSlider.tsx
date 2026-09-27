import React, { useState, useRef } from 'react';
import { PostMediaItem } from '../../types';
import { resolveMediaUrl } from '../../utils/media';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PostMediaSliderProps {
  media: PostMediaItem[];
}

export const PostMediaSlider: React.FC<PostMediaSliderProps> = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  if (!media || media.length === 0) return null;

  const total = media.length;
  const currentItem = media[currentIndex] || media[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection('prev');
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDirection('next');
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Prev
      handlePrev();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // If only 1 media item, render clean single frame with tight auto-height (no gap)
  if (total === 1) {
    const single = media[0];
    const isVideo = single.type === 'video';

    return (
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 flex items-center justify-center my-2 group">
        {isVideo ? (
          <video
            src={resolveMediaUrl(single.url)}
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-[520px] object-contain rounded-2xl bg-black"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div
            className="w-full flex items-center justify-center cursor-pointer relative"
            onClick={() => setIsLightboxOpen(true)}
          >
            <img
              src={resolveMediaUrl(single.url)}
              alt={single.originalFilename || 'Post image'}
              loading="lazy"
              className="w-full h-auto max-h-[520px] object-contain rounded-2xl transition hover:opacity-95"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              title="Expand photo"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Lightbox Modal */}
        {isLightboxOpen && !isVideo && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={resolveMediaUrl(single.url)}
              alt={single.originalFilename || 'Expanded image'}
              className="max-w-full max-h-[90vh] object-contain rounded-xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // Multi-media Slider / Carousel with tight auto-height (no gap)
  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 my-2 select-none group">
      {/* Top Counter Badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[11px] font-semibold shadow-md pointer-events-none">
        {currentItem.type === 'video' ? (
          <Film className="w-3.5 h-3.5 text-sky-400" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 text-white/80" />
        )}
        <span>
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Top Expand Button */}
      {currentItem.type !== 'video' && (
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-3 left-3 z-20 p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          title="Full view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Active Slide Display without Dead Gap */}
      <div
        className="w-full relative flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentItem.type === 'video' ? (
          <video
            key={currentItem.id || currentIndex}
            src={resolveMediaUrl(currentItem.url)}
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-[520px] object-contain rounded-2xl bg-black"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            key={currentItem.id || currentIndex}
            src={resolveMediaUrl(currentItem.url)}
            alt={currentItem.originalFilename || `Slide ${currentIndex + 1}`}
            loading="lazy"
            onClick={() => setIsLightboxOpen(true)}
            className={cn(
              'w-full h-auto max-h-[520px] object-contain rounded-2xl cursor-pointer hover:opacity-95 transition-all select-none animate-in fade-in duration-200',
              direction === 'next' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
            )}
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md active:scale-95 group-hover:opacity-100 sm:opacity-80"
            title="Previous media"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md active:scale-95 group-hover:opacity-100 sm:opacity-80"
            title="Next media"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Dots Indicator */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md shadow-md">
          {media.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDirection(dotIdx > currentIndex ? 'next' : 'prev');
                setCurrentIndex(dotIdx);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                dotIdx === currentIndex
                  ? 'w-5 bg-white shadow-xs'
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
              )}
              title={`Go to item ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox Modal for Full View */}
      {isLightboxOpen && currentItem.type !== 'video' && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-30"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Lightbox Counter */}
          <div className="absolute top-5 left-5 z-30 px-3 py-1 rounded-full bg-white/10 text-white font-mono text-xs font-semibold">
            {currentIndex + 1} / {total}
          </div>

          {/* Lightbox Navigation */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm flex items-center justify-center transition active:scale-95"
                title="Previous photo"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm flex items-center justify-center transition active:scale-95"
                title="Next photo"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Expanded Image */}
          <div
            className="max-w-5xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveMediaUrl(currentItem.url)}
              alt={currentItem.originalFilename || `Slide ${currentIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostMediaSlider;
