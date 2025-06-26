'use client';

import useSWR from 'swr';
import Link from 'next/link';
import axios from 'axios';
import { Video, AlertCircle, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export default function VideosListPage() {
  const { data, error, isLoading } = useSWR('http://localhost:8000/videos/', fetcher);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = data?.filter((video: { title: string }) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">All Videos</h1>
          <Link
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Upload size={20} />
            Upload New Video
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search videos by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            Error loading videos. Please try again later.
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        )}

        {!isLoading && !error && filteredVideos?.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            {searchQuery
              ? 'No videos match your search.'
              : 'No videos available. Upload one to get started!'}
          </div>
        )}

        {!isLoading && !error && filteredVideos?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map(
              (video: {
                id: number;
                title: string;
                thumbnail?: string;
                created_at?: string;
              }) => (
                <Link
                  key={video.id}
                  href={`/videos/${video.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-video bg-gray-200">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                      {video.title}
                    </h3>
                    {video.created_at && (
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded: {new Date(video.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}