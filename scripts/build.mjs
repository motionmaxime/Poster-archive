import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import seeds from '../lib/seeds.json' with {type:'json'};
await rm('public', {recursive:true, force:true});
await mkdir('public', {recursive:true});
for (const file of ['index.html','style.css','app.js','admin.css']) await cp(file, `public/${file}`);
await cp('img', 'public/img', {recursive:true});
await cp('published-uploads', 'public/uploads', {recursive:true});
// Le catalogue de secours contient aussi les affiches déjà ajoutées localement.
await writeFile('public/posters.json', JSON.stringify(seeds));
await build({entryPoints:['admin-vercel.js'], outfile:'public/admin.js', bundle:true, minify:true, platform:'browser', target:'es2022'});
console.log('Site Vercel construit ; aucun secret ni fichier de base de données dans public/.');
