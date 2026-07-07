# Session Manager - Sistema de Bloqueio por Inatividade

## 📋 Visão Geral

O SessionManager é um sistema robusto de gerenciamento de sessão que controla o bloqueio da aplicação por inatividade, com proteção contra bloqueios durante uso ativo e integração com biometria.

## 🎯 Características Principais

- **Timer inteligente**: Usa `setInterval` (1s) para verificar continuamente inatividade
- **Fonte única de verdade**: `lastInteraction` timestamp global
- **Flags de proteção**: Inibe bloqueio durante uso ativo
- **Configuração via environment variables**: Timeout configurável
- **Modo teste**: Logs detalhados para debug
- **Integração com AppState**: Comportamento consistente foreground/background
- **Biometria automática**: Desbloqueio via biometria ao bloquear

## ⚙️ Configuração

### Environment Variable

Configure o timeout de sessão via environment variable:

```bash
# .env
EXPO_PUBLIC_SESSION_TIMEOUT_SECONDS=300  # 5 minutos (default)
```

Para testes rápidos, use um valor menor:

```bash
EXPO_PUBLIC_SESSION_TIMEOUT_SECONDS=10  # 10 segundos (ativa modo teste)
```

### Fallback

Se a variável não estiver definida, o sistema usa **300 segundos (5 minutos)** como padrão.

## 🧠 Arquitetura

### SessionManager (`src/services/sessionManager.ts`)

Classe principal que gerencia o timer de inatividade:

```typescript
const SESSION_TIMEOUT_SECONDS = Number(Constants.expoConfig?.extra?.sessionTimeoutSeconds) || 300;
const BACKGROUND_TIMEOUT_MS = 30 * 1000;  // 30 segundos
const LOCK_COOLDOWN_MS = 30 * 1000;       // 30 segundos
```

**Métodos principais:**
- `start()`: Inicia o monitoramento
- `stop()`: Para o monitoramento
- `touch()`: Registra atividade do usuário
- `setCriticalFlow(active)`: Inibe bloqueio durante fluxos críticos
- `setUserInteracting(active)`: Inibe bloqueio durante interação
- `setSubmitting(active)`: Inibe bloqueio durante submit/loading
- `onAppBackground()`: Chamado quando app vai para background
- `onAppForeground()`: Chamado quando app volta ao foreground

### SessionContext (`src/context/SessionContext.tsx`)

React Context que expõe o SessionManager aos componentes:

```typescript
interface SessionContextType {
  locked: boolean;
  lastActivity: number;
  lock: () => void;
  unlock: () => void;
  touch: () => void;
  isLocked: boolean;
  setCriticalFlow: (active: boolean) => void;
  setUserInteracting: (active: boolean) => void;
  setSubmitting: (active: boolean) => void;
}
```

## 🖐️ Tracking Global de Interação

### ActivityTracker (`src/components/ActivityTracker.tsx`)

Wrapper global que captura toques na aplicação:

```tsx
<ActivityTracker>
  <AppNavigator />
  <TransactionModal />
  <CoachMarksOverlay />
</ActivityTracker>
```

**Comportamento:**
- Chama `touch()` em cada toque
- Ativa `setUserInteracting(true)` por 1 segundo após toque
- Inibe bloqueio durante interação ativa

### Integração em Componentes

#### useFocusEffect (Navegação)

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';

export function MyScreen() {
  const { touch } = useSession();

  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  // ...
}
```

#### TextInput (Inputs)

```tsx
<TextInput
  value={text}
  onChangeText={(value) => {
    setText(value);
    touch();
  }}
/>
```

## 🚫 Flags de Proteção

### Critical Flow (Fluxos Críticos)

Use para modais e formulários onde o usuário está ativamente trabalhando:

```tsx
useEffect(() => {
  if (modalVisible) {
    setCriticalFlow(true);
    touch();
  } else {
    setCriticalFlow(false);
  }
}, [modalVisible, setCriticalFlow, touch]);
```

**Aplicado em:**
- TransactionModal
- GoalsScreen (form e deposit modal)
- RecurringScreen (form modal)
- CategoryScreen (form modal)

### User Interacting (Interação Ativa)

Ativado automaticamente pelo `ActivityTracker` durante toques.

### Submitting (Submit/Loading)

Use durante operações assíncronas:

```tsx
const [saving, setSaving] = useState(false);

useEffect(() => {
  if (saving) {
    setSubmitting(true);
  } else {
    setSubmitting(false);
  }
}, [saving, setSubmitting]);

