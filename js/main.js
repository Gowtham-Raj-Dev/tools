/* Gowtham Tools Suite - Master Dashboard & Search Controller */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tool Registry Database
    const toolsRegistry = [
        {
            name: "Frame Extractor Pro",
            path: "tools/video-frame-extractor.html",
            icon: "fa-scissors",
            category: "video",
            desc: "Slices video tracks frame-by-frame"
        },
        {
            name: "Screen & Cam Recorder",
            path: "tools/screen-recorder.html",
            icon: "fa-video",
            category: "video",
            desc: "Records screen captures or camera feeds"
        },
        {
            name: "Image Compressor",
            path: "tools/image-compressor.html",
            icon: "fa-compress",
            category: "image",
            desc: "Compresses images with quality sliders"
        },
        {
            name: "Resizer & Transformer",
            path: "tools/image-resizer.html",
            icon: "fa-crop-simple",
            category: "image",
            desc: "Transforms dimension scales and rotations"
        },
        {
            name: "Bulk Format Converter",
            path: "tools/image-converter.html",
            icon: "fa-shuffle",
            category: "image",
            desc: "Converts bulk images format"
        },
        {
            name: "Color Palette Extractor",
            path: "tools/color-extractor.html",
            icon: "fa-eye-dropper",
            category: "image",
            desc: "Extracts dominant palettes from images"
        }
    ];

    // 2. Detect Page Depth Context
    const isSubpage = window.location.pathname.includes('/tools/');
    const searchContainer = document.querySelector('.header-search');
    const searchInput = document.querySelector('.header-search input');

    // 3. Build & Inject Global Search Dropdown
    if (searchContainer && searchInput) {
        // Enable search input dynamically
        searchInput.removeAttribute('disabled');

        // Create dropdown DOM element
        const dropdown = document.createElement('div');
        dropdown.className = 'search-results-dropdown';
        searchContainer.appendChild(dropdown);

        // Input listener to search
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                dropdown.style.display = 'none';
                return;
            }

            const matches = toolsRegistry.filter(tool => 
                tool.name.toLowerCase().includes(query) || 
                tool.desc.toLowerCase().includes(query)
            );

            dropdown.innerHTML = '';
            if (matches.length === 0) {
                const noResult = document.createElement('div');
                noResult.className = 'search-result-item';
                noResult.style.cursor = 'default';
                noResult.innerHTML = `<span><i class="fa-solid fa-circle-info"></i> No matching tools found</span>`;
                dropdown.appendChild(noResult);
            } else {
                matches.forEach(tool => {
                    // Resolve paths dynamically based on subdirectory depth
                    const targetPath = isSubpage ? tool.path.replace('tools/', '') : tool.path;
                    const item = document.createElement('a');
                    item.href = targetPath;
                    item.className = `search-result-item ${tool.category}-item`;
                    item.innerHTML = `
                        <i class="fa-solid ${tool.icon}"></i>
                        <div>
                            <div style="font-weight:600; color:var(--txt-title);">${tool.name}</div>
                            <div style="font-size:0.75rem; color:var(--txt-muted);">${tool.desc}</div>
                        </div>
                        <span class="result-meta">${tool.category}</span>
                    `;
                    dropdown.appendChild(item);
                });
            }
            dropdown.style.display = 'flex';
        });

        // Hide search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Focus showing results if text present
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                dropdown.style.display = 'flex';
            }
        });
    }

    // 4. Dashboard Landing Page Elements (if present)
    const filterPills = document.querySelectorAll('.filter-pill');
    const toolCards = document.querySelectorAll('.tool-card');

    if (filterPills.length > 0 && toolCards.length > 0) {
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filterTools();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', filterTools);
        }

        function filterTools() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const activePill = document.querySelector('.filter-pill.active');
            const activeCategory = activePill ? activePill.getAttribute('data-category') : 'all';

            toolCards.forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const desc = card.querySelector('.card-desc').textContent.toLowerCase();
                const category = card.getAttribute('data-category');

                const matchesSearch = title.includes(query) || desc.includes(query);
                const matchesCategory = activeCategory === 'all' || category === activeCategory;

                if (matchesSearch && matchesCategory) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeIn 0.3s ease-out forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    }
});
