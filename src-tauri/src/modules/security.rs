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
    let compressed = zstd::encode_all(data, 3).map_err(|e| format!("Compression failed: {e}"))?;

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
    let original_data =
        zstd::decode_all(&compressed[..]).map_err(|e| format!("Decompression failed: {e}"))?;

    Ok(original_data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_recovery_key_format() {
        let key = generate_recovery_key();
        // The key should be 32 alphanumeric chars + 7 hyphens = 39 chars
        assert_eq!(key.len(), 39);
        // It should contain hyphens every 4 characters
        let parts: Vec<&str> = key.split('-').collect();
        assert_eq!(parts.len(), 8);
        for part in parts {
            assert_eq!(part.len(), 4);
        }
    }

    #[test]
    fn test_compress_encrypt_decrypt_decompress() {
        let key = generate_recovery_key();
        let original_data = b"Hello, this is a secret message to test encryption and compression!";

        let encrypted = compress_and_encrypt(original_data, &key).expect("Encryption failed");
        let decrypted = decrypt_and_decompress(&encrypted, &key).expect("Decryption failed");

        assert_eq!(original_data.to_vec(), decrypted);
    }

    #[test]
    fn test_decrypt_invalid_key() {
        let key1 = generate_recovery_key();
        let key2 = generate_recovery_key();
        let original_data = b"Top secret data";

        let encrypted = compress_and_encrypt(original_data, &key1).expect("Encryption failed");
        let decrypted = decrypt_and_decompress(&encrypted, &key2);

        assert!(decrypted.is_err());
    }
}
