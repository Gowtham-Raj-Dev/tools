/* Gowtham Tools Suite - Color Palette Extractor Engine */

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const statusBar = document.getElementById('statusBar');
    const targetName = document.getElementById('targetName');
    const targetSpecs = document.getElementById('targetSpecs');

    const displayCanvas = document.getElementById('displayCanvas');
    const ctx = displayCanvas.getContext('2d');

    const paletteContainer = document.getElementById('paletteContainer');
    const eyedropperStatus = document.getElementById('eyedropperStatus');
    const hexOutput = document.getElementById('hexOutput');
    const rgbOutput = document.getElementById('rgbOutput');
    const hslOutput = document.getElementById('hslOutput');

    const actionBtn = document.getElementById('actionBtn');
    const previewSection = document.getElementById('previewSection');

    let sourceFile = null;
    let sourceImg = new Image();

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
            previewSection.style.display = 'block';
            actionBtn.disabled = false;
            
            // Adjust canvas dimensions to fit image while maintaining ratio
            const maxW = 500;
            const ratio = sourceImg.naturalHeight / sourceImg.naturalWidth;
            displayCanvas.width = maxW;
            displayCanvas.height = Math.round(maxW * ratio);
            
            ctx.drawImage(sourceImg, 0, 0, displayCanvas.width, displayCanvas.height);
            
            // Auto extract dominant colors
            extractDominantColors();
        };
        sourceImg.src = fileURL;
    }

    // Eyedropper pixel select logic
    if (displayCanvas) {
        displayCanvas.addEventListener('click', (e) => {
            if (!sourceFile) return;

            const rect = displayCanvas.getBoundingClientRect();
            // Map click coordinate to canvas coordinate
            const x = Math.floor(((e.clientX - rect.left) / rect.width) * displayCanvas.width);
            const y = Math.floor(((e.clientY - rect.top) / rect.height) * displayCanvas.height);

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const r = pixel[0];
            const g = pixel[1];
            const b = pixel[2];

            const hex = rgbToHex(r, g, b);
            const hsl = rgbToHsl(r, g, b);

            eyedropperStatus.style.backgroundColor = hex;
            hexOutput.value = hex;
            rgbOutput.value = `rgb(${r}, ${g}, ${b})`;
            hslOutput.value = hsl;
        });
    }

    // Auto extract palette using canvas down-sampling
    function extractDominantColors() {
        // Create tiny canvas
        const tinyCanvas = document.createElement('canvas');
        const tinyCtx = tinyCanvas.getContext('2d');
        tinyCanvas.width = 12;
        tinyCanvas.height = 12;

        // Draw stretched image (smooth interpolation groups similar areas)
        tinyCtx.drawImage(sourceImg, 0, 0, 12, 12);
        const data = tinyCtx.getImageData(0, 0, 12, 12).data;

        // Group colors
        const colors = [];
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const a = data[i+3];

            if (a < 50) continue; // Skip transparency

            const hex = rgbToHex(r, g, b);
            colors.push({ hex, r, g, b });
        }

        // Deduplicate and filter colors that are too similar
        const uniqueColors = [];
        colors.forEach(col => {
            const isSimilar = uniqueColors.some(u => colorDistance(col, u) < 45);
            if (!isSimilar && uniqueColors.length < 6) {
                uniqueColors.push(col);
            }
        });

        // Fill remaining slots if deduplication was too aggressive
        if (uniqueColors.length < 6) {
            for (const col of colors) {
                if (uniqueColors.length >= 6) break;
                if (!uniqueColors.some(u => u.hex === col.hex)) {
                    uniqueColors.push(col);
                }
            }
        }

        // Display Swatches
        paletteContainer.innerHTML = '';
        uniqueColors.forEach(col => {
            const card = document.createElement('div');
            card.style.flex = '1';
            card.style.minWidth = '80px';
            card.style.cursor = 'pointer';
            card.style.textAlign = 'center';
            card.style.transition = 'transform 0.2s';
            
            card.innerHTML = `
                <div style="background-color: ${col.hex}; height: 80px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--txt-title); font-weight:600;">${col.hex}</span>
            `;

            // Hover zoom
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-4px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');

            // Copy to clipboard
            card.addEventListener('click', () => {
                navigator.clipboard.writeText(col.hex).then(() => {
                    const originalSpan = card.querySelector('span');
                    originalSpan.textContent = "COPIED!";
                    originalSpan.style.color = "var(--clr-success)";
                    setTimeout(() => {
                        originalSpan.textContent = col.hex;
                        originalSpan.style.color = "var(--txt-title)";
                    }, 1000);
                });
            });

            paletteContainer.appendChild(card);
        });

        // Initialize Eyedropper inputs to dominant color
        if (uniqueColors.length > 0) {
            const first = uniqueColors[0];
            eyedropperStatus.style.backgroundColor = first.hex;
            hexOutput.value = first.hex;
            rgbOutput.value = `rgb(${first.r}, ${first.g}, ${first.b})`;
            hslOutput.value = rgbToHsl(first.r, first.g, first.b);
        }

        actionBtn.className = 'action-btn image-action ready';
        actionBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Export Palette CSS Variables';
    }

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            const swatches = paletteContainer.querySelectorAll('span');
            if (!swatches.length) return;

            let cssStr = ':root {\n';
            swatches.forEach((span, idx) => {
                cssStr += `  --color-palette-${idx + 1}: ${span.textContent};\n`;
            });
            cssStr += '}';

            navigator.clipboard.writeText(cssStr).then(() => {
                const originalText = actionBtn.innerHTML;
                actionBtn.className = 'action-btn ready';
                actionBtn.style.background = 'var(--clr-success)';
                actionBtn.innerHTML = '<i class="fa-solid fa-check"></i> Export CSS Copied!';
                setTimeout(() => {
                    actionBtn.className = 'action-btn image-action ready';
                    actionBtn.style.background = '';
                    actionBtn.innerHTML = originalText;
                }, 1500);
            });
        });
    }

    // Helper Math Functions
    function rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = c.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return `hsl(${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }

    function colorDistance(c1, c2) {
        return Math.sqrt(
            Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
        );
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
