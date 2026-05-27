/* Gowtham Tools Suite - Image Resizer & Transformer Engine */

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const statusBar = document.getElementById('statusBar');
    const targetName = document.getElementById('targetName');
    const targetSpecs = document.getElementById('targetSpecs');

    const inputWidth = document.getElementById('inputWidth');
    const inputHeight = document.getElementById('inputHeight');
    const chkAspect = document.getElementById('chkAspect');

    const btnRotateLeft = document.getElementById('btnRotateLeft');
    const btnRotateRight = document.getElementById('btnRotateRight');
    const btnFlipH = document.getElementById('btnFlipH');
    const btnFlipV = document.getElementById('btnFlipV');

    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');

    const actionBtn = document.getElementById('actionBtn');
    const previewSection = document.getElementById('previewSection');

    let sourceFile = null;
    let sourceImg = new Image();
    
    // Transform State
    let originalWidth = 0;
    let originalHeight = 0;
    let rotation = 0; // 0, 90, 180, 270 degrees
    let flipH = false;
    let flipV = false;

    if (imageInput) imageInput.addEventListener('change', handleFileSelect);

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

        const fileURL = URL.createObjectURL(file);
        
        sourceImg.onload = () => {
            originalWidth = sourceImg.naturalWidth;
            originalHeight = sourceImg.naturalHeight;

            // Initialize input dimensions
            inputWidth.value = originalWidth;
            inputHeight.value = originalHeight;

            // Reset transformation state
            rotation = 0;
            flipH = false;
            flipV = false;

            previewSection.style.display = 'block';
            actionBtn.disabled = false;
            
            drawTransformations();
        };
        sourceImg.src = fileURL;
    }

    // Aspect Ratio lock management
    if (inputWidth) {
        inputWidth.addEventListener('input', () => {
            if (chkAspect.checked && originalWidth > 0) {
                const ratio = originalHeight / originalWidth;
                inputHeight.value = Math.round(inputWidth.value * ratio);
            }
            drawTransformations();
        });
    }
    if (inputHeight) {
        inputHeight.addEventListener('input', () => {
            if (chkAspect.checked && originalHeight > 0) {
                const ratio = originalWidth / originalHeight;
                inputWidth.value = Math.round(inputHeight.value * ratio);
            }
            drawTransformations();
        });
    }

    // Transform event listeners
    if (btnRotateLeft) {
        btnRotateLeft.addEventListener('click', () => {
            rotation = (rotation - 90 + 360) % 360;
            drawTransformations();
        });
    }
    if (btnRotateRight) {
        btnRotateRight.addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            drawTransformations();
        });
    }
    if (btnFlipH) {
        btnFlipH.addEventListener('click', () => {
            flipH = !flipH;
            drawTransformations();
        });
    }
    if (btnFlipV) {
        btnFlipV.addEventListener('click', () => {
            flipV = !flipV;
            drawTransformations();
        });
    }

    function drawTransformations() {
        if (!sourceImg.src) return;

        const targetW = parseInt(inputWidth.value) || originalWidth;
        const targetH = parseInt(inputHeight.value) || originalHeight;

        // Account for 90deg and 270deg swaps on canvas dimensioning
        const isSwapped = (rotation === 90 || rotation === 270);
        
        previewCanvas.width = isSwapped ? targetH : targetW;
        previewCanvas.height = isSwapped ? targetW : targetH;

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.save();

        // Translate origin to center of canvas to perform operations
        previewCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);

        // Apply rotation
        previewCtx.rotate((rotation * Math.PI) / 180);

        // Apply Mirror scale coordinates
        const scaleX = flipH ? -1 : 1;
        const scaleY = flipV ? -1 : 1;
        previewCtx.scale(scaleX, scaleY);

        // Draw image scaled down centered
        previewCtx.drawImage(sourceImg, -targetW / 2, -targetH / 2, targetW, targetH);

        previewCtx.restore();

        actionBtn.className = 'action-btn image-action ready';
        actionBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Transformed Image';
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (!sourceFile) return;

            previewCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const downloader = document.createElement('a');
                downloader.href = url;

                const parts = sourceFile.name.split('.');
                const ext = parts.pop();
                downloader.download = `${parts.join('.')}_resized.${ext}`;

                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
            }, sourceFile.type);
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
