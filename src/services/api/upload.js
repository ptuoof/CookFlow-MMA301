// Uploads photos / videos picked from the phone so every device can show them.
// Album picks are local URIs (file:, content:, ph:, blob:, data:) that only exist on this device.
import { Platform } from 'react-native';
import { apiRequest } from './client';

const LOCAL_URI = /^(file|content|ph|assets-library|blob|data):/i;
export const isLocalMedia = uri => typeof uri === 'string' && LOCAL_URI.test(uri);

const VIDEO_TYPES = { mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm', '3gp': 'video/3gpp' };
const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };

const extensionOf = uri => uri.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || null;

/**
 * Returns a URL every device can open: local media is uploaded, web URLs are returned unchanged.
 * @param {'image'|'video'} kind
 */
export const uploadMedia = async (uri, kind = 'image') => {
  if (!isLocalMedia(uri)) return uri;
  const types = kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
  const form = new FormData();

  if (Platform.OS === 'web') {
    // blob:/data: URIs from the web picker -> real Blob with its own MIME type
    const blob = await (await fetch(uri)).blob();
    const ext = Object.keys(types).find(key => types[key] === blob.type) || (kind === 'video' ? 'mp4' : 'jpg');
    form.append(kind, blob, `${kind}.${ext}`);
  } else {
    const ext = extensionOf(uri) || (kind === 'video' ? 'mp4' : 'jpg');
    form.append(kind, { uri, name: `${kind}.${ext}`, type: types[ext] || (kind === 'video' ? 'video/mp4' : 'image/jpeg') });
  }

  const data = await apiRequest(`/api/upload/${kind}`, { method: 'POST', body: form });
  return kind === 'video' ? data.videoUrl : data.imageUrl;
};
