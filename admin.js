const form = document.querySelector('form');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const imageInput = document.querySelector('#image');
let previewURL;
imageInput.addEventListener('change', () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    const file = imageInput.files[0];
    preview.hidden = !file;
    if (file) preview.src = previewURL = URL.createObjectURL(file);
});
async function loadPosters() {
    const message = document.querySelector('#list-status');
    try {
        const response = await fetch('/api/posters');
        if (!response.ok) throw new Error();
        const posters = await response.json();
        document.querySelector('#posters').replaceChildren(...posters.map(poster => {
            const item = document.createElement('article');
            const img = document.createElement('img');
            img.src = poster.image; img.alt = poster.name; img.loading = 'lazy';
            const caption = document.createElement('p');
            caption.textContent = `${poster.name} — ${poster.date.length === 10 ? poster.date.split('-').reverse().join('/') : poster.date}`;
            item.append(img, caption); return item;
        }));
        message.textContent = `${posters.length} poster${posters.length > 1 ? 's' : ''}`;
    } catch { message.textContent = 'Impossible de charger la liste. Actualisez la page.'; }
}
form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    status.dataset.error = 'false';
    const file = imageInput.files[0];
    if (!file || file.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        status.textContent = 'Choisissez une image PNG, JPEG ou WebP de 10 Mo maximum.';
        status.dataset.error = 'true'; return;
    }
    button.disabled = true; status.textContent = 'Enregistrement en cours…';
    try {
        const image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject; reader.readAsDataURL(file);
        });
        const response = await fetch('/api/posters', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: form.elements.name.value.trim(), date: form.elements.date.value, image})});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Enregistrement impossible.');
        form.reset(); preview.hidden = true;
        if (previewURL) URL.revokeObjectURL(previewURL);
        status.textContent = 'Poster ajouté. Il est maintenant visible dans l’archive.';
        await loadPosters();
    } catch (error) { status.textContent = error.message || 'Connexion impossible. Réessayez.'; status.dataset.error = 'true'; }
    finally { button.disabled = false; }
});
loadPosters();
