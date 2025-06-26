'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function WatchLivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = 'http://localhost:8000/media/live/master.m3u8';

    fetch(streamUrl, { method: 'HEAD' })
      .then(res => {
        if (!res.ok) {
          setError('Live stream not found.');
          return;
        }

        if (Hls.isSupported() && video) {
          const hls = new Hls();
          hls.attachMedia(video);
          hls.loadSource(streamUrl);
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.log(data);
            if (data.fatal) {
              setError('Live stream unavailable or stopped.');
            }
          });
        } else if (video?.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.onerror = () => setError('Live stream unavailable or stopped.');
        }
      })
      .catch(() => setError('Live stream not found.'));

    return () => {
      if (video && Hls.isSupported() && videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Watch Live</h1>
      {error && <div className="text-red-600">{error}</div>}
      <video ref={videoRef} controls className="w-full max-w-2xl" />
    </div>
  );
}