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
    """Run yt-dlp with multiple extraction attempts"""
    attempts = 0
    max_attempts = 3
    
    while attempts < max_attempts:
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Extract info first
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise Exception("Could not access video")
                
                logger.info(f"Video: {info.get('title', 'Unknown')}")
                logger.info(f"Duration: {info.get('duration', 'Unknown')}s")
                logger.info(f"Available formats: {len(info.get('formats', []))}")
                
                # Check if video is downloadable
                if info.get('is_live'):
                    raise Exception("Live streams cannot be downloaded")
                
                # Now download
                ydl.download([url])
                return True
        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e)
            attempts += 1
            logger.warning(f"Attempt {attempts}/{max_attempts} failed: {error_msg}")
            
            if attempts >= max_attempts:
                raise
            
            # Try with different options on retry
            if 'format' in error_msg.lower():
                ydl_opts['format'] = 'best'
                ydl_opts.pop('postprocessors', None)
            elif 'signature' in error_msg.lower():
                ydl_opts['extractor_args'] = {'youtube': {'player_client': ['web', 'web_embedded', 'android', 'ios']}}
            
            continue
        except Exception as e:
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
    
    # Base options - MAXIMUM COMPATIBILITY
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'retries': 10,
        'fragment_retries': 10,
        'socket_timeout': 30,
        'extractor_args': {
            'youtube': {
                'player_client': ['web', 'web_embedded', 'android', 'ios', 'tv']
            }
        },
    }
    
    file_ext = 'mp4'

    if format in ['mp3', 'ig_audio']:
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        file_ext = 'mp3'
    elif format in ['mp4', 'ig_video']:
        ydl_opts['format'] = 'bestvideo+bestaudio/best'
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        files = [f for f in os.listdir(temp_dir) if f.startswith(task_id)]
        
        if not files:
            logger.error(f"No files created for task {task_id}")
            raise Exception("File not created. Video may be blocked.")
        
        file_path = os.path.join(temp_dir, files[0])
        file_size = os.path.getsize(file_path)
        logger.info(f"File created: {file_path} ({file_size} bytes)")
        
        if file_size == 0:
            raise Exception("Downloaded file is empty")
        
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
        
        if 'Requested format is not available' in error_msg:
            error_msg = 'YouTube blocked this download. Try a different video or use a VPN.'
        elif 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
            error_msg = 'YouTube detected automated access. Update cookies.txt or try later.'
        elif 'Live stream' in error_msg:
            error_msg = 'Live streams cannot be downloaded.'
        elif 'age-restricted' in error_msg.lower() or 'private' in error_msg.lower():
            error_msg = 'This video is restricted and cannot be downloaded.'
        
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
