/* Gowtham Tools Suite - Bulk Image Format Converter Engine */

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const statusBar = document.getElementById('statusBar');
    const targetName = document.getElementById('targetName');
    const targetSpecs = document.getElementById('targetSpecs');

    const selectFormat = document.getElementById('selectFormat');
    const actionBtn = document.getElementById('actionBtn');
    
    const progressBox = document.getElementById('progressBox');
    const renderState = document.getElementById('renderState');
    const renderStats = document.getElementById('renderStats');
    const progressBarFill = document.getElementById('progressBarFill');
    const consoleLog = document.getElementById('consoleLog');

    const previewSection = document.getElementById('previewSection');
    const previewGrid = document.getElementById('previewGrid');
    const liveCounter = document.getElementById('liveCounter');

    let fileList = [];
    let convertedFiles = []; // Array of { name, blob, url }
    let zipBlob = null;

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    function handleFiles(files) {
        if (!files.length) return;

        fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!fileList.length) {
            alert('Please select valid image files.');
            return;
        }

        targetName.textContent = fileList.length === 1 ? fileList[0].name : `${fileList.length} files selected`;
        const totalSize = fileList.reduce((acc, f) => acc + f.size, 0);
        targetSpecs.textContent = `${(totalSize / 1024).toFixed(1)} KB Total`;
        statusBar.style.display = 'flex';

        resetConvertState();
        actionBtn.disabled = false;
        actionBtn.className = 'action-btn image-action';
        actionBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Bulk Conversion';
    }

    function resetConvertState() {
        progressBox.style.display = 'none';
        progressBox.classList.remove('complete-state');
        previewSection.style.display = 'none';
        previewGrid.innerHTML = '';
        convertedFiles = [];
        zipBlob = null;
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', async () => {
            if (zipBlob || (convertedFiles.length === 1 && convertedFiles[0].blob)) {
                triggerDownload();
                return;
            }

            if (!fileList.length) return;

            actionBtn.disabled = true;
            progressBox.style.display = 'block';
            previewSection.style.display = 'block';
            previewGrid.innerHTML = '';
            
            const targetMime = selectFormat.value;
            const targetExt = targetMime.split('/')[1];

            const zip = new JSZip();
            let processed = 0;
            renderState.textContent = "Processing Conversion Queue...";

            for (const file of fileList) {
                renderState.textContent = `Converting: ${file.name}`;
                consoleLog.textContent = `Rendering buffer context for ${file.name}...`;

                try {
                    const blob = await convertSingleFile(file, targetMime);
                    const nameParts = file.name.split('.');
                    nameParts.pop();
                    const outputName = `${nameParts.join('.')}.${targetExt}`;

                    // Add to zip structure
                    zip.file(outputName, blob);

                    const fileURL = URL.createObjectURL(blob);
                    convertedFiles.push({ name: outputName, blob, url: fileURL });

                    // Append card preview
                    const card = document.createElement('div');
                    card.className = 'preview-card';
                    card.innerHTML = `
                        <img src="${fileURL}" alt="${outputName}">
                        <span>${outputName}</span>
                    `;
                    previewGrid.appendChild(card);
                    previewGrid.scrollTop = previewGrid.scrollHeight;

                    processed++;
                    const percent = (processed / fileList.length) * 100;
                    progressBarFill.style.width = `${percent}%`;
                    renderStats.textContent = `${processed} / ${fileList.length} Files`;
                    liveCounter.textContent = `${processed} Converted`;

                } catch (err) {
                    console.error(err);
                    consoleLog.textContent = `Error converting ${file.name}: ${err.message}`;
                }
            }

            if (fileList.length > 1) {
                renderState.textContent = "Bundling Archive Payload...";
                consoleLog.textContent = "Assembling ZIP folder structure in buffer...";
                
                zip.generateAsync({ type: 'blob' }).then(blob => {
                    zipBlob = blob;
                    progressBox.classList.add('complete-state');
                    renderState.textContent = "Bulk Conversion Complete!";
                    consoleLog.textContent = "Click the button below to download the ZIP archive.";

                    actionBtn.disabled = false;
                    actionBtn.className = 'action-btn ready';
                    actionBtn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Download ZIP Archive';
                });
            } else if (convertedFiles.length === 1) {
                progressBox.classList.add('complete-state');
                renderState.textContent = "Conversion Complete!";
                consoleLog.textContent = "Click the button below to download your converted image.";
                
                actionBtn.disabled = false;
                actionBtn.className = 'action-btn ready';
                actionBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Converted Image';
            }
        });
    }

    function convertSingleFile(file, mimeType) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas blob extraction failure"));
                }, mimeType, 0.95);
            };
            img.onerror = () => reject(new Error("Image source loading failure"));
            img.src = URL.createObjectURL(file);
        });
    }

    function triggerDownload() {
        if (zipBlob) {
            const url = URL.createObjectURL(zipBlob);
            const downloader = document.createElement('a');
            downloader.href = url;
            downloader.download = `gowtham_converted_images.zip`;
            document.body.appendChild(downloader);
            downloader.click();
            document.body.removeChild(downloader);
        } else if (convertedFiles.length === 1) {
            const file = convertedFiles[0];
            const downloader = document.createElement('a');
            downloader.href = file.url;
            downloader.download = file.name;
            document.body.appendChild(downloader);
            downloader.click();
            document.body.removeChild(downloader);
        }
    }

    // Drag-Drop Setup
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(n => dropZone.addEventListener(n, (e) => { 
            e.preventDefault(); 
            dropZone.style.borderColor = 'var(--clr-secondary)'; 
        }));
        ['dragleave', 'drop'].forEach(n => dropZone.addEventListener(n, (e) => { 
            e.preventDefault(); 
            dropZone.style.borderColor = 'var(--border-dashed)'; 
        }));
        dropZone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files.length) {
                imageInput.files = e.dataTransfer.files;
                handleFiles(imageInput.files);
            }
        });
    }
});
