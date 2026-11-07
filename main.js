// Portfolio interactions — a progressive enhancement of the original site.
// Note: Google Sheets contact submission code below is copied verbatim from main.js.
document.addEventListener('DOMContentLoaded', function () {
    const loadingScreen = document.querySelector('.loading-screen');
    const closeLoader = () => {
        if (!loadingScreen || loadingScreen.classList.contains('is-hidden')) return;
        loadingScreen.classList.add('is-hidden');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 550);
    };
    // No artificial multi-second wait. Always allow the page to remain usable.
    requestAnimationFrame(() => setTimeout(closeLoader, 240));

    // Accessible navigation for mouse, touch and keyboard.
    const nav = document.querySelector('nav');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('main section[id]');
    const scrollProgress = document.querySelector('.scroll-progress');

    function setMenu(open) {
        navLinks.classList.toggle('active', open);
        menuToggle.classList.toggle('active', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuToggle.querySelector('span').textContent = open ? '×' : '☰';
    }
    menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));
    navLinksItems.forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', event => {
        if (navLinks.classList.contains('active') && !navLinks.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
    });

    function setActiveLink() {
        const landmark = window.innerHeight * .30 + 68;
        let active = 'home';
        sections.forEach(section => {
            if (section.getBoundingClientRect().top <= landmark) active = section.id;
        });
        navLinksItems.forEach(link => {
            const selected = link.getAttribute('href') === '#' + active;
            link.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }
    function syncScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 45);
        setActiveLink();
        if (scrollProgress) {
            const range = document.documentElement.scrollHeight - window.innerHeight;
            const value = range > 0 ? Math.min(1, window.scrollY / range) : 0;
            scrollProgress.style.transform = 'scaleX(' + value + ')';
        }
    }
    window.addEventListener('scroll', syncScroll, {passive:true});
    window.addEventListener('resize', syncScroll, {passive:true});
    syncScroll();

    // Keep original categories and filter controls, but eliminate overlapping
    // animation timers that hid cards after the filter had already changed.
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    const projectCount = document.getElementById('project-count');
    filterBtns.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
    filterBtns.forEach(button => button.addEventListener('click', function () {
        const filterValue = button.dataset.filter;
        filterBtns.forEach(btn => {
            const selected = btn === button;
            btn.classList.toggle('active', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        let count = 0;
        projectCards.forEach(card => {
            const categories = (card.dataset.category || '').split(/\s+/);
            const matches = filterValue === 'all' || categories.includes(filterValue);
            card.hidden = !matches;
            if (matches) {
                count++;
                card.classList.remove('is-filter-entering');
                void card.offsetWidth;
                card.classList.add('is-filter-entering');
                // Original reveal stays active when a filtered item reappears.
                card.classList.add('active');
            }
        });
        if (projectCount) projectCount.textContent = String(count).padStart(2,'0') + (count === 1 ? ' PROJECT' : ' PROJECTS');
    }));

    // Original theme preference and Three.js theme coordination retained.
    const themeSwitch = document.getElementById('theme-switch');
    const htmlElement = document.documentElement;
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('theme'); } catch (_) {}
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const startTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (prefersDarkScheme.matches ? 'dark' : 'light');
    htmlElement.setAttribute('data-theme', startTheme);
    updateThemeIcon(startTheme);
    if (typeof window.updateThreeJsTheme === 'function') window.updateThreeJsTheme(startTheme);
    themeSwitch.addEventListener('click', () => {
        const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
        try { localStorage.setItem('theme', newTheme); } catch (_) {}
        updateThemeIcon(newTheme);
        if (typeof window.updateThreeJsTheme === 'function') window.updateThreeJsTheme(newTheme);
    });
    function updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-switch-icon');
        if (themeIcon) themeIcon.className = (theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun') + ' theme-switch-icon';
        themeSwitch.setAttribute('aria-pressed', String(theme === 'light'));
        themeSwitch.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }

    // 3D movement toggle; respects reduced-motion preference initially.
    const motionToggle = document.getElementById('motion-toggle');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionToggle) {
        function updateMotionButton(paused) {
            motionToggle.setAttribute('aria-pressed', String(paused));
            motionToggle.setAttribute('aria-label', paused ? 'Resume 3D animation' : 'Pause 3D animation');
            motionToggle.innerHTML = paused ? '<i class="fas fa-play" aria-hidden="true"></i><span>PLAY MOTION</span>' : '<i class="fas fa-pause" aria-hidden="true"></i><span>PAUSE MOTION</span>';
        }
        updateMotionButton(reducedMotion.matches);
        motionToggle.addEventListener('click', () => {
            const paused = motionToggle.getAttribute('aria-pressed') !== 'true';
            updateMotionButton(paused);
            if (typeof window.setThreeJsPaused === 'function') window.setThreeJsPaused(paused);
        });
        reducedMotion.addEventListener?.('change', event => {
            updateMotionButton(event.matches);
            if (typeof window.setThreeJsPaused === 'function') window.setThreeJsPaused(event.matches);
        });
    }

    // Small pointer-driven depth cue on image cards (never on form controls).
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches && !reducedMotion.matches) {
        document.querySelectorAll('.app-card, .project-card').forEach(card => {
            card.addEventListener('pointermove', event => {
                const box = card.getBoundingClientRect();
                const px = (event.clientX - box.left) / box.width - .5;
                const py = (event.clientY - box.top) / box.height - .5;
                card.style.transform = 'perspective(1100px) translateY(-7px) rotateX(' + (-py*2.6).toFixed(2) + 'deg) rotateY(' + (px*2.6).toFixed(2) + 'deg)';
            });
            card.addEventListener('pointerleave', () => card.style.removeProperty('transform'));
            card.addEventListener('blur', () => card.style.removeProperty('transform'), true);
        });
    }
    // Add accessible link labels to icon-only project actions.
    projectCards.forEach(card => {
        const title = card.querySelector('.project-title')?.textContent?.trim() || 'project';
        card.querySelectorAll('.project-link, .project-github').forEach(link => {
            const platform = link.classList.contains('project-github') ? 'GitHub repository for ' : 'Project link for ';
            link.setAttribute('aria-label', platform + title);
            if (link.target === '_blank') link.rel = 'noopener noreferrer';
        });
    });

    // Contact form submission via Google Apps Script using fetch
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    let isFormSubmitting = false;
    let formSubmitTimeout;

    function showStatus(type, text) {
        formStatus.style.display = 'block';
        formStatus.className = `form-status ${type}`;
        formStatus.textContent = text;
    }

    function resetFormState() {
        isFormSubmitting = false;
        clearTimeout(formSubmitTimeout);
    }

    contactForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const url = contactForm.getAttribute('action');
        const formData = new URLSearchParams(new FormData(contactForm));

        showStatus('loading', 'Sending message...');
        isFormSubmitting = true;

        formSubmitTimeout = setTimeout(function () {
            if (!isFormSubmitting) return;
            resetFormState();
            showStatus('error', 'Submission timed out. Please try again later or email me directly.');
        }, 15000);

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: formData.toString(),
            mode: 'cors'
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok (' + response.status + ')');
                }
                return response.json();
            })
            .then(function (data) {
                resetFormState();
                if (data && data.status === 'success') {
                    showStatus('success', 'Your message has been sent successfully! I will get back to you soon.');
                    contactForm.reset();
                    setTimeout(function () {
                        formStatus.style.display = 'none';
                    }, 5000);
                } else {
                    showStatus('error', data.message || 'Submission failed. Please try again later or email me directly.');
                }
            })
            .catch(function (error) {
                resetFormState();
                console.error('Contact submit error:', error);
                showStatus('error', 'Unable to send message from this page. Please check Apps Script CORS settings or email me directly.');
            });
    });

    // Scroll reveal animation
    function revealOnScroll() {
        const elements = document.querySelectorAll('.about-content, .skills-categories, .project-card, .contact-content');

        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;

            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', revealOnScroll);

    // Initialize animations
    revealOnScroll();
    setActiveLink();
});

// Add CSS for scroll reveal animations
const style = document.createElement('style');
style.textContent = `
    .about-content, .skills-categories, .project-card, .contact-content {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .about-content.active, .skills-categories.active, .project-card.active, .contact-content.active {
        opacity: 1;
        transform: translateY(0);
    }
    
    .project-card {
        transition-delay: calc(0.1s * var(--i));
    }
`;
document.head.appendChild(style);

// Set transition delay for project cards
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach((card, index) => {
    card.style.setProperty('--i', index % 3);
});