# Ascen

App financeiro pessoal (React Native + Expo) com arquitetura **offline-first**: SQLite no aparelho e Supabase como fonte de verdade na nuvem.

## Stack

- Expo 54 · React Native · TypeScript
- SQLite (`expo-sqlite`) — cache local
- Supabase — auth, Postgres, storage
- Zustand — status de sincronização
- React Context — domínio (transações, categorias, família)

## Configuração

1. Copie `.env.example` para `.env` e preencha variáveis do Supabase/Google se usar Drive.
2. No [Supabase SQL Editor](https://supabase.com/dashboard), execute **`supabase/schema.sql`** (apaga `household*` legado e cria `families`, `transactions`, etc.).
3. Crie o bucket Storage **`ascen-snapshots`** (privado).
4. Instale dependências e rode:

```bash
npm install
npm run start
# Android com cabo USB:
npm run android
```

## Família (obrigatório)

Todo usuário pertence a uma **família**. No primeiro login uma família é criada automaticamente com um **código de 8 caracteres**.

- Titular: Perfil → **Família** → ver código e compartilhar.
- Segundo membro: criar conta → Perfil → **Entrar na família** com o código.

Lançamentos sincronizam pela nuvem (não é necessário restaurar backup manualmente para o dia a dia).

## Sincronização

1. CRUD grava no SQLite e enfileira em `sync_outbox`.
2. Background envia para Supabase (`upsert` / soft delete).
3. Pull traz alterações com `updated_at` (conflito: última atualização vence).

Barra no topo da Home indica pendências ou falta de rede.

## Estrutura

```
src/
  db/           # SQLite
  services/     # family, sync, backup, export
  context/      # React providers
  store/        # Zustand (sync)
  utils/        # agregações financeiras, contas a vencer
  screens/
supabase/
  schema.sql    # rodar no Supabase
```

## Build Android (Play Store)

1. Ajuste `app.json`: `android.package` (ex. `com.seudominio.ascen`), ícones, `versionCode`.
2. Configure EAS ou build local: `npx expo prebuild` + Android Studio.
3. Checklist: política de privacidade, screenshots, assinatura de release (keystore).

Ver `docs/RELEASE.md` para checklist detalhado.

## Backup opcional

Além do sync, há **backup cifrado** (Supabase Storage / Google Drive) em Perfil → Backup. Export **JSON** em Perfil → Exportar JSON.
