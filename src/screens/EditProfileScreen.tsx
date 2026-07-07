import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useUserLocal } from '../context/UserLocalDataContext';
import { useSession } from '../context/SessionContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';
import { saveAvatarFromPickerUri, removeLocalAvatar } from '../services/localAvatar';
import { sanitizeName } from '../utils/inputSanitizer';
import { logError } from '../services/sentry';

function isLegacyRemoteAvatar(url?: string): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

export function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { localAvatarUri, refreshLocalAvatar } = useUserLocal();
  const { C, s } = useAppTheme();
  const { touch } = useSession();
  const navigation = useNavigation<any>();
  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const initialName = (meta?.full_name as string) || '';
  const legacyRemote = isLegacyRemoteAvatar(meta?.avatar_url);

  const [name, setName] = useState(initialName);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  const displayUri = localPhotoUri || localAvatarUri || (legacyRemote ? meta?.avatar_url : undefined);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Precisamos de acesso às fotos para alterar a imagem de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const sanitized = sanitizeName(name);
    if (!sanitized) {
      Alert.alert('Nome', 'Informe um nome para exibição.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      if (localPhotoUri) {
        await saveAvatarFromPickerUri(user.id, localPhotoUri);
        await updateProfile({ fullName: sanitized, avatarUrl: '' });
        await refreshLocalAvatar();
        setLocalPhotoUri(null);
      } else {
        await updateProfile({ fullName: sanitized });
      }
      Alert.alert('Perfil atualizado', 'Suas alterações foram salvas no aparelho.');
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to save profile');
      logError(error, { context: 'handleSaveProfile' });
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    if (!user?.id) return;
    Alert.alert('Remover foto', 'A foto deixará de aparecer neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeLocalAvatar(user.id);
            await updateProfile({ fullName: sanitizeName(name), avatarUrl: '' });
            await refreshLocalAvatar();
            setLocalPhotoUri(null);
          } catch (e) {
            const error = e instanceof Error ? e : new Error('Failed to remove photo');
            logError(error, { context: 'handleRemovePhoto' });
            Alert.alert('Erro', 'Não foi possível remover. Tente novamente.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[s.pageSubtitle, { marginBottom: 16 }]}>
          Nome fica na sua conta; a foto fica só neste aparelho e entra no backup cifrado.
        </Text>

        <Card style={{ marginBottom: 16, alignItems: 'center' }}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Alterar foto de perfil">
            <View style={[s.profileAvatar, { width: 112, height: 112, borderRadius: 56 }]}>
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={{ width: 112, height: 112, borderRadius: 56 }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 48 }}>👤</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={{ marginTop: 10 }} accessibilityRole="button">
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 15 }}>Escolher foto da galeria</Text>
          </TouchableOpacity>
          {(localAvatarUri || localPhotoUri || legacyRemote) && (
            <TouchableOpacity onPress={handleRemovePhoto} style={{ marginTop: 8 }} accessibilityRole="button">
              <Text style={{ color: C.danger, fontWeight: '600', fontSize: 14 }}>Remover foto</Text>
            </TouchableOpacity>
          )}
        </Card>

        <View style={s.formGroup}>
          <Text style={s.formLabel}>NOME PARA EXIBIÇÃO</Text>
          <TextInput
            style={s.textInput}
            value={name}
            onChangeText={(text) => {
              setName(text);
              touch();
            }}
            placeholder="Seu nome"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
            accessibilityLabel="Nome para exibição"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[s.modalBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Salvar perfil"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Salvar alterações</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
