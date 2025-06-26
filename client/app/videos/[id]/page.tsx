'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Hls from 'hls.js';
import { Loader2, AlertCircle, Film } from 'lucide-react';

export default function VideoPlayerPage() {
  const { id } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [resolutions, setResolutions] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string[]>([]);
  const [currentRes, setCurrentRes] = useState<string>('auto');
  const [title, setTitle] = useState<string>('');
  const [levelsMap, setLevelsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    // 1. Get available resolutions
    axios.get(`http://localhost:8000/video/${id}/resolutions/`).then(res => {
      setResolutions(res.data.resolutions);
      setProcessing(res.data.processing);
      setTitle(res.data.title);
      setCurrentRes('auto');
    });

    // 2. Load master.m3u8 once
    const video = videoRef.current;
    if (video && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.loadSource(`http://localhost:8000/media/videos/processed/${id}/master.m3u8`);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const map: Record<string, number> = {};
        data.levels.forEach((level, index) => {
          if (level.height) {
            map[level.height.toString()] = index;
          }
        });
        setLevelsMap(map);
      });
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [id]);

  const handleResolutionChange = (res: string) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (res === 'auto') {
      hls.nextLevel = -1;
      setCurrentRes('auto');
      console.log('Switched to auto quality');
      return;
    }

    const targetLevel = levelsMap[res];
    if (typeof targetLevel === 'number') {
      console.log(`Switching to ${res}p at next segment`);
      hls.nextLevel = targetLevel;
      setCurrentRes(res);
    } else {
      console.warn(`Level not found for ${res}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 flex justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Film size={28} />
          {title || 'Video Player'}
        </h1>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative aspect-video bg-gray-200">
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Resolution:
                </label>
                <select
                  value={currentRes}
                  onChange={e => handleResolutionChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="auto">Auto</option>
                  {resolutions.map(res => (
                    <option key={res} value={res}>{res}p</option>
                  ))}
                </select>
              </div>
              {processing.length > 0 && (
                <span className="text-sm text-gray-600">
                  Processing: {processing.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}