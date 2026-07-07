const { withAndroidManifest, createRunOncePlugin } = require('expo/config-plugins');

/**
 * Plugin para endurecer configurações de segurança do AndroidManifest.
 * 
 * - Desabilita android:allowBackup para evitar restauração automática
 *   de dados do SQLite que pode quebrar integridade do app.
 * - Cada usuário tem seu próprio banco (ascen_{userId}.db), e restaurar
 *   dados de outro usuário causaria inconsistências.
 */
function withAndroidManifestSecurity(config) {
  return withAndroidManifest(config, (newConfig) => {
    const manifest = newConfig.modResults;

    // Encontra a aplicação principal
    const application = manifest.manifest.application?.[0];
    if (!application) {
      return newConfig;
    }

    // Desabilita allowBackup para evitar restauração de dados inconsistentes
    application.$['android:allowBackup'] = 'false';

    // fullBackupContent=false desabilita backup automático completo
    // Usaremos dataExtractionRules se necessário no futuro
    application.$['android:fullBackupContent'] = '@xml/backup_rules';

    return newConfig;
  });
}

module.exports = createRunOncePlugin(
  withAndroidManifestSecurity,
  'with-android-manifest-security',
  '1.0.0'
);
