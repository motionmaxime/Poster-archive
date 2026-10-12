document.getElementById('year').textContent = new Date().getFullYear();

async function initializeArchive() {
    const carousel = document.querySelector('.poster-caroussel');
    try {
        const response = await fetch('/api/posters');
        if (!response.ok) throw new Error('Archive unavailable');
        const posters = await response.json();
        if (posters.length) carousel.replaceChildren(...posters.map(poster => {
            const card = document.createElement('div'); card.className = 'card';
            const image = document.createElement('img'); image.src = poster.image; image.alt = poster.name;
            const label = document.createElement('span'); label.textContent = `${poster.name} - ${poster.date.slice(0, 4)}`;
            card.append(image, label); return card;
        }));
    } catch { /* Les affiches HTML restent disponibles sur un hébergement statique. */ }
    const originals = Array.from(carousel.children);
    if (!originals.length) return;
    const track = document.createElement('div'); track.className = 'carousel-track';
    // Assez de copies pour remplir aussi un grand écran avec une seule affiche.
    const copies = Math.max(4, Math.ceil(window.innerWidth / originals[0].offsetWidth / originals.length) + 3);
    for (let copy = 0; copy < copies; copy++) originals.forEach((card, index) => {
        const clone = card.cloneNode(true); clone.dataset.index = index;
        if (copy !== 1) clone.setAttribute('aria-hidden', 'true');
        track.append(clone);
    });
    carousel.replaceChildren(track);
    const progress = document.querySelector('.progress');
    let width = track.firstElementChild.offsetWidth;
    let x = -originals.length * width, targetX = x;
    let dragging = false, pointerX = 0;
    carousel.addEventListener('wheel', event => {
        event.preventDefault();
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        targetX -= delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? carousel.clientWidth : 1.5);
    }, { passive: false });
    carousel.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        dragging = true; pointerX = event.clientX; carousel.setPointerCapture(event.pointerId);
    });
    carousel.addEventListener('pointermove', event => {
        if (!dragging) return;
        targetX += (event.clientX - pointerX) * 1.5; pointerX = event.clientX;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => carousel.addEventListener(type, () => { dragging = false; }));
    carousel.tabIndex = 0;
    carousel.setAttribute('aria-label', 'Posters — faites défiler ou utilisez les flèches gauche et droite');
    carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); targetX += event.key === 'ArrowRight' ? -width : width;
        }
    });
    new ResizeObserver(() => {
        const nextWidth = track.firstElementChild.offsetWidth;
        if (width && nextWidth) { x *= nextWidth / width; targetX *= nextWidth / width; width = nextWidth; }
    }).observe(carousel);
    let active = -1;
    function animate() {
        if (width > 0) {
            x += (targetX - x) * .1;
            const origin = -originals.length * width;
            while (x <= origin - width) { track.append(track.firstElementChild); x += width; targetX += width; }
            while (x > origin) { track.prepend(track.lastElementChild); x -= width; targetX -= width; }
            track.style.transform = `translateX(${x}px)`;
            const bounds = carousel.getBoundingClientRect();
            const center = bounds.width / 2;
            let nearest = Infinity, index = 0;
            Array.from(track.children).forEach((card, i) => {
                const distance = Math.abs(center - (x + i * width + width / 2));
                const ratio = distance / width;
                card.style.opacity = Math.max(.4, 1 - .3 * ratio);
                card.style.transform = `translateY(${-40 * Math.max(0, 1 - ratio)}px)`;
                if (distance < nearest) { nearest = distance; index = Number(card.dataset.index); }
            });
            if (active !== index) { active = index; progress.style.width = `${(index + 1) / originals.length * 100}%`; }
        }
        requestAnimationFrame(animate);
    }
    animate();
}
initializeArchive();
