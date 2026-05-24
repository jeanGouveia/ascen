const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAndroidStyles, createRunOncePlugin } = require('expo/config-plugins');

const SPLASH_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap
      android:gravity="fill"
      android:src="@drawable/splashscreen_background" />
  </item>
  <item
    android:gravity="center"
    android:width="240dp"
    android:height="240dp">
    <bitmap
      android:gravity="center"
      android:src="@drawable/splashscreen_logo" />
  </item>
</layer-list>
`;

function withAscenSplashBackground(config) {
  // 1) Copia background e gera o layer-list
  config = withDangerousMod(config, [
    'android',
    async cfg => {
      const projectRoot = cfg.modRequest.projectRoot;
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      const srcBg = path.join(projectRoot, 'assets/splash-background.png');

      if (!fs.existsSync(srcBg)) {
        throw new Error('assets/splash-background.png não encontrado.');
      }

      const drawableDir = path.join(res, 'drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(srcBg, path.join(drawableDir, 'splashscreen_background.png'));
      fs.writeFileSync(path.join(drawableDir, 'splashscreen.xml'), SPLASH_XML, 'utf8');

      return cfg;
    },
  ]);

  // 2) Ajusta o tema para usar fundo transparente + windowBackground com imagem
  config = withAndroidStyles(config, cfg => {
    const styles = cfg.modResults;
    const list = styles.resources.style ?? [];

    styles.resources.style = list.map(style => {
      if (style.$?.name !== 'Theme.App.SplashScreen') return style;

      // Mantém o pai Theme.SplashScreen (essencial para a API)
      return {
        $: {
          name: 'Theme.App.SplashScreen',
          parent: 'Theme.SplashScreen',
        },
        item: [
          // Força o fundo da SplashScreen API para transparente
          { $: { name: 'android:windowSplashScreenBackground' }, _: '@android:color/transparent' },
          // Define o ícone/logo (já é gerado pelo expo-splash-screen, mas garantimos)
          { $: { name: 'android:windowSplashScreenAnimatedIcon' }, _: '@drawable/splashscreen_logo' },
          // Aqui está o segredo: o plano de fundo com a sua imagem
          { $: { name: 'android:windowBackground' }, _: '@drawable/splashscreen' },
          // Transição para o tema principal da aplicação
          { $: { name: 'postSplashScreenTheme' }, _: '@style/AppTheme' },
        ],
      };
    });

    cfg.modResults = styles;
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withAscenSplashBackground,
  'with-ascen-splash-background',
  '1.0.0'
);
