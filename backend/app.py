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
    
    print(f"🎯 Downloading: {url}")
    print(f" Format: {format}")
    
    # Base options - minimal and flexible
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,  # Show logs for debugging
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'ignoreerrors': True,
        'retries': 10,
        'fragment_retries': 10,
        'extractor_retries': 5,
        # Use web client to bypass restrictions
        'extractor_args': {
            'youtube': {
                'player_client': ['web', 'web_creator', 'android', 'ios'],
            }
        },
    }
    
    file_ext = 'mp4'

    if format in ['mp3', 'ig_audio']:
        # For MP3: Get best audio, convert to MP3
        # Don't use format string - use format_sort instead
        ydl_opts['format_sort'] = ['acodec:mp3', 'br', 'res', 'fps']
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        # For MP4: Use format_sort (never throws "not available" error)
        # This sorts by: MP4 extension first, then resolution, then FPS, then bitrate
        ydl_opts['format_sort'] = ['ext:mp4:m4a', 'res', 'fps', 'br']
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        # List files in temp directory
        all_files = os.listdir(temp_dir)
        print(f"📁 Files in temp: {all_files}")
        
        files = [f for f in all_files if f.startswith(task_id)]
        print(f"🎯 Matching files: {files}")
        
        if not files:
            raise Exception("File not created by yt-dlp. Check Render logs for details.")
        
        file_path = os.path.join(temp_dir, files[0])
        print(f"✅ File created: {file_path}")
        
        background_tasks.add_task(delete_file, file_path)
        
        return FileResponse(
            path=file_path, 
            media_type='application/octet-stream', 
            filename=f"download.{file_ext}"
        )
    except Exception as e:
        error_msg = str(e)
        print(f" Error: {error_msg}")
        if 'Requested format is not available' in error_msg:
            error_msg = 'This video format is not available. Try a different video.'
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}
