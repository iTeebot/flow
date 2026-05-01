import axios from 'axios';
import { invoke } from '../lib/api';
import { isTauri } from '../lib/platform';
import { checkFullConnectivity } from './connectivity';
import { loadBusinessJwt, clearBusinessJwt } from './businessJwtStore';
import { gunzipSync, gzipSync } from 'fflate';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.afmsolution.tech/api';

/**
 * Sends the recovery code to the user's email.
 */
export const sendRecoveryCodeEmail = async (email: string, businessName: string, recoveryCode: string) => {
  try {
    console.log(`📧 Attempting to send recovery email to: ${email}`);
    
    // Check connectivity before API call
    const connectivity = await checkFullConnectivity();
    console.log(`🌐 Connectivity check - Internet: ${connectivity.hasInternet}, Server: ${connectivity.serverAvailable}`);
    
    if (!connectivity.hasInternet) {
      throw new Error("No internet connection available");
    }
    if (!connectivity.serverAvailable) {
      throw new Error("Server is not available");
    }

    const endpoint = `${API_BASE_URL}/teebot-flow/send-recovery-code-email`;
    console.log(`📍 Calling endpoint: ${endpoint}`);
    
    const response = await axios.post(endpoint, {
      email,
      businessName,
      recoveryCode
    });
    
    console.log(`✅ Recovery email sent successfully:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to send recovery email');
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    throw error;
  }
};

/**
 * Uploads a backup file to the cloud using the persisted business JWT.
 */
export const uploadBackup = async (backupBlob: Blob) => {
  try {
    // Check connectivity before API call
    const connectivity = await checkFullConnectivity();
    if (!connectivity.hasInternet) {
      throw new Error("No internet connection available");
    }
    if (!connectivity.serverAvailable) {
      throw new Error("Server is not available");
    }

    const businessJwt = await loadBusinessJwt();
    if (!businessJwt) {
      throw new Error("Business identity token not found. Please register or sync the business first.");
    }

    const rawBytes = new Uint8Array(await backupBlob.arrayBuffer());
    const gzippedBytes = gzipSync(rawBytes);
    const gzippedBuffer = gzippedBytes.buffer.slice(gzippedBytes.byteOffset, gzippedBytes.byteOffset + gzippedBytes.byteLength) as ArrayBuffer;

    const formData = new FormData();
    formData.append('backup', new Blob([gzippedBuffer], { type: 'application/gzip' }), 'teebot-backup.tbf.gz');

    const response = await axios.post(`${API_BASE_URL}/teebot-flow/upload-backup`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${businessJwt}`,
      },
    });
    console.log('✅ Backup uploaded:', response.data.fileId);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const serverError = error.response?.data?.error;
    console.error('❌ Upload failed:', serverError || error.message);

    if (status === 401 && serverError === 'Session Expired') {
      try {
        await clearBusinessJwt();
      } catch (e) {
        console.warn('Failed to clear business JWT locally:', e);
      }
      throw new Error('Session Expired');
    }

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
    const gzippedBytes = new Uint8Array(await response.data.arrayBuffer());
    const decompressedBytes = gunzipSync(gzippedBytes);
    const decompressedBuffer = decompressedBytes.buffer.slice(decompressedBytes.byteOffset, decompressedBytes.byteOffset + decompressedBytes.byteLength) as ArrayBuffer;
    return new Blob([decompressedBuffer], { type: 'application/octet-stream' });
  } catch (error: any) {
    const status = error.response?.status;
    const serverError = error.response?.data?.error;

    if (status === 401 && serverError === 'Session Expired') {
      try {
        await clearBusinessJwt();
      } catch (e) {
        console.warn('Failed to clear business JWT locally:', e);
      }
      throw new Error('Session Expired');
    }

    if (status === 404) {
      throw new Error('No backups found on cloud.');
    }

    throw error;
  }
};

/**
 * Generates and uploads an initial backup.
 * Used after registration or cloud sync.
 */
export const performInitialBackup = async (secretKey: string) => {
  if (!isTauri()) return;

  try {
    // 1. Create a local backup encrypted with the recovery key
    const backupInfo = await invoke<any>('create_backup', { encryptionKey: secretKey });
    const backupPath = backupInfo.backup_path;

    // 2. Read the file from disk using Tauri fs plugin
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const fileData = await readFile(backupPath);
    const backupBlob = new Blob([fileData], { type: 'application/octet-stream' });

    // 3. Upload to cloud
    await uploadBackup(backupBlob);
    
    return true;
  } catch (err) {
    console.error("Initial backup/upload failed:", err);
    throw err;
  }
};
