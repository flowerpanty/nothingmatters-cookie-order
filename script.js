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
    const WP_API_BASE = 'https://betterbetters.co.kr/wp-json/wp/v2/posts?_embed&per_page=2';
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
                const maxPosts = (renderType === 'grid') ? 2 : posts.length;
                container.innerHTML = '';

                posts.slice(0, maxPosts).forEach(post => {
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
                        // Thread-post style
                        const categoryLabel = container.closest('#section-dessert') ? '🍪 디저트' : '👜 제품';
                        html = `
                            <a href="${post.link}" target="_blank" class="nm-thread-post">
                                <div class="nm-thread-post-header">
                                    <img src="images/consult_icon.png" class="nm-thread-avatar" alt="NM">
                                    <span class="nm-thread-username">nothingmatters</span>
                                    <span class="nm-thread-badge">${categoryLabel}</span>
                                </div>
                                <img src="${imgUrl}" class="nm-thread-post-img" alt="${post.title || ''}" loading="lazy">
                                ${post.title ? `<div class="nm-thread-post-title">${post.title}</div>` : ''}
                            </a>
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

    // 5. Instagram Feed Loading
    try { loadInstagramFeed(); } catch (e) { console.error('Instagram load error:', e); }

    // 6. YouTube Shorts Loading
    try { loadYouTubeShorts(); } catch (e) { console.error('YouTube Shorts load error:', e); }

});

// Instagram Feed Loading (Behold.so JSON Feed — 스레드 스타일)
async function loadInstagramFeed() {
    const BEHOLD_FEED_URL = 'https://feeds.behold.so/mrLllGhpRMcngwzT6rmS';
    const MAX_RESULTS = 4;
    const CACHE_KEY = 'instagram_feed_cache_v4';
    const CACHE_DURATION = 60 * 60 * 1000; // 1시간

    const grid = document.getElementById('instagram-grid');
    if (!grid) return;

    // 캐시 확인
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            const now = new Date().getTime();
            if (data.timestamp && (now - data.timestamp) < CACHE_DURATION && data.posts && data.posts.length > 0) {
                console.log('Using cached Instagram data');
                renderInstagramThread(data.posts, data.profilePic);
                return;
            }
            localStorage.removeItem(CACHE_KEY);
        }
    } catch (e) {
        console.error('Instagram cache error:', e);
    }

    // Behold.so JSON Feed 호출
    try {
        grid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">인스타그램 피드 로딩 중...</div>';

        const response = await fetch(BEHOLD_FEED_URL);
        if (!response.ok) throw new Error(`Behold API error: ${response.status}`);

        const data = await response.json();

        if (data.posts && data.posts.length > 0) {
            const profilePic = data.profilePictureUrl || '';
            const posts = data.posts.slice(0, MAX_RESULTS).map(post => ({
                img: post.sizes && post.sizes.medium ? post.sizes.medium.mediaUrl : post.mediaUrl,
                caption: post.prunedCaption || post.caption || '',
                link: post.permalink,
                timestamp: post.timestamp || ''
            }));

            // 캐시 저장
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    posts: posts,
                    profilePic: profilePic,
                    timestamp: new Date().getTime()
                }));
            } catch (e) { /* ignore */ }

            renderInstagramThread(posts, profilePic);
            return;
        }
    } catch (error) {
        console.error('Instagram feed failed:', error);
    }

    renderInstagramFallback();
}

// Instagram 스레드 스타일 렌더링 (1개씩 세로로)
function renderInstagramThread(posts, profilePic) {
    const grid = document.getElementById('instagram-grid');
    if (!grid) return;

    grid.innerHTML = '';

    posts.forEach(post => {
        // 시간 포맷
        let timeAgo = '';
        if (post.timestamp) {
            const diff = Date.now() - new Date(post.timestamp).getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days === 0) timeAgo = '오늘';
            else if (days === 1) timeAgo = '어제';
            else if (days < 7) timeAgo = days + '일 전';
            else if (days < 30) timeAgo = Math.floor(days / 7) + '주 전';
            else timeAgo = Math.floor(days / 30) + '개월 전';
        }

        const postEl = document.createElement('a');
        postEl.className = 'nm-insta-post';
        postEl.href = post.link;
        postEl.target = '_blank';
        postEl.rel = 'noopener noreferrer';

        postEl.innerHTML = `
            <div class="nm-insta-post-header">
                <img src="${profilePic || 'images/consult_icon.png'}" class="nm-insta-avatar" alt="nothiingworks">
                <span class="nm-insta-username">nothiingworks</span>
                <span class="nm-insta-time">${timeAgo}</span>
            </div>
            <img src="${post.img}" class="nm-insta-post-img" alt="${post.caption ? post.caption.substring(0, 50) : 'Instagram post'}" loading="lazy">
            ${post.caption ? `<div class="nm-insta-caption">${post.caption}</div>` : ''}
        `;

        grid.appendChild(postEl);
    });
}

// Instagram 폴백
function renderInstagramFallback() {
    const grid = document.getElementById('instagram-grid');
    if (!grid) return;

    grid.innerHTML = `
        <a href="https://www.instagram.com/nothiingworks/" target="_blank" rel="noopener noreferrer" 
           class="nm-insta-post" style="display: flex; align-items: center; gap: 16px; padding: 24px;">
            <div style="font-size: 2.5em;">📷</div>
            <div>
                <div style="font-weight: 600; font-size: 1.05em; margin-bottom: 4px;">@nothiingworks</div>
                <div style="font-size: 0.85em; color: #999; line-height: 1.4;">인스타그램에서 최신 소식을 만나보세요</div>
            </div>
        </a>
    `;
}

// YouTube Shorts Dynamic Loading
async function loadYouTubeShorts() {
    // ⚠️ TODO: YouTube API 키를 여기에 입력하세요
    // Google Cloud Console에서 발급: https://console.cloud.google.com/
    // YouTube Data API v3 활성화 후 API 키 생성
    // HTTP Referrer 제한 설정 권장 (예: *.nothingmatters.co.kr/*)
    const YOUTUBE_API_KEY = 'AIzaSyAeTdocfE9dQcRPZ03QdZ48Hf53JC2c18o'; // YouTube API 키
    const CHANNEL_ID = 'UC2Wtgd70UrGZ3ousmrHL-Qg'; // bettermatters 채널 ID
    const MAX_RESULTS = 2;
    const CACHE_KEY = 'youtube_shorts_cache';
    const CACHE_DURATION = 60 * 60 * 1000; // 1시간 (밀리초)

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
                src="https://www.youtube.com/embed/${video.id}?autoplay=0&mute=0&controls=1&modestbranding=1&rel=0" 
                title="${video.title}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
        `;
        container.appendChild(shortItem);
    });

    // 슬라이더 초기화
    initShortsSlider(videos.length);
}

