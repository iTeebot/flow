use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::{distributions::Alphanumeric, Rng};
use zstd;

#[tauri::command]
pub fn generate_recovery_key() -> String {
    let key: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    
    // Format it nicely for the user
    key.as_bytes()
        .chunks(4)
        .map(|chunk| std::str::from_utf8(chunk).unwrap())
        .collect::<Vec<_>>()
        .join("-")
        .to_uppercase()
}

pub fn compress_and_encrypt(data: &[u8], key_str: &str) -> Result<Vec<u8>, String> {
    // 1. Clean key (remove hyphens)
    let clean_key = key_str.replace("-", "");
    if clean_key.len() != 32 {
        return Err("Invalid key length. Must be 32 characters.".to_string());
    }

    // 2. Compress data
    let compressed = zstd::encode_all(data, 3)
        .map_err(|e| format!("Compression failed: {e}"))?;

    // 3. Encrypt data
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(clean_key.as_bytes());
    let cipher = Aes256Gcm::new(key);
    
    let nonce_bytes = rand::thread_rng().gen::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let encrypted = cipher
        .encrypt(nonce, compressed.as_ref())
        .map_err(|e| format!("Encryption failed: {e}"))?;

    // 4. Package: [Nonce (12 bytes)] + [Encrypted Data]
    let mut final_package = Vec::with_capacity(12 + encrypted.len());
    final_package.extend_from_slice(&nonce_bytes);
    final_package.extend_from_slice(&encrypted);

    Ok(final_package)
}

pub fn decrypt_and_decompress(package: &[u8], key_str: &str) -> Result<Vec<u8>, String> {
    if package.len() < 12 {
        return Err("Invalid package: data too short".to_string());
    }

    // 1. Clean key
    let clean_key = key_str.replace("-", "");
    if clean_key.len() != 32 {
        return Err("Invalid key length. Must be 32 characters.".to_string());
    }

    // 2. Extract Nonce and Encrypted Data
    let nonce_bytes = &package[..12];
    let encrypted_data = &package[12..];

    // 3. Decrypt
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(clean_key.as_bytes());
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let compressed = cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|_| "Decryption failed. Please check your recovery key.".to_string())?;

    // 4. Decompress
    let original_data = zstd::decode_all(&compressed[..])
        .map_err(|e| format!("Decompression failed: {e}"))?;

    Ok(original_data)
}
