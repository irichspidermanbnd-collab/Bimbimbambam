import React, { useState } from 'react';
import { Crown } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  aspectClass?: string;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  caption,
  className = '',
  aspectClass = 'aspect-[16/9]',
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`flex flex-col ${className}`}>
      <div
        className={`relative w-full overflow-hidden rounded-sm border border-[#E4E0D8] bg-[#EFECE4] ${aspectClass}`}
      >
        {!failed ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EFECE4] to-[#E2DDD2]">
            <Crown className="w-8 h-8 text-[#1B4D3E] mb-2" strokeWidth={1.5} />
            <p className="text-xs font-medium text-[#57534E] max-w-xs">{alt}</p>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-xs font-serif italic text-[#57534E]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
