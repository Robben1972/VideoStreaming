from .models import Video, VideoResolution
from .serializers import VideoUploadSerializer
from rest_framework import views, status
from rest_framework.response import Response
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
import os
import signal
import subprocess

class VideoUploadView(views.APIView):
    def post(self, request):
        serializer = VideoUploadSerializer(data=request.data)
        if serializer.is_valid():
            video = serializer.save()
            process_video_in_background(video)
            return Response({'id': video.id, 'message': 'Video uploaded and processing started.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VideoResolutionsView(views.APIView):
    def get(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        resolutions = video.resolutions.all()
        return Response({
            'title': video.title,
            'resolutions': [r.resolution for r in resolutions if r.ready],
            'processing': [r.resolution for r in resolutions if not r.ready]
        })

import shutil
def process_video_in_background(video):
    resolutions = ['144', '240', '360', '720']
    input_path = video.file.path
    base_dir = os.path.join(settings.MEDIA_ROOT, f'videos/processed/{video.id}/')

    os.makedirs(base_dir, exist_ok=True)

    for res in resolutions:
        res_dir = os.path.join(base_dir, res)
        if os.path.exists(res_dir):
            shutil.rmtree(res_dir)

    for res in resolutions:
        res_dir = os.path.join(base_dir, res)
        os.makedirs(res_dir, exist_ok=True)

        playlist_path = os.path.join(res_dir, 'playlist.m3u8')

        subprocess.call([
            'ffmpeg', '-i', input_path,
            '-vf', f'scale=-2:{res}',       
            '-c:a', 'aac', '-ar', '48000',
            '-c:v', 'h264', '-profile:v', 'main', '-crf', '20',
            '-sc_threshold', '0',
            '-g', '48', '-keyint_min', '48',
            '-hls_time', '5',
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', os.path.join(res_dir, 'segment_%03d.ts'),
            playlist_path
        ])

        if os.path.exists(playlist_path):
            VideoResolution.objects.create(video=video, resolution=res, ready=True, total_chunks=0)

    master_playlist_path = os.path.join(base_dir, 'master.m3u8')
    with open(master_playlist_path, 'w') as f:
        f.write('#EXTM3U\n')
        for res in resolutions:
            height = res
            bandwidth = {
                '144': 150000,
                '240': 300000,
                '360': 800000,
                '720': 2000000
            }.get(res, 1000000)

            resolution_str = {
                '144': '256x144',
                '240': '426x240',
                '360': '640x360',
                '720': '1280x720'
            }.get(res, '640x360')

            f.write(f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution_str}\n')
            f.write(f'{res}/playlist.m3u8\n')



class AllVideosView(views.APIView):
    def get(self, request):
        videos = Video.objects.all()
        data = [{'id': video.id, 'title': video.title} for video in videos]
        return Response(data)
    

LIVE_DIR = os.path.join('media', 'live')
LIVE_PID_FILE = 'live_ffmpeg.pid'

class StartLiveView(views.APIView):
    def get(self, request):
        # Очистить старые данные
        for res in ['144p', '360p', '720p']:
            res_dir = os.path.join(LIVE_DIR, res)
            if os.path.exists(res_dir):
                shutil.rmtree(res_dir)
            os.makedirs(res_dir, exist_ok=True)

        os.makedirs(LIVE_DIR, exist_ok=True)

        # Команда ffmpeg
        command = [
            'ffmpeg',
            '-f', 'v4l2', '-thread_queue_size', '512', '-framerate', '25', '-video_size', '640x480', '-i', '/dev/video0',
            '-f', 'alsa', '-thread_queue_size', '512', '-i', 'default',        
            '-filter_complex',
            '[0:v]split=3[v1][v2][v3];'
            '[v1]scale=w=trunc(oh*a/2)*2:h=144[v1out];'
            '[v2]scale=w=trunc(oh*a/2)*2:h=360[v2out];'
            '[v3]scale=w=trunc(oh*a/2)*2:h=720[v3out]',

            
            '-map', '[v1out]', '-map', '1:a',
            '-c:v:0', 'libx264', '-profile:v:0', 'baseline', '-level:v:0', '3.0',
            '-b:v:0', '300k', '-pix_fmt:v:0', 'yuv420p', '-c:a:0', 'aac', '-ar', '44100',
            '-f', 'hls', '-hls_time', '4', '-hls_list_size', '6',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_segment_filename', os.path.join(LIVE_DIR, '144p', 'segment_%03d.ts'),
            os.path.join(LIVE_DIR, '144p', 'playlist.m3u8'),

            # 360p
            '-map', '[v2out]', '-map', '1:a',
            '-c:v:1', 'libx264', '-profile:v:1', 'baseline', '-level:v:1', '3.0',
            '-b:v:1', '800k', '-pix_fmt:v:1', 'yuv420p', '-c:a:1', 'aac', '-ar', '44100',
            '-f', 'hls', '-hls_time', '4', '-hls_list_size', '6',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_segment_filename', os.path.join(LIVE_DIR, '360p', 'segment_%03d.ts'),
            os.path.join(LIVE_DIR, '360p', 'playlist.m3u8'),

            # 720p
            '-map', '[v3out]', '-map', '1:a',
            '-c:v:2', 'libx264', '-profile:v:2', 'baseline', '-level:v:2', '3.0',
            '-b:v:2', '1500k', '-pix_fmt:v:2', 'yuv420p', '-c:a:2', 'aac', '-ar', '44100',
            '-f', 'hls', '-hls_time', '4', '-hls_list_size', '6',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_segment_filename', os.path.join(LIVE_DIR, '720p', 'segment_%03d.ts'),
            os.path.join(LIVE_DIR, '720p', 'playlist.m3u8')
        ]

        # Запуск ffmpeg
        process = subprocess.Popen(command)

        # Сохранить PID
        with open(LIVE_PID_FILE, 'w') as f:
            f.write(str(process.pid))

        # Создать master.m3u8
        master_path = os.path.join(LIVE_DIR, 'master.m3u8')
        with open(master_path, 'w') as f:
            f.write('#EXTM3U\n')
            f.write('#EXT-X-VERSION:3\n')
            f.write('#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=256x144,CODECS="avc1.42E01E,mp4a.40.2"\n')
            f.write('144p/playlist.m3u8\n')
            f.write('#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42E01E,mp4a.40.2"\n')
            f.write('360p/playlist.m3u8\n')
            f.write('#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720,CODECS="avc1.42E01E,mp4a.40.2"\n')
            f.write('720p/playlist.m3u8\n')

        return Response({'status': 'Live started', 'pid': process.pid})



class StopLiveView(views.APIView):
    def get(self, request):
        if not os.path.exists(LIVE_PID_FILE):
            return Response({'error': 'Live is not running'}, status=400)

        with open(LIVE_PID_FILE, 'r') as f:
            pid = int(f.read())

        try:
            os.kill(pid, signal.SIGTERM)
            os.remove(LIVE_PID_FILE)
            shutil.rmtree(LIVE_DIR, ignore_errors=True)
            return Response({'status': 'Live stopped'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


