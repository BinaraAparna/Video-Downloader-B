from flask import Flask, render_template, request, jsonify, send_file
from yt_dlp import YoutubeDL
import os
import uuid
import subprocess

app = Flask(__name__)
app.config['DOWNLOAD_FOLDER'] = 'static/downloads'

def get_video_info(url):
    ydl_opts = {
        'quiet': True,
        'format': 'bestvideo[height<=2160]+bestaudio/best',  # Allow up to 4K resolution
        'extract_flat': True
    }
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        
        # Create a dictionary to store unique formats
        unique_formats = {}
        
        # Filter formats and remove duplicates
        for f in info['formats']:
            if f.get('vcodec') != 'none' and f['ext'] in ['mp4', 'webm']:
                resolution = f.get('format_note', 'Unknown')
                if resolution in ['360p', '480p', '720p', '1080p', '1440p', '2160p']:
                    # Use resolution and ext as key to avoid duplicates
                    key = f"{resolution}-{f['ext']}"
                    unique_formats[key] = {
                        'format_id': f['format_id'],
                        'resolution': resolution,
                        'ext': f['ext']
                    }
        
        # Convert dictionary back to list and sort by resolution
        formats = sorted(unique_formats.values(), key=lambda x: int(x['resolution'].replace('p', '')))
        
        return {
            'title': info.get('title', 'Unknown'),
            'thumbnail': info.get('thumbnail', ''),
            'formats': formats,
            'url': info.get('url', '')
        }
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        url = request.form.get('url')
        try:
            video_info = get_video_info(url)
            return jsonify(video_info)
        except Exception as e:
            return jsonify({'error': str(e)})
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url', '')
    format_id = data.get('format', '')

    if not url or not format_id:
        return jsonify({'success': False, 'error': 'Invalid parameters'}), 400

    filename = f"{uuid.uuid4()}"
    download_path = os.path.join(app.config['DOWNLOAD_FOLDER'], filename)

    ydl_opts = {
        'outtmpl': f"{download_path}.%(ext)s",
        'format': f"{format_id}+bestaudio/best",
        'merge_output_format': 'mp4'
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        video_file = f"{download_path}.mp4"
        audio_file = f"{download_path}.m4a"
        output_file = f"{download_path}_merged.mp4"

        # Check if audio file exists, if not use the video file as audio
        if not os.path.exists(audio_file):
            audio_file = video_file  # If no separate audio file, use video file itself

        subprocess.run([
            "ffmpeg", "-i", video_file, "-i", audio_file,
            "-c:v", "copy", "-c:a", "aac", output_file
        ], check=True)

        os.remove(video_file)
        if os.path.exists(audio_file):
            os.remove(audio_file)

        return send_file(output_file, as_attachment=True)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    os.makedirs(app.config['DOWNLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)