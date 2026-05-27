/* Gowtham Tools Suite - Screen & Camera Recorder Engine */

document.addEventListener('DOMContentLoaded', () => {
    const selectSource = document.getElementById('selectSource');
    const selectAudio = document.getElementById('selectAudio');

    const btnStart = document.getElementById('btnStart');
    const btnPause = document.getElementById('btnPause');
    const btnStop = document.getElementById('btnStop');

    const recordingDot = document.getElementById('recordingDot');
    const recordTimer = document.getElementById('recordTimer');
    const recordState = document.getElementById('recordState');

    const previewSection = document.getElementById('previewSection');
    const playbackVideo = document.getElementById('playbackVideo');
    const actionBtn = document.getElementById('actionBtn');

    let mediaStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    
    // Timer state
    let startTime = 0;
    let timerInterval = null;
    let elapsedSeconds = 0;

    if (btnStart) btnStart.addEventListener('click', startRecording);
    if (btnPause) btnPause.addEventListener('click', togglePauseRecording);
    if (btnStop) btnStop.addEventListener('click', stopRecording);

    async function startRecording() {
        recordedChunks = [];
        elapsedSeconds = 0;
        recordTimer.textContent = "00:00";

        try {
            const source = selectSource.value;
            const recordAudio = selectAudio.checked;

            const constraints = {
                video: true,
                audio: recordAudio
            };

            if (source === 'screen') {
                mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: recordAudio
                });
            } else {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // Preview stream inside player while recording
            playbackVideo.srcObject = mediaStream;
            playbackVideo.muted = true; // Avoid feedback loop
            playbackVideo.play();
            previewSection.style.display = 'block';

            // Select supported mime types
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }

            mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Compile recorded chunks into standard WebM Blob
                const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
                
                // Clear stream preview bindings
                playbackVideo.srcObject = null;
                playbackVideo.src = URL.createObjectURL(recordedBlob);
                playbackVideo.muted = false;
                playbackVideo.controls = true;

                // Enable final download trigger
                actionBtn.disabled = false;
                actionBtn.className = 'action-btn record-action ready';
                actionBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Recorded Video';

                // Release device hooks
                mediaStream.getTracks().forEach(track => track.stop());

                // Reset UI State
                resetTimer();
                btnStart.disabled = false;
                btnPause.disabled = true;
                btnStop.disabled = true;
                recordingDot.style.display = 'none';
                recordingDot.classList.remove('pulsing');
                recordState.textContent = "Recording Saved to Local Buffer.";
            };

            // Start recording chunks every 1 second
            mediaRecorder.start(1000);

            // Update Recording UI state
            btnStart.disabled = true;
            btnPause.disabled = false;
            btnStop.disabled = false;

            recordingDot.style.display = 'block';
            recordingDot.classList.add('pulsing');
            recordState.textContent = "Live Capturing stream...";
            
            // Initiate timer ticking
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);

        } catch (err) {
            console.error(err);
            alert("Media source capture error: " + err.message);
        }
    }

    function togglePauseRecording() {
        if (!mediaRecorder) return;

        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            btnPause.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
            recordState.textContent = "Recording paused.";
            recordingDot.classList.remove('pulsing');
            clearInterval(timerInterval);
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            recordState.textContent = "Live Capturing stream...";
            recordingDot.classList.add('pulsing');
            timerInterval = setInterval(updateTimer, 1000);
        }
    }

    function stopRecording() {
        if (!mediaRecorder) return;
        mediaRecorder.stop();
    }

    function updateTimer() {
        elapsedSeconds++;
        const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(elapsedSeconds % 60).padStart(2, '0');
        recordTimer.textContent = `${mins}:${secs}`;
    }

    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (!playbackVideo.src) return;

            const downloader = document.createElement('a');
            downloader.href = playbackVideo.src;
            downloader.download = `gowtham_record_${Date.now()}.webm`;
            document.body.appendChild(downloader);
            downloader.click();
            document.body.removeChild(downloader);
        });
    }
});
