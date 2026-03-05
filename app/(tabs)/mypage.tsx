import { useAuth } from '@/context/auth';
import { comicsApi } from '@/lib/api';
import { Comic } from '@/types';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── 작품 폼 모달 ──────────────────────────────────────────
interface ComicFormModal {
  visible: boolean;
  mode: 'create' | 'edit';
  comic: Partial<Comic>;
}

const EMPTY_FORM: ComicFormModal = {
  visible: false,
  mode: 'create',
  comic: { title: '', description: '', thumbnail: '' },
};

function ComicFormSheet({
  modal,
  onClose,
  onSubmit,
  loading,
}: {
  modal: ComicFormModal;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; thumbnail: string }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(modal.comic.title ?? '');
  const [description, setDescription] = useState(modal.comic.description ?? '');
  const [thumbnail, setThumbnail] = useState(modal.comic.thumbnail ?? '');

  useEffect(() => {
    setTitle(modal.comic.title ?? '');
    setDescription(modal.comic.description ?? '');
    setThumbnail(modal.comic.thumbnail ?? '');
  }, [modal.comic]);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !thumbnail.trim()) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    onSubmit({ title: title.trim(), description: description.trim(), thumbnail: thumbnail.trim() });
  };

  return (
    <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {modal.mode === 'create' ? '새 작품 등록' : '작품 수정'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.input}
              placeholder="작품 제목"
              placeholderTextColor="#9BA1A6"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="작품 설명"
              placeholderTextColor="#9BA1A6"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>썸네일 URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#9BA1A6"
              value={thumbnail}
              onChangeText={setThumbnail}
              autoCapitalize="none"
              keyboardType="url"
            />
          </ScrollView>

          <View style={styles.sheetButtons}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {modal.mode === 'create' ? '등록' : '저장'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 마이페이지 메인 ───────────────────────────────────────
export default function MyPageScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [myComics, setMyComics] = useState<Comic[]>([]);
  const [comicsLoading, setComicsLoading] = useState(false);
  const [formModal, setFormModal] = useState<ComicFormModal>(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);

  const isAuthor = user?.role === 'author';

  const loadMyComics = useCallback(async () => {
    if (!user || !isAuthor) return;
    setComicsLoading(true);
    try {
      const all = await comicsApi.getAll();
      setMyComics(all.filter((c) => c.authorId === user.id));
    } catch {
      // silent
    } finally {
      setComicsLoading(false);
    }
  }, [user, isAuthor]);

  useEffect(() => {
    loadMyComics();
  }, [loadMyComics]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const openCreate = () =>
    setFormModal({ visible: true, mode: 'create', comic: { title: '', description: '', thumbnail: '' } });

  const openEdit = (comic: Comic) =>
    setFormModal({ visible: true, mode: 'edit', comic });

  const closeModal = () => setFormModal(EMPTY_FORM);

  const handleSubmit = async (data: { title: string; description: string; thumbnail: string }) => {
    if (!user) return;
    setSubmitLoading(true);
    try {
      if (formModal.mode === 'create') {
        await comicsApi.create({ authorId: user.id, ...data });
      } else if (formModal.comic.id != null) {
        await comicsApi.update(formModal.comic.id, data);
      }
      closeModal();
      await loadMyComics();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (comic: Comic) => {
    Alert.alert('작품 삭제', `"${comic.title}"을(를) 삭제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await comicsApi.delete(comic.id);
            await loadMyComics();
          } catch (e: any) {
            Alert.alert('오류', e.message);
          }
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 유저 정보 */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.nickname.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.email}>{user.email}</Text>
            {isAuthor && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>작가</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        {/* 작가룸 */}
        {isAuthor && (
          <View style={styles.authorRoom}>
            <View style={styles.authorRoomHeader}>
              <Text style={styles.authorRoomTitle}>작가룸</Text>
              <Pressable style={styles.createButton} onPress={openCreate}>
                <Text style={styles.createButtonText}>+ 새 작품</Text>
              </Pressable>
            </View>

            {comicsLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color="#0a7ea4" />
            ) : myComics.length === 0 ? (
              <View style={styles.emptyAuthor}>
                <Text style={styles.emptyAuthorText}>등록한 작품이 없습니다.</Text>
              </View>
            ) : (
              <FlatList
                data={myComics}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.authorComicItem}>
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.authorThumbnail}
                      contentFit="cover"
                    />
                    <View style={styles.authorComicInfo}>
                      <Text style={styles.authorComicTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.authorComicDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <View style={styles.authorComicActions}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => openEdit(item)}>
                        <Text style={styles.editButtonText}>수정</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteButtonText}>삭제</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}
      </ScrollView>

      <ComicFormSheet
        modal={formModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={submitLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 40 },

  // 프로필
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1, gap: 4 },
  nickname: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  email: { fontSize: 14, color: '#687076' },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF8FF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: '#0a7ea4' },

  // 로그아웃
  logoutButton: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#E53E3E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#E53E3E', fontSize: 15, fontWeight: '600' },

  // 작가룸
  authorRoom: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  authorRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  authorRoomTitle: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  createButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  createButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // 작품 아이템
  authorComicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorThumbnail: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  authorComicInfo: { flex: 1 },
  authorComicTitle: { fontSize: 14, fontWeight: '600', color: '#11181C', marginBottom: 4 },
  authorComicDesc: { fontSize: 12, color: '#687076' },
  authorComicActions: { gap: 6 },
  editButton: {
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: { color: '#E53E3E', fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  emptyAuthor: { alignItems: 'center', paddingVertical: 32 },
  emptyAuthorText: { color: '#687076', fontSize: 14 },

  // 폼 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#11181C', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#687076', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#F9F9F9',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  sheetButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#687076' },
  submitButton: {
    flex: 2,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
