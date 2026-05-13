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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';
import { uploadAvatarFromUri } from '../services/avatarUpload';

export function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { C, s } = useAppTheme();
  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const initialName = (meta?.full_name as string) || '';
  const initialAvatar = meta?.avatar_url as string | undefined;

  const [name, setName] = useState(initialName);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayUri = localPhotoUri || initialAvatar;

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
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome', 'Informe um nome para exibição.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      let avatarUrl: string | undefined = initialAvatar;
      if (localPhotoUri) {
        try {
          avatarUrl = await uploadAvatarFromUri(user.id, localPhotoUri);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Erro ao enviar foto';
          Alert.alert(
            'Foto de perfil',
            `${msg}\n\nConfirme se o bucket de armazenamento "avatars" existe no projeto Supabase e se as políticas permitem upload para usuários autenticados.`,
            [{ text: 'OK' }]
          );
          setSaving(false);
          return;
        }
      }
      await updateProfile({ fullName: trimmed, avatarUrl });
      setLocalPhotoUri(null);
      Alert.alert('Perfil atualizado', 'Suas alterações foram salvas.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[s.pageSubtitle, { marginBottom: 16 }]}>Nome e foto usados no app.</Text>

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
        </Card>

        <View style={s.formGroup}>
          <Text style={s.formLabel}>NOME PARA EXIBIÇÃO</Text>
          <TextInput
            style={s.textInput}
            value={name}
            onChangeText={setName}
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
