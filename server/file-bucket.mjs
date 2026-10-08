import fs from 'node:fs';
import path from 'node:path';

// Only use an explicitly configured persistent disk in production.
export function fileBucket(directory) {
  fs.mkdirSync(directory, {recursive: true});
  const safe = id => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('Invalid file ID');
    return path.join(directory, id);
  };
  return {
    put: async (id, bytes) => fs.writeFileSync(safe(id), bytes),
    get: async id => fs.existsSync(safe(id)) ? {body: fs.readFileSync(safe(id))} : null,
  };
}
