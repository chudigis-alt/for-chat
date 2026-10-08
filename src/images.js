export const imageUrl=src=>/^\/assets\/(jar-(100|200)-cutout|brand)\.png$/.test(src||'')?src.replace(/\.png$/,'.webp'):src;
