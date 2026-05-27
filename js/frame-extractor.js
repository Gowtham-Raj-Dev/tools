/* Gowtham Tools Suite - Ultra-Fast Frame Extractor Engine */

document.addEventListener('DOMContentLoaded', () => {
    const videoInput = document.getElementById('videoInput');
    const dropZone = document.getElementById('dropZone');
    const statusBar = document.getElementById('statusBar');
    const targetName = document.getElementById('targetName');
    const targetSpecs = document.getElementById('targetSpecs');

    const actionBtn = document.getElementById('actionBtn');
    const btnIcon = document.getElementById('btnIcon');
    const btnText = document.getElementById('btnText');
    const stopBtn = document.getElementById('stopBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    let isExtracting = false;
    let abortExtraction = false;

    const inputFrom = document.getElementById('inputFrom');
    const inputTo = document.getElementById('inputTo');
    const sliderFrom = document.getElementById('sliderFrom');
    const sliderTo = document.getElementById('sliderTo');

    const selectFormat = document.getElementById('selectFormat');
    const selectFps = document.getElementById('selectFps');

    const progressBox = document.getElementById('progressBox');
    const renderState = document.getElementById('renderState');
    const renderStats = document.getElementById('renderStats');
    const progressBarFill = document.getElementById('progressBarFill');
    const consoleLog = document.getElementById('consoleLog');

    const previewSection = document.getElementById('previewSection');
    const previewGrid = document.getElementById('previewGrid');
    const liveCounter = document.getElementById('liveCounter');

    const videoPreviewContainer = document.getElementById('videoPreviewContainer');
    const videoPreview = document.getElementById('videoPreview');
    const hiddenVideo = document.getElementById('hiddenVideo');

    let videoFile = null;
    let videoDuration = 0;
    let generatedZipBlob = null;
    let fileURL = null;

    if (videoInput) videoInput.addEventListener('change', initializeStreamFile);

    function initializeStreamFile(e) {
        const file = e.target.files ? e.target.files[0] : e;
        if (!file) return;

        videoFile = file;
        targetName.textContent = file.name.length > 40 ? file.name.substring(0, 37) + '...' : file.name;

        if (fileURL) URL.revokeObjectURL(fileURL); // Prevent Memory Leaks
        fileURL = URL.createObjectURL(file);
        hiddenVideo.src = fileURL;

        if (videoPreview) {
            videoPreview.src = fileURL;
            videoPreviewContainer.style.display = 'block';
        }

        hiddenVideo.onloadedmetadata = () => {
            videoDuration = hiddenVideo.duration;
            targetSpecs.textContent = `${videoDuration.toFixed(2)}s | ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
            statusBar.style.display = 'flex';

            inputFrom.value = 0;
            inputTo.value = videoDuration.toFixed(2);

            sliderFrom.max = videoDuration;
            sliderTo.max = videoDuration;
            sliderFrom.value = 0;
            sliderTo.value = videoDuration;

            resetActionButton();
            if (refreshBtn) refreshBtn.style.display = 'flex';
            progressBox.style.display = 'none';
            progressBox.classList.remove('complete-state');
            previewSection.style.display = 'none';
            previewGrid.innerHTML = '';
            generatedZipBlob = null;
        };
    }

    function resetActionButton() {
        actionBtn.disabled = false;
        actionBtn.className = 'action-btn';
        btnIcon.className = 'fa-solid fa-play';
        btnText.textContent = 'Initialize Render Engine';
        if (stopBtn) {
            stopBtn.style.display = 'none';
            stopBtn.disabled = false;
            const span = stopBtn.querySelector('span');
            if (span) span.textContent = 'Stop';
        }
        if (refreshBtn) refreshBtn.disabled = false;
        isExtracting = false;
    }

    // Dual Range Controllers Sync Links
    if (sliderFrom) {
        sliderFrom.addEventListener('input', () => {
            if (parseFloat(sliderFrom.value) >= parseFloat(sliderTo.value)) sliderFrom.value = sliderTo.value - 0.1;
            inputFrom.value = parseFloat(sliderFrom.value).toFixed(2);
        });
    }
    if (sliderTo) {
        sliderTo.addEventListener('input', () => {
            if (parseFloat(sliderTo.value) <= parseFloat(sliderFrom.value)) sliderTo.value = parseFloat(sliderFrom.value) + 0.1;
            inputTo.value = parseFloat(sliderTo.value).toFixed(2);
        });
    }
    if (inputFrom) {
        inputFrom.addEventListener('change', () => {
            let val = Math.max(0, Math.min(parseFloat(inputFrom.value), videoDuration));
            if (val >= parseFloat(inputTo.value)) val = parseFloat(inputTo.value) - 0.1;
            inputFrom.value = val.toFixed(2); sliderFrom.value = val;
        });
    }
    if (inputTo) {
        inputTo.addEventListener('change', () => {
            let val = Math.max(0, Math.min(parseFloat(inputTo.value), videoDuration));
            if (val <= parseFloat(inputFrom.value)) val = parseFloat(inputFrom.value) + 0.1;
            inputTo.value = val.toFixed(2); sliderTo.value = val;
        });
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', async () => {
            if (generatedZipBlob) {
                triggerManualDownload();
                return;
            }

            if (!videoFile) return;

            const start = parseFloat(inputFrom.value);
            const end = parseFloat(inputTo.value);

            if (start >= end) return alert("Boundary synchronization fault.");

            abortExtraction = false;
            isExtracting = true;
            if (stopBtn) stopBtn.style.display = 'flex';
            if (refreshBtn) refreshBtn.disabled = true;

            actionBtn.disabled = true;
            progressBox.style.display = 'block';
            progressBox.classList.remove('complete-state');
            previewSection.style.display = 'block';
            previewGrid.innerHTML = '';
            renderState.textContent = "Spawning Multithreaded Extractors...";

            const format = selectFormat.value;
            const extension = format.split('/')[1];
            const fps = parseInt(selectFps.value);
            const interval = 1 / fps;

            const zip = new JSZip();

            // Build Time Stamps Array
            const timeStamps = [];
            for (let t = start; t <= end; t += interval) {
                timeStamps.push(t);
            }
            const totalFramesExpected = timeStamps.length;
            let finishedFrames = 0;

            // Hyperparameter: Number of concurrent video decoders.
            const CONCURRENCY_LIMIT = 16;
            const queue = [...timeStamps].map((time, index) => ({ time, index }));

            // Performance boost: OffscreenCanvas avoids UI-thread DOM blocking layout paints
            const videoWidth = hiddenVideo.videoWidth;
            const videoHeight = hiddenVideo.videoHeight;

            async function startWorker() {
                // Initialize dedicated invisible video element for this lane
                const vNode = document.createElement('video');
                vNode.src = fileURL;
                vNode.muted = true;
                vNode.playsInline = true;

                // Canvas instantiation dedicated to this stream runner
                const canvas = typeof OffscreenCanvas !== "undefined"
                    ? new OffscreenCanvas(videoWidth, videoHeight)
                    : document.createElement('canvas');
                if (!(canvas instanceof OffscreenCanvas)) {
                    canvas.width = videoWidth;
                    canvas.height = videoHeight;
                }
                const localCtx = canvas.getContext('2d');

                await new Promise(r => vNode.onloadedmetadata = r);

                while (queue.length > 0) {
                    if (abortExtraction) break;
                    const task = queue.shift();
                    if (!task) break;

                    await new Promise((resolve) => {
                        vNode.currentTime = task.time;
                        vNode.onseeked = () => {
                            localCtx.drawImage(vNode, 0, 0, videoWidth, videoHeight);

                            // High-speed low-overhead conversion allocation
                            const handleBlob = (blob) => {
                                const paddedIndex = String(task.index + 1).padStart(6, '0');
                                const frameFileName = `frame_${paddedIndex}.${extension}`;

                                // Direct Memory allocation to JSZip instance array
                                zip.file(frameFileName, blob);

                                finishedFrames++;

                                // Directly append using optimized Blob URLs
                                const localBlobURL = URL.createObjectURL(blob);
                                const card = document.createElement('div');
                                card.className = 'preview-card';
                                card.innerHTML = `
                                    <img src="${localBlobURL}" alt="${frameFileName}">
                                    <span>#${paddedIndex} (${task.time.toFixed(2)}s)</span>
                                `;
                                previewGrid.appendChild(card);
                                
                                // Scroll grid occasionally to avoid layout thrashing
                                if (finishedFrames % 20 === 0 || finishedFrames === totalFramesExpected) {
                                    previewGrid.scrollTop = previewGrid.scrollHeight;
                                }

                                const percent = Math.min(((finishedFrames / totalFramesExpected) * 100), 99.9);
                                progressBarFill.style.width = `${percent}%`;
                                renderStats.textContent = `${finishedFrames} / ${totalFramesExpected} Frames`;
                                liveCounter.textContent = `${finishedFrames} Frames Extracted`;
                                consoleLog.textContent = `Pipelined frame at sequence index ${paddedIndex} via Concurrent Engine`;

                                resolve();
                            };

                            if (canvas instanceof OffscreenCanvas) {
                                canvas.convertToBlob({ type: format, quality: 0.80 }).then(handleBlob);
                            } else {
                                canvas.toBlob(handleBlob, format, 0.80);
                            }
                        };
                    });
                }

                // Clean up video memory footprint explicitly
                vNode.src = "";
                vNode.load();
            }

            // Fire up simultaneous worker pipelines asynchronously
            const workerPromises = [];
            for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, totalFramesExpected); i++) {
                workerPromises.push(startWorker());
            }

            await Promise.all(workerPromises);

            if (abortExtraction) {
                renderState.textContent = "Extraction Aborted!";
                consoleLog.textContent = "Process stopped by user.";
                resetActionButton();
                if (refreshBtn) refreshBtn.style.display = 'flex';
                return;
            }

            renderState.textContent = "Assembling Blazing Archive Payload...";
            consoleLog.textContent = "Writing optimized compression architecture mappings...";
            progressBarFill.style.width = '100%';

            // Use STORE (no compression) because images are already compressed. This makes zipping instant.
            zip.generateAsync({
                type: "blob",
                compression: "STORE"
            }).then((zipBlob) => {
                generatedZipBlob = zipBlob;

                progressBox.classList.add('complete-state');
                renderState.textContent = "Archive Ready Super Fast!";
                consoleLog.textContent = "Click the button above to instantly extract your ZIP bundle.";

                actionBtn.disabled = false;
                actionBtn.className = 'action-btn ready';
                btnIcon.className = 'fa-solid fa-circle-down';
                btnText.textContent = 'Download ZIP Archive';

            }).catch(e => {
                console.error(e);
                renderState.textContent = "Pipeline Processing Error!";
                resetActionButton();
            });
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (isExtracting) {
                abortExtraction = true;
                stopBtn.disabled = true;
                const span = stopBtn.querySelector('span');
                if (span) span.textContent = 'Stopping...';
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (isExtracting && !abortExtraction) return; 
            
            videoFile = null;
            if (fileURL) {
                URL.revokeObjectURL(fileURL);
                fileURL = null;
            }
            if (videoPreview) {
                videoPreview.src = '';
                videoPreviewContainer.style.display = 'none';
            }
            if (videoInput) videoInput.value = '';
            
            statusBar.style.display = 'none';
            progressBox.style.display = 'none';
            previewSection.style.display = 'none';
            previewGrid.innerHTML = '';
            
            targetName.textContent = 'file_stream.mp4';
            targetSpecs.textContent = '00:00 / 0.00MB';
            
            generatedZipBlob = null;
            
            actionBtn.disabled = true;
            actionBtn.className = 'action-btn';
            btnIcon.className = 'fa-solid fa-play';
            btnText.textContent = 'Initialize Render Engine';
            
            refreshBtn.style.display = 'none';
            stopBtn.style.display = 'none';
        });
    }

    function triggerManualDownload() {
        if (!generatedZipBlob) return;

        const url = URL.createObjectURL(generatedZipBlob);
        const downloader = document.createElement('a');
        downloader.href = url;
        downloader.download = `${videoFile.name.split('.')[0]}_extracted_frames.zip`;
        document.body.appendChild(downloader);
        downloader.click();
        document.body.removeChild(downloader);
        URL.revokeObjectURL(url); // Clean up memory footprint

        consoleLog.textContent = "Archive successfully packaged and saved to local disk storage.";
    }

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(n => dropZone.addEventListener(n, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--clr-primary)';
        }));
        ['dragleave', 'drop'].forEach(n => dropZone.addEventListener(n, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-dashed)';
        }));
        dropZone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files.length) {
                videoInput.files = e.dataTransfer.files;
                initializeStreamFile(videoInput.files[0]);
            }
        });
    }
});