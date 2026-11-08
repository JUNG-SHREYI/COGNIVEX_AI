const GOOGLE_PROJECT_STORAGE_PREFIX = 'cognivex.googleCloudProject.';

export function getGoogleProjectStorageKey(userId) {
  if (!userId) throw new Error('Sign in before configuring Google Cloud.');
  return `${GOOGLE_PROJECT_STORAGE_PREFIX}${userId}`;
}

export function getUserGoogleProjectId(userId) {
  return window.localStorage.getItem(getGoogleProjectStorageKey(userId))?.trim() || '';
}
