FROM python:3.11-slim

# Install Node.js (REQUIRED for YouTube signature extraction)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install LATEST yt-dlp (critical - YouTube changes frequently)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade yt-dlp
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
