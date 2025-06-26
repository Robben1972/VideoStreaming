from django.urls import path
from .views import VideoUploadView, VideoResolutionsView, AllVideosView, StartLiveView, StopLiveView

urlpatterns = [
    path('video/', VideoUploadView.as_view(), name='video-upload'),
    path('video/<int:pk>/resolutions/', VideoResolutionsView.as_view(), name='video-resolutions'),
    path('videos/', AllVideosView.as_view(), name='all-videos'),
    path('start-live/', StartLiveView.as_view(), name='start-live'),
    path('stop-live/', StopLiveView.as_view(), name='stop-live'),
]
