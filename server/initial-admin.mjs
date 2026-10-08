import bcrypt from 'bcryptjs';

export async function initialAdminHash(config = process.env) {
  if (config.ADMIN_SEED_HASH) return config.ADMIN_SEED_HASH;
  const password = config.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 12 || password.length > 72) {
    throw Error('Configure ADMIN_SEED_HASH or a 12–72 character ADMIN_INITIAL_PASSWORD before seeding.');
  }
  return bcrypt.hash(password, 12);
}
