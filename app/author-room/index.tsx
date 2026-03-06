import { useAuth } from '@/context/auth';
import { comicsApi, toImageUrl } from '@/lib/api';
import { Comic } from '@/types';
import * as ImagePicker from 'expo-image-picker';
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

interface ComicFormState {
  visible: boolean;
  mode: 'create' | 'edit';
  comic: Partial<Comic>;
}

const EMPTY_FORM: ComicFormState = {
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
  modal: ComicFormState;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    if (modal.visible) {
      setTitle(modal.comic.title ?? '');
      setDescription(modal.comic.description ?? '');
      setThumbnailUri(null);
    }
  }, [modal.visible, modal.comic]);

  const pickThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled) {
      setThumbnailUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('입력 오류', '제목과 설명을 입력해주세요.');
      return;
    }
    if (modal.mode === 'create' && !thumbnailUri) {
      Alert.alert('입력 오류', '썸네일 이미지를 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    if (thumbnailUri) {
      const filename = thumbnailUri.split('/').pop() ?? 'thumbnail.jpg';
      const ext = filename.split('.').pop() ?? 'jpg';
      formData.append('thumbnail', {
        uri: thumbnailUri,
        name: `thumbnail.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);
    }
    onSubmit(formData);
  };

  const currentThumbnail = thumbnailUri ?? (modal.comic.thumbnail ? toImageUrl(modal.comic.thumbnail) : null);

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
            <Text style={styles.label}>썸네일</Text>
            <Pressable style={styles.imagePicker} onPress={pickThumbnail}>
              {currentThumbnail ? (
                <Image
                  source={{ uri: currentThumbnail }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.imagePickerText}>+ 이미지 선택</Text>
              )}
            </Pressable>
            {currentThumbnail && (
              <Pressable onPress={pickThumbnail}>
                <Text style={styles.changeImageText}>이미지 변경</Text>
              </Pressable>
            )}
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
  const [formModal, setFormModal] = useState<ComicFormState>(EMPTY_FORM);
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
    setFormModal({ visible: true, mode: 'create', comic: { title: '', description: '' } });

  const closeModal = () => setFormModal(EMPTY_FORM);

  const handleDelete = (comic: Comic) => {
    Alert.alert(
      '작품 삭제',
      `"${comic.title}"을(를) 정말로 삭제하시겠습니까?\n관련 회차와 이미지가 모두 삭제됩니다.`,
      [
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
      ]
    );
  };

  const handleSubmit = async (formData: FormData) => {
    if (!user) return;
    setSubmitLoading(true);
    try {
      if (formModal.mode === 'create') {
        formData.append('authorId', String(user.id));
        await comicsApi.create(formData);
      } else if (formModal.comic.id != null) {
        await comicsApi.update(formModal.comic.id, formData);
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
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/author-room/${item.id}` as any)}>
                <Image
                  source={{ uri: toImageUrl(item.thumbnail) }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
              <Pressable style={styles.cardDeleteButton} onPress={() => handleDelete(item)}>
                <Text style={styles.cardDeleteText}>삭제</Text>
              </Pressable>
            </View>
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
    aspectRatio: 1,
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
  cardDeleteButton: {
    marginTop: 6,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  cardDeleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E53E3E',
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
  imagePicker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 15, color: '#9BA1A6' },
  changeImageText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
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
