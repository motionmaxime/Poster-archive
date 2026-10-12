import { upload } from '@vercel/blob/client';
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
        const response = await fetch('/api/posters', {signal:AbortSignal.timeout(15000)});
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
        message.textContent = response.headers.get('X-Archive-Storage') === 'unconfigured' ? 'Affiches existantes visibles. Pour ajouter des posters, connecte un stockage Vercel Blob public au projet et redéploie.' : `${posters.length} poster${posters.length > 1 ? 's' : ''}`;
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
        const prepared = await fetch('/api/posters', {method:'POST', signal:AbortSignal.timeout(15000), headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:form.elements.name.value.trim(), date:form.elements.date.value, type:file.type})});
        const result = await prepared.json();
        if (!prepared.ok) throw new Error(result.error || 'Préparation impossible.');
        await upload(result.pathname, file, {
            access:'public', handleUploadUrl:'/api/upload', contentType:file.type,
            abortSignal:AbortSignal.timeout(120000),
            onUploadProgress: ({percentage}) => { status.textContent = `Envoi de l’image… ${Math.round(percentage)} %`; },
        });
        form.reset(); preview.hidden = true;
        if (previewURL) URL.revokeObjectURL(previewURL);
        status.textContent = 'Poster ajouté. Il est maintenant visible dans l’archive.';
        await loadPosters();
    } catch (error) { status.textContent = error.message || 'Connexion impossible. Réessayez.'; status.dataset.error = 'true'; }
    finally { button.disabled = false; }
});
loadPosters();
