import React, { useMemo } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  volume: number; // 0 to 1
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  volume,
  barCount = 28,
}) => {
  // Generate random heights based on volume for a rich responsive waveform
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      // Create a nice parabolic or wave curve
      const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
      return centerFactor;
    });
  }, [barCount]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-md px-4">
      {bars.map((factor, index) => {
        // Compute bar height based on recording state and volume
        let heightPercent = 12;
        if (isRecording) {
          // Dynamic jitter + volume
          const jitter = Math.sin(Date.now() / 150 + index) * 0.25 + 0.75;
          const reactiveHeight = Math.max(15, (volume * 100 * factor * jitter) + (factor * 25));
          heightPercent = Math.min(100, Math.max(12, reactiveHeight));
        }

        return (
          <div
            key={index}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isRecording
                ? 'bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                : 'bg-zinc-800'
            }`}
            style={{
              height: `${heightPercent}%`,
              opacity: isRecording ? Math.max(0.4, factor + volume * 0.5) : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};
