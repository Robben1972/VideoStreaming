from django.contrib import admin
from .models import Video, VideoResolution

# Register your models here.
@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    pass

@admin.register(VideoResolution)
class VideoResolutionAdmin(admin.ModelAdmin):
    pass
