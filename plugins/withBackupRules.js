const fs = require('fs');
const path = require('path');
const { withDangerousMod, createRunOncePlugin } = require('expo/config-plugins');

/**
 * Plugin para criar regras de backup Android que protegem o SQLite.
 * 
 * - Exclui bancos SQLite do backup automático
 * - Cada usuário tem seu próprio banco (ascen_{userId}.db)
 * - Restaurar dados de outro usuário quebraria integridade
 * - Permite backup de SharedPreferences não sensíveis
 */
function withBackupRules(config) {
  return withDangerousMod(config, [
    'android',
    async cfg => {
      const resPath = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      
      // Cria diretório se não existe
      fs.mkdirSync(resPath, { recursive: true });
      
      const backupRules = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <!-- Exclui bancos SQLite do backup automático -->
  <exclude domain="database" path="." />
  <!-- Exclui arquivos do app (incluindo SQLite direto) -->
  <exclude domain="file" path="ascen_" />
  <!-- Permite backup de SharedPreferences não sensíveis -->
  <include domain="sharedpref" path="preferences.xml" />
</full-backup-content>
`;
      
      fs.writeFileSync(path.join(resPath, 'backup_rules.xml'), backupRules, 'utf8');
      
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withBackupRules,
  'with-backup-rules',
  '1.0.0'
);
