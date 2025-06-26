'use client';

export default function LiveStreamPage() {
  const handleStart = async () => {
    await fetch('http://localhost:8000/start-live/'); // вызов subprocess для ffmpeg
  };

  const handleStop = async () => {
    await fetch('http://localhost:8000/stop-live/'); // остановка ffmpeg
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Start Live</h1>
      <button
        onClick={handleStart}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Start Live
      </button>
      <button
        onClick={handleStop}
        className="mt-4 ml-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Stop Live
      </button>
    </div>
    );
}