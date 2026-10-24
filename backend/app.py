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
    
    print(f"Starting download for: {url}")
    print(f"Format requested: {format}")
    print(f"Temp directory: {temp_dir}")
    
    # Base options
    ydl_opts = {
        'outtmpl': f'{temp_dir}/{task_id}.%(ext)s',
        'quiet': False,  # Show logs for debugging
        'no_warnings': False,
        'cookiefile': 'cookies.txt',
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'retries': 10,
        'fragment_retries': 10,
        'extractor_retries': 5,
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
        ydl_opts['format'] = 'best'
        ydl_opts['merge_output_format'] = 'mp4'
        file_ext = 'mp4'

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_ytdlp, url, ydl_opts)
        
        # List files in temp directory for debugging
        all_files = os.listdir(temp_dir)
        print(f"All files in temp dir: {all_files}")
        
        files = [f for f in all_files if f.startswith(task_id)]
        print(f"Files matching task_id: {files}")
        
        if not files:
            raise Exception(f"File not created by yt-dlp. Check Render logs for yt-dlp errors.")
        
        file_path = os.path.join(temp_dir, files[0])
        print(f"File created: {file_path}")
        
        background_tasks.add_task(delete_file, file_path)
        
        return FileResponse(
            path=file_path, 
            media_type='application/octet-stream', 
            filename=f"download.{file_ext}"
        )
    except Exception as e:
        error_msg = str(e)
        print(f"Error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
def root():
    return {"message": "Media Downloader API is running"}
