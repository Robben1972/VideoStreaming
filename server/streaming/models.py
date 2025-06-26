from django.db import models

# Create your models here.
class Video(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='videos/originals/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

class VideoResolution(models.Model):
    video = models.ForeignKey(Video, related_name='resolutions', on_delete=models.CASCADE)
    resolution = models.CharField(max_length=10)
    ready = models.BooleanField(default=False)
    total_chunks = models.IntegerField(default=0)