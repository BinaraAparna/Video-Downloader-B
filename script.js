document.getElementById('videoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('videoUrl').value;
    const videoInfoDiv = document.getElementById('videoInfo');
    const errorAlert = document.getElementById('errorAlert');
    const loadingDiv = document.getElementById('loading');

    // Show loading animation
    loadingDiv.classList.remove('d-none');
    videoInfoDiv.classList.add('d-none');
    errorAlert.classList.add('d-none');

    try {
        const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ url: url })
        });

        const videoInfo = await response.json();

        if (videoInfo.error) {
            throw new Error(videoInfo.error);
        }

        // Set video preview
        const videoPreview = document.getElementById('videoPreview');
        videoPreview.src = videoInfo.url;

        // Set thumbnail preview
        const thumbnailPreview = document.getElementById('thumbnailPreview');
        thumbnailPreview.src = videoInfo.thumbnail;  // Set thumbnail URL
        thumbnailPreview.style.display = 'block';  // Show thumbnail

        // Set quality buttons
        const qualityButtons = document.getElementById('qualityButtons');
        qualityButtons.innerHTML = '';
        videoInfo.formats.forEach(format => {
            qualityButtons.innerHTML += `
        <button onclick="startDownload('${format.format_id}')">
            ${format.resolution.toUpperCase()} (${format.ext.toUpperCase()})
        </button>`;
        });

        // Show video info
        videoInfoDiv.classList.remove('d-none');
        errorAlert.classList.add('d-none');
    } catch (error) {
        errorAlert.textContent = 'Error: ' + error.message;
        errorAlert.classList.remove('d-none');
        errorAlert.classList.add('error');
        videoInfoDiv.classList.add('d-none');
    } finally {
        // Hide loading animation
        loadingDiv.classList.add('d-none');
    }
});

function startDownload(formatId) {
    const url = document.getElementById('videoUrl').value;

    // Confirm download with SweetAlert2
    Swal.fire({
        title: 'Confirm Download',
        text: 'Are you sure you want to download this video?',
        icon: 'question',
        showCancelButton: true, // Show Cancel button
        confirmButtonText: 'Download', // Text for Confirm button
        cancelButtonText: 'Cancel', // Text for Cancel button
        confirmButtonColor: '#007bff', // Blue color for Confirm button
        cancelButtonColor: '#dc3545', // Red color for Cancel button
    }).then((result) => {
        if (result.isConfirmed) {
            // If user confirms, start the download
            downloadVideo(url, formatId);
        } else if (result.isDismissed) {
            // If user cancels, show a message
            Swal.fire({
                title: 'Cancelled',
                text: 'Download was cancelled.',
                icon: 'info',
                confirmButtonText: 'OK'
            });
        }
    });
}

function downloadVideo(url, formatId) {
    // Show downloading window
    Swal.fire({
        title: 'Downloading...',
        text: 'Your video is being downloaded. Please wait.',
        icon: 'info',
        allowOutsideClick: false, // Prevent closing by clicking outside
        showConfirmButton: false, // Hide the OK button
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/download', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'blob';

    // Track progress
    xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const size = (event.total / (1024 * 1024)).toFixed(2); // Convert to MB
            console.log(`Downloaded: ${percent}% of ${size} MB`);
        }
    });

    // When download is complete
    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            // Close downloading window
            Swal.close();

            // Create a link to download the file
            const blob = new Blob([xhr.response], { type: 'video/mp4' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `downloaded_video.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show completion message
            Swal.fire({
                title: 'Download Complete!',
                text: 'Your video has been downloaded successfully.',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } else {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to download the video.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });

    // Send the request
    xhr.send(JSON.stringify({ url, format: formatId }));
}