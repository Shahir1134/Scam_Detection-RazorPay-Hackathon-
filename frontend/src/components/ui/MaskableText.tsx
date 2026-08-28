import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MaskableTextProps {
  text: string;
  maskedText?: string;
  className?: string;
}

export const MaskableText: React.FC<MaskableTextProps> = ({ text, maskedText, className = '' }) => {
  const [isMasked, setIsMasked] = useState(true);
  
  const displayMasked = maskedText || (text && text.length > 4 ? 'XXXX' + text.slice(-4) : text);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono">{isMasked ? displayMasked : text}</span>
      <button 
        onClick={() => setIsMasked(!isMasked)}
        className="text-text-muted hover:text-text-secondary focus:outline-none"
        title={isMasked ? "Reveal" : "Hide"}
      >
        {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
};
