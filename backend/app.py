import os
import uuid
import asyncio
import tempfile
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp

# Setup logging
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
    """Run yt-dlp with better error handling"""
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise Exception("Could not extract video info")
            
            # Try downloading
            ydl.download([url])
            return True
    except Exception as e:
        logger.error(f"yt-dlp error: {str(e)}")
        raise

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
    
    # Base options
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,  # Show logs for debugging
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'retries': 10,
        'fragment_retries': 10,
        'socket_timeout': 30,
    }
    
    file_ext = 'mp4'

    if format in ['mp3', 'ig_audio']:
        # For MP3: Get best audio, convert to MP3
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        # For MP4: Try multiple approaches
        ydl_opts['format'] = 'best'
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        # Run yt-dlp
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        # Check if file was created
        files = [f for f in os.listdir(temp_dir) if f.startswith(task_id)]
        
        if not files:
            logger.error(f"No files created for task {task_id}")
            raise Exception("File not created by yt-dlp. Check Render logs for details.")
        
        file_path = os.path.join(temp_dir, files[0])
        logger.info(f"File created: {file_path} ({os.path.getsize(file_path)} bytes)")
        
        # Verify file is not empty
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
        elif 'File not created' in error_msg:
            error_msg = 'Download failed. The video may be blocked or unavailable.'
        
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}
