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

const NUM_COLUMNS = 2;
const CARD_GAP = 12;

export default function AuthorRoomScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [myComics, setMyComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(false);
  const [formModal, setFormModal] = useState<ComicFormModal>(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadMyComics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = await comicsApi.getAll();
      setMyComics(all.filter((c) => c.authorId === user.id));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyComics();
  }, [loadMyComics]);

  const openCreate = () =>
    setFormModal({ visible: true, mode: 'create', comic: { title: '', description: '', thumbnail: '' } });

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

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>{myComics.length}개의 작품</Text>
        <Pressable style={styles.createButton} onPress={openCreate}>
          <Text style={styles.createButtonText}>+ 새 작품</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0a7ea4" />
      ) : myComics.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>등록한 작품이 없습니다.</Text>
          <Pressable style={styles.createButton} onPress={openCreate}>
            <Text style={styles.createButtonText}>첫 작품 등록하기</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={myComics}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: CARD_GAP }}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/author-room/${item.id}` as any)}>
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                contentFit="cover"
              />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />
      )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerSub: { fontSize: 14, color: '#687076' },
  createButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  grid: { padding: 16 },
  card: {
    flex: 1,
    maxWidth: `${(100 - (CARD_GAP / 4))}%`,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#11181C',
    textAlign: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: '#687076', fontSize: 15 },

  // 모달
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
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 24 },
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