const handleSave = async () => {
  setSaving(true);
  try {
    await saveData();
  } finally {
    setSaving(false);
  }
};
```

**Aplicado em:**
- TransactionModal (saving)
- GoalsScreen (saving)

## 📱 AppState (Foreground/Background)

O sistema monitora mudanças de estado do app:

**Background:**
- Registra timestamp quando app vai para background
- Para verificação de inatividade

**Foreground:**
- Se passou > 30s em background → tenta bloquear
- Se < 30s → atualiza última interação e retoma

## 🔐 Biometria

### SessionLockScreen (`src/screens/SessionLockScreen.tsx`)

Tela de bloqueio com biometria automática:

```tsx
useEffect(() => {
  const attemptBiometricUnlock = async () => {
    // Verifica hardware e enrollment
    // Tenta autenticar
    // Se sucesso → unlock()
  };
  attemptBiometricUnlock();
}, [unlock]);
```

**Comportamento:**
- Verifica disponibilidade de hardware
- Verifica enrollment de biometria
- Tenta autenticar automaticamente
- Fallback para botão manual

## 🧪 Modo Teste

Quando `SESSION_TIMEOUT_SECONDS <= 10`, o sistema ativa logs detalhados:

```
[SESSION] TEST MODE - timeout: 10s
[SESSION] timer started
[SESSION] touch
[SESSION] checking inactivity - 1s / 10s
[SESSION] checking inactivity - 2s / 10s
[SESSION] user interacting started
[SESSION] lock attempt skipped - user interacting
[SESSION] locking app
```

**Como usar:**
```bash
EXPO_PUBLIC_SESSION_TIMEOUT_SECONDS=10
```

## 🧱 Anti-Bugs

### Single Interval

Apenas um `setInterval` roda globalmente, evitando race conditions.

### Memory Leak Prevention

- `stop()` limpa o interval
- `destroy()` garante limpeza ao desmontar
- `useEffect` cleanup no SessionProvider

### Cooldown

30 segundos entre tentativas de bloqueio para evitar bloqueios repetidos.

## 📦 Exemplos de Uso

### Hook useSession

```tsx
import { useSession } from '../context/SessionContext';

function MyComponent() {
  const { touch, setCriticalFlow, setSubmitting, locked } = useSession();

  // Registra atividade
  const handlePress = () => {
    touch();
    // ...
  };

  // Modal aberto
  useEffect(() => {
    if (isModalOpen) {
      setCriticalFlow(true);
    } else {
      setCriticalFlow(false);
    }
  }, [isModalOpen, setCriticalFlow]);

  // Submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submit();
    } finally {
      setSubmitting(false);
    }
  };

  // ...
}
```

### Integração em App.tsx

```tsx
import { ActivityTracker } from './src/components/ActivityTracker';

function AppContent() {
  const { locked } = useSession();

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <ActivityTracker>
        <AppNavigator />
        <TransactionModal state={modalState} onClose={closeTxModal} />
        <CoachMarksOverlay />
      </ActivityTracker>
      {locked && <SessionLockScreen />}
    </>
  );
}
```

## 🎯 Resultado Final

✔ **Nunca bloqueia durante uso ativo** - Flags de proteção inibem bloqueio
✔ **Respeita última interação** - Fonte única de verdade (lastInteraction)
✔ **Tempo controlado via .env** - Configurável e testável
✔ **Biometria funcionando** - Desbloqueio automático
✔ **Comportamento consistente foreground/background** - AppState integration
✔ **Código limpo e escalável** - Arquitetura profissional

## 🔧 Troubleshooting

### App bloqueia durante uso

**Causa:** Componente não está chamando `touch()` ou usando flags de proteção.

**Solução:**
- Adicione `useFocusEffect` com `touch()` em telas
- Use `setCriticalFlow(true)` em modais/formulários
- Use `setSubmitting(true)` durante operações assíncronas

### Timeout não respeita configuração

**Causa:** Environment variable não configurada corretamente.

**Solução:**
- Verifique se `EXPO_PUBLIC_SESSION_TIMEOUT_SECONDS` está no `.env`
- Reinicie o servidor Expo após alterar `.env`
- Use modo teste (<= 10s) para verificar logs

### Biometria não funciona

**Causa:** Hardware não disponível ou sem enrollment.

**Solução:**
- Verifique logs: `[LOCK] biometric hardware not available`
- Configure biometria no dispositivo
- Fallback manual sempre disponível
