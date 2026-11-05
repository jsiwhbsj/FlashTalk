import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface WaveformAudioPlayerProps {
  src: string;
  isOutgoing?: boolean;
  isLightMode?: boolean;
  label?: string;
}

const BAR_HEIGHTS = [
  28, 52, 38, 75, 92, 44, 65, 85, 35, 60, 95, 70, 40, 80, 55, 90, 48, 62, 30, 74, 88, 50, 42, 68, 36, 58, 45, 32,
];

export const WaveformAudioPlayer: React.FC<WaveformAudioPlayerProps> = ({
  src,
  isOutgoing = false,
  isLightMode = false,
  label,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (sec: number) => {
    if (!sec || !isFinite(sec)) return '00:08';
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 min-w-[210px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isOutgoing
            ? 'bg-white text-sky-600 hover:bg-sky-50'
            : isLightMode
            ? 'bg-sky-600 text-white hover:bg-sky-700'
            : 'bg-sky-500 text-white hover:bg-sky-400'
        }`}
        title={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono tabular-nums font-medium ${
              isOutgoing ? 'text-sky-100' : isLightMode ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
          <div className="flex items-center gap-[2px] h-6 flex-1">
            {BAR_HEIGHTS.map((h, idx) => {
              const barPct = (idx / BAR_HEIGHTS.length) * 100;
              const isActive = barPct <= progress;
              return (
                <div
                  key={idx}
                  style={{ height: `${Math.max(20, h)}%` }}
                  className={`w-[2.5px] rounded-full transition-colors duration-150 ${
                    isOutgoing
                      ? isActive
                        ? 'bg-white'
                        : 'bg-white/40'
                      : isActive
                      ? 'bg-sky-400'
                      : isLightMode
                      ? 'bg-slate-300'
                      : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
        </div>
        {label && (
          <span
            className={`text-[10px] truncate ${
              isOutgoing ? 'text-sky-100/80' : isLightMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