// 슬라이더 초기화 및 컨트롤
function initShortsSlider(totalItems) {
    if (totalItems <= 1) return; // 1개면 슬라이더 불필요

    const container = document.getElementById('shorts-container');
    const prevBtn = document.getElementById('shorts-prev');
    const nextBtn = document.getElementById('shorts-next');
    const dotsContainer = document.getElementById('shorts-dots');

    if (!container || !prevBtn || !nextBtn || !dotsContainer) return;

    let currentIndex = 0;

    // 인디케이터 dots 생성
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalItems; i++) {
        const dot = document.createElement('span');
        dot.className = 'nm-shorts-dot';
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.nm-shorts-dot');

    // 슬라이드로 이동
    function goToSlide(index) {
        const items = container.querySelectorAll('.nm-shorts-item');
        if (index < 0 || index >= items.length) return;

        currentIndex = index;

        // 스크롤로 이동
        items[index].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });

        // 버튼 상태 업데이트
        updateButtons();

        // Dots 활성화
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    // 버튼 상태 업데이트
    function updateButtons() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === totalItems - 1;
    }

    // 버튼 이벤트
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            goToSlide(currentIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < totalItems - 1) {
            goToSlide(currentIndex + 1);
        }
    });

    // 스크롤 이벤트로 현재 인덱스 감지
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const items = container.querySelectorAll('.nm-shorts-item');
            let closestIndex = 0;
            let minDistance = Infinity;

            items.forEach((item, index) => {
                const rect = item.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const distance = Math.abs(rect.left - containerRect.left);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            if (closestIndex !== currentIndex) {
                currentIndex = closestIndex;
                updateButtons();
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }
        }, 100);
    });

    // 초기 상태
    updateButtons();
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

// Ghost Blog API Fetching
async function loadGhostBlog() {
    const GHOST_API_URL = 'https://blog.nothingmatters.co.kr';
    const GHOST_API_KEY = '28c88bc80587105e1cbc6d84c3';
    const grid = document.getElementById('ghost-blog-grid');
    if (!grid) return;

    try {
        const response = await fetch(`${GHOST_API_URL}/ghost/api/content/posts/?key=${GHOST_API_KEY}&limit=3&include=tags,authors`);

        if (!response.ok) {
            throw new Error(`Ghost API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.posts && data.posts.length > 0) {
            grid.innerHTML = ''; // Clear loading text

            data.posts.forEach(post => {
                // Use feature image or fallback to a default image
                const imgUrl = post.feature_image ? post.feature_image : 'images/consult_icon.png';

                const postEl = document.createElement('div');
                postEl.className = 'nm-journal-item';

                postEl.innerHTML = `
                    <a href="${post.url}" target="_blank" style="text-decoration:none; color:inherit;">
                        <div class="nm-journal-img" style="background-image: url('${imgUrl}');"></div>
                        <div class="nm-journal-info">
                            <div class="nm-journal-title">${post.title}</div>
                        </div>
                    </a>
                `;

                grid.appendChild(postEl);
            });
        } else {
            grid.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-size: 0.85em;">아직 작성된 블로그 글이 없습니다.</div>';
        }
    } catch (error) {
        console.error('Failed to load Ghost Blog:', error);
        grid.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #666; font-size: 0.85em; margin-bottom: 12px;">블로그 글을 잠시 불러오지 못했습니다.</p>
                <a href="https://blog.nothingmatters.co.kr" target="_blank" class="nm-btn nm-btn-small">블로그 직접 가기</a>
            </div>
        `;
    }
}

// Ensure it runs after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    try { loadGhostBlog(); } catch (e) { console.error('Ghost Blog load error:', e); }
});
