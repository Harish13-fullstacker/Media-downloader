import os
import uuid
import asyncio
import tempfile
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            logger.error(f"Could not delete {file_path}: {e}")

@app.get("/download")
async def download_media(url: str, format: str, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    temp_dir = tempfile.gettempdir()
    
    logger.info(f"Starting download: {url} (format: {format})")
    
    # Base options - NO format restrictions
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'retries': 10,
        'fragment_retries': 10,
    }
    
    file_ext = 'mp4'  # Default, will be updated based on actual file

    if format in ['mp3', 'ig_audio']:
        # For audio: get best audio, convert to MP3
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        # For video: DON'T force MP4, let yt-dlp pick best available
        # Remove merge_output_format to avoid conversion errors
        ydl_opts['format'] = 'bestvideo+bestaudio/best'
        # Don't set merge_output_format - let it be whatever format is available

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        files = [f for f in os.listdir(temp_dir) if f.startswith(task_id)]
        
        if not files:
            logger.error(f"No files created for task {task_id}")
            raise Exception("File not created by yt-dlp. Check Render logs for details.")
        
        file_path = os.path.join(temp_dir, files[0])
        
        # Get actual file extension
        actual_ext = file_path.split('.')[-1]
        if actual_ext != task_id:  # Make sure we got a real extension
            file_ext = actual_ext
        
        logger.info(f"File created: {file_path} ({os.path.getsize(file_path)} bytes, ext: {file_ext})")
        
        if os.path.getsize(file_path) == 0:
            raise Exception("Downloaded file is empty")
        
        background_tasks.add_task(delete_file, file_path)
        
        return FileResponse(
            path=file_path, 
            media_type='application/octet-stream', 
            filename=f"download.{file_ext}"
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Download failed: {error_msg}")
        
        if 'Requested format is not available' in error_msg:
            error_msg = 'This video format is not available. Try a different video.'
        elif 'Sign in to confirm' in error_msg:
            error_msg = 'YouTube bot detection. Please update cookies.txt'
        
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}
