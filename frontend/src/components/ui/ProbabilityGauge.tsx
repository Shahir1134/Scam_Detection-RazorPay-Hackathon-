import React from 'react';

interface ProbabilityGaugeProps {
  probability: number; // 0 to 1
  size?: number;
}

export const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({ probability, size = 120 }) => {
  const radius = (size - 20) / 2;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (probability * circumference);
  
  let color = '#22c55e'; // low
  if (probability > 0.4) color = '#eab308'; // medium
  if (probability > 0.7) color = '#f97316'; // high
  if (probability > 0.9) color = '#ef4444'; // critical

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + 10} className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M 10 ${size/2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size/2}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Foreground Arc */}
        <path
          d={`M 10 ${size/2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size/2}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {(probability * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
