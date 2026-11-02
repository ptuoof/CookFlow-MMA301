// Photos/videos picked from the album come back as cache URIs that the OS may purge at any time,
// which silently broke custom recipe images later. Local media is copied into the app's
// document directory (kept until the app is uninstalled) when a recipe is saved.
import { Platform } from 'react-native';
import { makeId } from './recipeModel';

const MEDIA_DIR = 'recipe-media';
const isLocalUri = uri => typeof uri === 'string' && /^(file|content):/i.test(uri);

/** Returns a durable URI for `uri`; web URLs, web builds and failed copies keep the original. */
export const persistMedia = async uri => {
  if (Platform.OS === 'web' || !isLocalUri(uri)) return uri;
  try {
    const { Directory, File, Paths } = require('expo-file-system');
    const dir = new Directory(Paths.document, MEDIA_DIR);
    if (uri.startsWith(dir.uri)) return uri;
    dir.create({ idempotent: true });
    const ext = uri.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'bin';
    const target = new File(dir, `${makeId('media')}.${ext}`);
    await new File(uri).copy(target);
    return target.uri;
  } catch {
    // Still viewable until the OS clears its cache — better than failing the save
    return uri;
  }
};
