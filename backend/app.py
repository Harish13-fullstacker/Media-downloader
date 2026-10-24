import os
import uuid
import asyncio
import tempfile
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_ytdlp(url, ydl_opts):
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

def delete_file(file_path):
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Could not delete {file_path}: {e}")

@app.get("/download")
async def download_media(url: str, format: str, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    temp_dir = tempfile.gettempdir()
    
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'cookiefile': 'cookies.txt',
    }
    file_ext = 'mp4'

    # More flexible format selection
    if format in ['mp3', 'ig_audio']:
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        # Try MP4 first, then fall back to any available video
        ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        files = [f for f in os.listdir(temp_dir) if f.startswith(task_id)]
        if not files:
            raise Exception("File not created by yt-dlp")
        
        file_path = os.path.join(temp_dir, files[0])
        background_tasks.add_task(delete_file, file_path)
        
        return FileResponse(
            path=file_path, 
            media_type='application/octet-stream', 
            filename=f"download.{file_ext}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}
