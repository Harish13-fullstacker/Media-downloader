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
    """Run yt-dlp with comprehensive error handling"""
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first to check availability
            info = ydl.extract_info(url, download=False)
            if not info:
                raise Exception("Could not access video")
            
            logger.info(f"Video: {info.get('title', 'Unknown')}")
            logger.info(f"Available formats: {len(info.get('formats', []))}")
            
            # Check if video has downloadable content
            formats = info.get('formats', [])
            if not formats:
                raise Exception("No downloadable formats available - video may be restricted")
            
            # Now download
            ydl.download([url])
            return True
    except Exception as e:
        error_msg = str(e)
        logger.error(f"yt-dlp error: {error_msg}")
        
        # If format not available, try with most basic options
        if 'Requested format is not available' in error_msg or 'Signature solving failed' in error_msg:
            logger.warning("Retrying with basic format...")
            ydl_opts['format'] = 'best'
            ydl_opts.pop('postprocessors', None)  # Remove postprocessors
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            return True
        raise

def delete_file(file_path):
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"Deleted: {file_path}")
        except Exception as e:
            logger.error(f"Could not delete {file_path}: {e}")

@app.get("/download")
async def download_media(url: str, format: str, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    temp_dir = tempfile.gettempdir()
    
    logger.info(f"Starting download: {url} (format: {format})")
    
    # Base options - MINIMAL and FLEXIBLE
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'retries': 5,
        'fragment_retries': 5,
        'socket_timeout': 30,
        'extract_flat': False,
    }
    
    file_ext = 'mp4'

    if format in ['mp3', 'ig_audio']:
        # For MP3: Get best audio only
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        # For MP4: Use SIMPLE format - let yt-dlp pick best
        ydl_opts['format'] = 'bestvideo+bestaudio/best'
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        files = [f for f in os.listdir(temp_dir) if f.startswith(task_id)]
        
        if not files:
            logger.error(f"No files created for task {task_id}")
            raise Exception("File not created. Video may be blocked or region-restricted.")
        
        file_path = os.path.join(temp_dir, files[0])
        file_size = os.path.getsize(file_path)
        logger.info(f"File created: {file_path} ({file_size} bytes)")
        
        if file_size == 0:
            raise Exception("Downloaded file is empty")
        
        # Get actual extension
        actual_ext = file_path.split('.')[-1]
        if actual_ext and actual_ext != task_id:
            file_ext = actual_ext
        
        background_tasks.add_task(delete_file, file_path)
        
        return FileResponse(
            path=file_path, 
            media_type='application/octet-stream', 
            filename=f"download.{file_ext}"
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Download failed: {error_msg}")
        
        # User-friendly messages
        if 'Requested format is not available' in error_msg:
            error_msg = 'This video format is not available. The video may be age-restricted, private, or region-blocked.'
        elif 'Signature solving failed' in error_msg:
            error_msg = 'YouTube signature extraction failed. Please try a different video.'
        elif 'bot' in error_msg.lower() or 'confirm your age' in error_msg.lower():
            error_msg = 'YouTube blocked this request. Update cookies.txt or try a different video.'
        elif 'No downloadable formats' in error_msg:
            error_msg = 'This video cannot be downloaded. It may be a live stream or have download restrictions.'
        
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "yt_dlp_version": yt_dlp.version.__version__
    }
