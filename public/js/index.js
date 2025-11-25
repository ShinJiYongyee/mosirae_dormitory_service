// ============================================
// 로그인 상태 확인 및 UI 업데이트
// ============================================
const loginBtn = document.getElementById('loginBtn');
let isLoggedIn = false;

// 페이지 로드 시 로그인 상태 확인
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        isLoggedIn = data.isLoggedIn;

        if (isLoggedIn) {
            // 로그인 상태: 로그아웃 버튼으로 변경
            loginBtn.textContent = '로그아웃';
        } else {
            // 비로그인 상태: 로그인 버튼
            loginBtn.textContent = '로그인';
        }
    } catch (error) {
        console.error('로그인 상태 확인 오류:', error);
        isLoggedIn = false;
        loginBtn.textContent = '로그인';
    }
}

// 로그인 버튼 클릭 이벤트
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // 모든 경우에 기본 동작 막기

    if (isLoggedIn) {
        // 로그아웃 처리
        if (!confirm('로그아웃 하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });

            const data = await response.json();

            if (data.ok) {
                alert('로그아웃되었습니다.');
                await checkLoginStatus(); // UI 업데이트
            } else {
                alert('로그아웃 실패: ' + data.message);
            }
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    } else {
        // 로그인 페이지로 이동
        window.location.href = 'login';
    }
});

// 페이지 로드 시 실행
checkLoginStatus();

// ============================================
// Mobile menu toggle
// ============================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');

mobileMenuBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
});

// Close mobile menu when clicking a link
const mobileNavLinks = mobileNav.querySelectorAll('a');
mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
    });
});

// Slideshow functionality
let currentSlide = 0;
let isPlaying = true;
let slideInterval;

const slides = document.querySelectorAll('.slide');
const indicators = document.querySelectorAll('.slide-indicator');
const prevBtn = document.getElementById('prevSlide');
const nextBtn = document.getElementById('nextSlide');
const playPauseBtn = document.getElementById('playPauseBtn');

function showSlide(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function prevSlide() {
    showSlide(currentSlide - 1);
}

function startSlideshow() {
    isPlaying = true;
    playPauseBtn.textContent = '⏸';
    slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideshow() {
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    clearInterval(slideInterval);
}

function togglePlayPause() {
    if (isPlaying) {
        stopSlideshow();
    } else {
        startSlideshow();
    }
}

// Event listeners
prevBtn.addEventListener('click', () => {
    prevSlide();
    if (isPlaying) {
        stopSlideshow();
        startSlideshow();
    }
});

nextBtn.addEventListener('click', () => {
    nextSlide();
    if (isPlaying) {
        stopSlideshow();
        startSlideshow();
    }
});

playPauseBtn.addEventListener('click', togglePlayPause);

indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
        showSlide(index);
        if (isPlaying) {
            stopSlideshow();
            startSlideshow();
        }
    });
});

// Start slideshow on load
startSlideshow();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
