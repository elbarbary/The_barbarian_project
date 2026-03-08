document.addEventListener('DOMContentLoaded', () => {

    // Always start at the very top — prevent browser scroll restoration mid-page
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // --- Configuration ---
    // Using the 360 high-quality frames extracted directly from the video sequence
    const framesDir = 'frames_video';
    const frameCount = 360;

    // --- Preloading ---
    // Pre-allocate all image slots
    const images = new Array(frameCount);
    let imagesLoaded = 0;
    const progressEl = document.getElementById('loaderProgress');
    const preloaderEl = document.getElementById('preloader');
    let preloaderDismissed = false;

    function dismissPreloader() {
        if (preloaderDismissed) return;
        preloaderDismissed = true;
        setTimeout(() => {
            preloaderEl.style.opacity = '0';
            setTimeout(() => {
                preloaderEl.style.display = 'none';
                setTimeout(() => handleScroll(), 50);
            }, 800);
        }, 300);
    }

    function loadFrame(i) {
        return new Promise((resolve) => {
            const img = new Image();
            const frameNum = i.toString().padStart(3, '0');
            img.src = `${framesDir}/frame-${frameNum}.jpg`;
            img.onload = img.onerror = () => {
                images[i - 1] = img;
                imagesLoaded++;
                const pct = Math.min(100, Math.round((imagesLoaded / frameCount) * 100));
                progressEl.style.width = `${pct}%`;
                if (imagesLoaded === 1) renderFrame(0);
                resolve();
            };
        });
    }

    // Phase 1: Load first 60 frames sequentially for smooth initial playback
    async function startLoading() {
        // Load first 60 frames in batches of 10 (avoids browser connection flooding)
        const phase1 = [];
        for (let i = 1; i <= 60; i++) phase1.push(i);

        for (let b = 0; b < phase1.length; b += 10) {
            const batch = phase1.slice(b, b + 10).map(i => loadFrame(i));
            await Promise.all(batch);
            if (imagesLoaded >= 20 && !preloaderDismissed) dismissPreloader();
        }

        // Phase 2: Load remaining frames in background
        for (let b = 61; b <= frameCount; b += 15) {
            const batch = [];
            for (let i = b; i < Math.min(b + 15, frameCount + 1); i++) batch.push(loadFrame(i));
            await Promise.all(batch);
        }
    }

    startLoading();

    // --- Canvas Animation ---
    const canvas = document.getElementById('trainCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const scrollContainer = document.getElementById('scrollContainer');

    let currentFrameIndex = 0;

    // Resize canvas to cover window exactly
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-draw current frame
        renderFrame(currentFrameIndex);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function renderFrame(index) {
        if (!images[index] || !images[index].complete || images[index].naturalWidth === 0) return;

        const img = images[index];
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        // "object-fit: cover" logic for canvas
        if (canvasRatio > imgRatio) {
            drawWidth = canvas.width;
            drawHeight = drawWidth / imgRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height;
            drawWidth = drawHeight * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        // Draw frame
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    // Scroll mapping
    const handleScroll = () => {
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrollHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        );
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const maxScroll = scrollHeight - windowHeight;

        let scrollFraction = maxScroll > 0 ? (scrollTop / maxScroll) : 0;

        // Ensure within bounds
        if (scrollFraction < 0) scrollFraction = 0;
        if (scrollFraction > 1) scrollFraction = 1;

        // Map to frame index
        // Limit to frameCount - 1
        let frameIndex = Math.min(
            frameCount - 1,
            Math.floor(scrollFraction * frameCount)
        );

        if (frameIndex !== currentFrameIndex) {
            currentFrameIndex = frameIndex;
            // Use requestAnimationFrame for smooth drawing
            requestAnimationFrame(() => renderFrame(frameIndex));
        }

        // --- Animate timeline cards moving left-to-right ---
        const timelineContainer = document.querySelector('.timeline-container');
        const timelineCards = Array.from(document.querySelectorAll('.timeline-year-marker, .timeline-card'));

        if (timelineContainer && timelineCards.length > 0) {
            const tlRect = timelineContainer.getBoundingClientRect();
            let tlProgress = -tlRect.top / (tlRect.height - windowHeight);
            if (tlProgress < 0) tlProgress = 0;
            if (tlProgress > 1) tlProgress = 1;

            const totalItems = timelineCards.length;
            const slice = 1.0 / totalItems;

            timelineCards.forEach((card, index) => {
                const itemCenter = (index + 0.5) * slice;
                const dist = (tlProgress - itemCenter) / slice;

                if (dist > -2.0 && dist < 2.0 && tlRect.top < windowHeight && tlRect.bottom > 0) {
                    const opacity = Math.max(0, 1 - Math.abs(dist) * 0.8);
                    card.style.opacity = opacity;

                    const translateX = dist * (window.innerWidth * 0.45);
                    const translateY = dist * -50;
                    const rotateZ = -2;

                    card.style.transform = `translate(calc(-50% + ${translateX}px), ${translateY}px) rotate(${rotateZ}deg)`;
                    card.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none';
                } else {
                    card.style.opacity = 0;
                    card.style.pointerEvents = 'none';
                }
            });
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- Navigation & Header ---
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // --- Intersection Observer for Fade-Ups ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.hero-badge, .hero-name, .hero-tagline, .hero-links, .skill-group');
    fadeElements.forEach(el => observer.observe(el));
});
