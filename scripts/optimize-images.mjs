import sharp from 'sharp';
for(const name of ['jar-100-cutout','jar-200-cutout','brand'])await sharp('public/assets/'+name+'.png').resize({width:name==='brand'?1200:900,withoutEnlargement:true}).webp({quality:85}).toFile('public/assets/'+name+'.webp');
await sharp('public/assets/brand.png').resize({width:160,withoutEnlargement:true}).webp({quality:85}).toFile('public/assets/brand-small.webp');
console.log('Optimized WebP derivatives saved. Original supplied images preserved.');
