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

    // 5. YouTube Shorts Loading
    loadYouTubeShorts();

});

// YouTube Shorts Dynamic Loading
async function loadYouTubeShorts() {
    // ⚠️ TODO: YouTube API 키를 여기에 입력하세요
    // Google Cloud Console에서 발급: https://console.cloud.google.com/
    // YouTube Data API v3 활성화 후 API 키 생성
    // HTTP Referrer 제한 설정 권장 (예: *.nothingmatters.co.kr/*)
    const YOUTUBE_API_KEY = 'AIzaSyAeTdocfE9dQcRPZ03QdZ48Hf53JC2c18o'; // YouTube API 키
    const CHANNEL_ID = 'UCYgL27Slvlb_C4Bw2P65CCA'; // bettermatters 채널 ID
    const MAX_RESULTS = 2;
    const CACHE_KEY = 'youtube_shorts_cache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

    const container = document.getElementById('shorts-container');
    if (!container) return;

    // 캐시 확인
    const cachedData = getCachedShorts();
    if (cachedData && cachedData.videos && cachedData.videos.length > 0) {
        console.log('Using cached YouTube Shorts data');
        renderShorts(cachedData.videos);
        return;
    }

    // API 키가 없으면 폴백 (하드코딩된 기본값 사용)
    if (!YOUTUBE_API_KEY) {
        console.warn('YouTube API key not configured. Using fallback videos.');
        const fallbackVideos = [
            { id: 'HLGpVBgF_A4', title: '회사 연말 선물추천 웨딩 기업 답례품' },
            { id: 'XbEMmoLOHgI', title: '크리스마스 쿠키 선물세트 추천 nothingmatters' }
        ];
        renderShorts(fallbackVideos);
        return;
    }

    // YouTube Data API 호출
    try {
        // 로딩 표시
        container.innerHTML = '<div class="nm-loading" style="text-align: center; padding: 20px; color: #666;">쇼츠 로딩 중...</div>';

        // API 엔드포인트: 채널의 최신 쇼츠 검색
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&channelId=${CHANNEL_ID}&maxResults=${MAX_RESULTS}` +
            `&order=date&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title
            }));

            // 캐시에 저장
            cacheShorts(videos);

            // 렌더링
            renderShorts(videos);
        } else {
            throw new Error('No shorts found');
        }
    } catch (error) {
        console.error('Failed to load YouTube Shorts:', error);

        // 에러 시 폴백
        const fallbackVideos = [
            { id: 'HLGpVBgF_A4', title: '회사 연말 선물추천 웨딩 기업 답례품' },
            { id: 'XbEMmoLOHgI', title: '크리스마스 쿠키 선물세트 추천 nothingmatters' }
        ];
        renderShorts(fallbackVideos);
    }
}

// 쇼츠 렌더링
function renderShorts(videos) {
    const container = document.getElementById('shorts-container');
    if (!container) return;

    container.innerHTML = '';

    videos.forEach(video => {
        const shortItem = document.createElement('div');
        shortItem.className = 'nm-shorts-item';
        shortItem.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${video.id}" 
                title="${video.title}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
        `;
        container.appendChild(shortItem);
    });
}

// 캐시에서 쇼츠 가져오기
function getCachedShorts() {
    try {
        const cached = localStorage.getItem('youtube_shorts_cache');
        if (!cached) return null;

        const data = JSON.parse(cached);
        const now = new Date().getTime();
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

        // 캐시가 유효한지 확인
        if (data.timestamp && (now - data.timestamp) < CACHE_DURATION) {
            return data;
        }

        // 만료된 캐시 삭제
        localStorage.removeItem('youtube_shorts_cache');
        return null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

// 캐시에 쇼츠 저장
function cacheShorts(videos) {
    try {
        const cacheData = {
            videos: videos,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('youtube_shorts_cache', JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}
