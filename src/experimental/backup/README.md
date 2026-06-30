# Backup & Recovery Module

## Status

**EXPERIMENTAL** - This module is not part of the current product release.

## Objective

This module provides backup and recovery functionality for the Ascen app, including:

- Encrypted cloud backup to Supabase Storage and Google Drive
- Snapshot-based data export/import
- Backup passphrase management
- Avatar backup/restore
- Google Drive OAuth integration

## Why Experimental

The backup infrastructure is fully implemented at the service level but has **no UI integration**. Users cannot currently:

- Configure a backup passphrase
- Perform manual backups
- Restore from backup
- Connect/disconnect Google Drive

All backup functions are exposed via `UserLocalDataContext` but are not called by any screen.

## Current State

### Implemented Services
- `services/cloudSnapshot.ts` - Main backup/restore logic
- `services/backupPassphrase.ts` - Passphrase management (SHA256 hash, no plaintext storage)
- `services/snapshotCrypto.ts` - Encryption/decryption (NaCl, v2 format)
- `services/googleDriveSnapshot.ts` - Google Drive API integration
- `services/googleAccessToken.ts` - Token management
- `services/googleDriveAuthDirect.ts` - OAuth flow

### Components
- `components/PassphraseModal.tsx` - Modal for passphrase entry (ready but unused)

### Configuration
- `config/googleOAuth.ts` - Google OAuth client configuration
- `constants/cloudBackup.ts` - Backup constants and paths

### Integration Points
- `UserLocalDataContext` exposes backup functions
- `AuthContext` integrates Google Drive authorization
- `DeleteAccountScreen` cleans up backup data (LGPD compliance)

## Data Covered by Backup

The snapshot includes:
- `transactions` - Financial transactions
- `categories` - Transaction categories
- `recurring_rules` - Recurring transaction rules
- `goals` - Financial goals (local-only, NOT synced)
- `avatarBase64` - User avatar (local-only, NOT synced)

**Note:** Goals and avatar are not synchronized via the regular sync mechanism, making backup essential for data preservation when switching devices.

## Future Plans

This module will be revisited after the initial app release to:

1. Add UI for backup passphrase configuration
2. Add UI for manual backup triggers
3. Add UI for restore operations
4. Add UI for Google Drive connection management
5. Implement onboarding flow for device migration

## Security Considerations

- Backup passphrase is stored as SHA256 hash only (never plaintext)
- Snapshots are encrypted using NaCl secretbox with PBKDF2-derived keys
- No sensitive data is exposed in production logs
- LGPD-compliant data deletion via `purgeAllBackupDataForUser()`

## Dependencies

This module depends on:
- `expo-secure-store` - Secure storage for passphrase hash
- `expo-crypto` - Cryptographic operations
- `tweetnacl` / `tweetnacl-util` - Encryption
- `expo-auth-session` - Google OAuth
- Supabase Storage - Cloud backup storage
- Google Drive API - Alternative cloud storage

## Migration Notes

If you need to move this module out of experimental:

1. Create UI screens for backup/restore operations
2. Integrate `PassphraseModal` into configuration screens
3. Add backup settings to Profile/Settings screens
4. Implement device migration onboarding flow
5. Update this README to reflect production status
