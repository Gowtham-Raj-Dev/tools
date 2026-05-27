/* Gowtham Tools Suite - Image Compressor Engine */

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const statusBar = document.getElementById('statusBar');
    const targetName = document.getElementById('targetName');
    const targetSpecs = document.getElementById('targetSpecs');

    const sliderQuality = document.getElementById('sliderQuality');
    const labelQuality = document.getElementById('labelQuality');
    const selectFormat = document.getElementById('selectFormat');

    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');

    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const savingsPercent = document.getElementById('savingsPercent');

    const actionBtn = document.getElementById('actionBtn');
    const previewSection = document.getElementById('previewSection');

    let sourceFile = null;
    let sourceImg = new Image();
    let compressedBlob = null;

    if (imageInput) imageInput.addEventListener('change', handleFileSelect);
    if (sliderQuality) {
        sliderQuality.addEventListener('input', (e) => {
            labelQuality.textContent = `${e.target.value}%`;
            if (sourceFile) compressImage();
        });
    }
    if (selectFormat) {
        selectFormat.addEventListener('change', () => {
            if (sourceFile) compressImage();
        });
    }

    function handleFileSelect(e) {
        const file = e.target.files ? e.target.files[0] : e;
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        sourceFile = file;
        targetName.textContent = file.name.length > 40 ? file.name.substring(0, 37) + '...' : file.name;
        targetSpecs.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        statusBar.style.display = 'flex';

        // Read file as object URL
        const fileURL = URL.createObjectURL(file);
        originalPreview.src = fileURL;

        sourceImg.onload = () => {
            // Update metrics and execute compression
            originalSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
            previewSection.style.display = 'block';
            actionBtn.disabled = false;
            compressImage();
        };
        sourceImg.src = fileURL;
    }

    function compressImage() {
        if (!sourceImg.src) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = sourceImg.naturalWidth;
        canvas.height = sourceImg.naturalHeight;

        // Draw image to canvas
        ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);

        // Quality ranges from 0.01 to 1.00
        const quality = parseFloat(sliderQuality.value) / 100;
        let mimeType = selectFormat.value;

        if (mimeType === 'original') {
            mimeType = sourceFile.type;
        }

        // Output to blob
        canvas.toBlob((blob) => {
            if (!blob) return;
            compressedBlob = blob;

            // Render compressed preview
            const compressedURL = URL.createObjectURL(blob);
            compressedPreview.src = compressedURL;

            // Update stats
            const sizeKB = blob.size / 1024;
            compressedSize.textContent = `${sizeKB.toFixed(1)} KB`;

            const diff = sourceFile.size - blob.size;
            const percent = ((diff / sourceFile.size) * 100).toFixed(0);
            
            if (diff > 0) {
                savingsPercent.textContent = `-${percent}%`;
                savingsPercent.style.color = 'var(--clr-success)';
            } else {
                savingsPercent.textContent = `+${Math.abs(percent)}%`;
                savingsPercent.style.color = 'var(--clr-warning)';
            }

            actionBtn.className = 'action-btn image-action ready';
            actionBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Compressed Image';
        }, mimeType, quality);
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (!compressedBlob) return;

            const url = URL.createObjectURL(compressedBlob);
            const downloader = document.createElement('a');
            downloader.href = url;
            
            // Generate filename
            const parts = sourceFile.name.split('.');
            parts.pop();
            const formatExt = selectFormat.value === 'original' ? sourceFile.type.split('/')[1] : selectFormat.value.split('/')[1];
            downloader.download = `${parts.join('.')}_optimized.${formatExt}`;
            
            document.body.appendChild(downloader);
            downloader.click();
            document.body.removeChild(downloader);
        });
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
                handleFileSelect(imageInput.files[0]);
            }
        });
    }
});
