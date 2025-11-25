document.addEventListener('DOMContentLoaded', () => {
    const pills = document.querySelectorAll('.nm-filter-pill');
    const sections = document.querySelectorAll('.nm-card[id]'); // Only select cards with IDs (sections)

    // 1. Click to Scroll
    pills.forEach((pill) => {
        pill.addEventListener('click', () => {
            // Remove active from all
            pills.forEach((p) => p.classList.remove('active'));
            // Add active to clicked
            pill.classList.add('active');

            const targetId = pill.dataset.target;
            const target = document.getElementById(targetId);

            if (target) {
                // Offset for sticky header
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 2. Scroll Spy (Highlight active pill on scroll)
    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.scrollY;
        const headerOffset = 100; // Trigger point offset

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (scrollY >= (sectionTop - headerOffset)) {
                current = section.getAttribute('id');
            }
        });

        pills.forEach(pill => {
            pill.classList.remove('active');
            if (pill.dataset.target === current) {
                pill.classList.add('active');
            }
        });
    });

    // 3. Journal Slider Auto-Scroll (Optional)
    const sliderContainer = document.querySelector('.nm-journal-slider-container');
    if (sliderContainer) {
        let isDown = false;
        let startX;
        let scrollLeft;

        // Mouse Drag Support
        sliderContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            sliderContainer.classList.add('active');
            startX = e.pageX - sliderContainer.offsetLeft;
            scrollLeft = sliderContainer.scrollLeft;
        });
        sliderContainer.addEventListener('mouseleave', () => {
            isDown = false;
            sliderContainer.classList.remove('active');
        });
        sliderContainer.addEventListener('mouseup', () => {
            isDown = false;
            sliderContainer.classList.remove('active');
        });
        sliderContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - sliderContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll-fast
            sliderContainer.scrollLeft = scrollLeft - walk;
        });
    }

    // 4. Fetch Content (Mixed Sources)
    const WP_API_BASE = 'https://betterbetters.co.kr/wp-json/wp/v2/posts?_embed&per_page=6';
    const KBOARD_API_BASE = 'https://betterbetters.co.kr/wp-json/kboard/v1/list';

    // Helper to fetch and render
    async function fetchAndRender(sourceType, id, containerSelector, renderType) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        try {
            let posts = [];

            if (sourceType === 'wp') {
                // Fetch from WordPress Standard API (Categories)
                const response = await fetch(`${WP_API_BASE}&categories=${id}&_=${new Date().getTime()}`);
                const data = await response.json();

                posts = data.map(post => ({
                    title: post.title.rendered,
                    link: post.link,
                    date: post.date.substring(0, 10),
                    img: post._embedded && post._embedded['wp:featuredmedia']
                        ? post._embedded['wp:featuredmedia'][0].source_url
                        : '' // No placeholder if empty, or use default
                }));
            } else if (sourceType === 'kboard') {
                // Fetch from Custom KBoard API
                const response = await fetch(`${KBOARD_API_BASE}/${id}?_=${new Date().getTime()}`);
                const data = await response.json();

                if (data && Array.isArray(data)) {
                    posts = data.map(post => {
                        let imgUrl = post.img;
                        // Fix for file_download.php URL if present
                        if (imgUrl && imgUrl.includes('file_download.php') && imgUrl.includes('file=/')) {
                            const fileParam = imgUrl.split('file=')[1];
                            if (fileParam.startsWith('/')) {
                                imgUrl = 'https://betterbetters.co.kr' + fileParam;
                            }
                        }

                        return {
                            title: post.title,
                            link: post.link,
                            date: post.date,
                            img: imgUrl
                        };
                    });
                }
            }

            if (posts.length > 0) {
                container.innerHTML = ''; // Clear placeholders

                posts.forEach(post => {
                    // Default image if missing
                    const imgUrl = post.img ? post.img : 'https://via.placeholder.com/300x300?text=No+Image';

                    let html = '';

                    if (renderType === 'notice') {
                        // Keep title for Notice
                        html = `
                            <li>
                                <a href="${post.link}" target="_blank">
                                    <span class="nm-notice-title">${post.title}</span>
                                    <span class="nm-notice-date">${post.date}</span>
                                </a>
                            </li>
                        `;
                    } else if (renderType === 'slider') {
                        // Work Log (Slider) - Show Title, Square Image
                        html = `
                            <div class="nm-journal-item">
                                <a href="${post.link}" target="_blank" style="text-decoration:none; color:inherit;">
                                    <div class="nm-journal-img" style="background-image: url('${imgUrl}');"></div>
                                    <div class="nm-journal-info">
                                        <div class="nm-journal-title">${post.title}</div>
                                        <!-- Date Removed -->
                                    </div>
                                </a>
                            </div>
                        `;
                    } else if (renderType === 'grid') {
                        // Gallery (Grid) - No Title
                        html = `
                            <div class="nm-gallery-item">
                                <a href="${post.link}" target="_blank" style="text-decoration:none; color:inherit;">
                                    <div class="nm-gallery-img" style="background-image: url('${imgUrl}');"></div>
                                    <!-- Title Removed -->
                                </a>
                            </div>
                        `;
                    }
                    container.insertAdjacentHTML('beforeend', html);
                });
            }
        } catch (error) {
            console.error(`Failed to fetch ${sourceType} ${id}:`, error);
        }
    }

    // Execute Fetches
    // 1. Notice: KBoard ID 5
    fetchAndRender('kboard', 5, '.nm-notice-list', 'notice');

    // 2. Work Log: WP Category 6 (Brand Diary)
    fetchAndRender('wp', 6, '.nm-journal-track', 'slider');

    // 3. Dessert: KBoard ID 6
    fetchAndRender('kboard', 6, '#section-dessert .nm-gallery-grid', 'grid');

    // 4. Product: KBoard ID 8
    fetchAndRender('kboard', 8, '#section-product .nm-gallery-grid', 'grid');

});
