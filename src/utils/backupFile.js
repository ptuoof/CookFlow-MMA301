// Saving / opening backup files. Native: a JSON file shared through the system sheet (save to
// Files/Drive, send to yourself) and opened with the system file picker. Web: download / file input.
import { Platform } from 'react-native';
import { backupFileName } from './backup';

/** Shares (native) or downloads (web) the backup as a .json file. */
export const saveBackupFile = async backup => {
  const json = JSON.stringify(backup, null, 2);
  const name = backupFileName();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị này chưa hỗ trợ chia sẻ tệp.');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Lưu bản sao lưu CookFlow', UTI: 'public.json' });
};

const pickWebFileText = () => new Promise((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return resolve(null);
    file.text().then(resolve, reject);
  };
  input.click();
});

/** Lets the user pick a backup file; resolves with its text, or null when canceled. */
export const pickBackupFileText = async () => {
  if (Platform.OS === 'web') return pickWebFileText();
  const { File } = require('expo-file-system');
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (!picked || picked.canceled || !picked.result) return null;
  return picked.result.text();
};
