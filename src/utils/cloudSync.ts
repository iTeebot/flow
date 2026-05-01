import axios from 'axios';
import { invoke } from '../lib/api';
import { isTauri } from '../lib/platform';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.afmsolution.tech/api';

/**
 * Sends the recovery code to the user's email.
 */
export const sendRecoveryCodeEmail = async (email: string, businessName: string, recoveryCode: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/teebot-flow/send-recovery-code-email`, {
      email,
      businessName,
      recoveryCode
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to send recovery email:', error.response?.data?.error || error.message);
    throw error;
  }
};

/**
 * Uploads a backup file to the cloud.
 */
export const uploadBackup = async (businessId: string, backupBlob: Blob, version = '0.0.1') => {
  try {
    const formData = new FormData();
    // 'backup' is the key expected by the server
    formData.append('backup', backupBlob, 'teebot-backup.tbf'); 
    formData.append('businessId', businessId);
    formData.append('version', version);

    const response = await axios.post(`${API_BASE_URL}/teebot-flow/upload-backup`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('✅ Backup uploaded:', response.data.fileId);
    return response.data;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data?.error || error.message);
    throw error;
  }
};

/**
 * Downloads the latest backup file from the cloud.
 */
export const downloadLatestBackup = async (businessId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teebot-flow/download-backup/${businessId}`, {
      responseType: 'blob'
    });
    return response.data; // Returns a Blob
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error("No backups found on cloud.");
    }
    throw error;
  }
};

/**
 * Generates and uploads an initial backup.
 * Used after registration or cloud sync.
 */
export const performInitialBackup = async (businessId: string, recoveryKey: string) => {
  if (!isTauri()) return;

  try {
    // 1. Create a local backup encrypted with the recovery key
    const backupInfo = await invoke<any>('create_backup', { encryptionKey: recoveryKey });
    const backupPath = backupInfo.backup_path;

    // 2. Read the file from disk using Tauri fs plugin
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const fileData = await readFile(backupPath);
    const backupBlob = new Blob([fileData], { type: 'application/octet-stream' });

    // 3. Upload to cloud
    await uploadBackup(businessId, backupBlob);
    
    return true;
  } catch (err) {
    console.error("Initial backup/upload failed:", err);
    throw err;
  }
};
