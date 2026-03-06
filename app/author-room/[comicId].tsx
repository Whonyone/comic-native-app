import { comicsApi, episodesApi } from '@/lib/api';
import { Comic, Percomic } from '@/types';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation } from 'expo-router';
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

// ── 에피소드 폼 모달 ──────────────────────────────────────
interface EpisodeFormModal {
  visible: boolean;
  mode: 'create' | 'edit';
  episode: Partial<Percomic>;
}

const EMPTY_EP_FORM: EpisodeFormModal = {
  visible: false,
  mode: 'create',
  episode: { title: '', thumbnail: '', episodeNumber: undefined, images: [] },
};

function EpisodeFormSheet({
  modal,
  onClose,
  onSubmit,
  loading,
  nextEpisodeNumber,
}: {
  modal: EpisodeFormModal;
  onClose: () => void;
  onSubmit: (data: { title: string; thumbnail: string; episodeNumber: number; images: { url: string; order: number }[] }) => void;
  loading: boolean;
  nextEpisodeNumber: number;
}) {
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [imageUrls, setImageUrls] = useState('');

  useEffect(() => {
    if (modal.visible) {
      setTitle(modal.episode.title ?? '');
      setThumbnail(modal.episode.thumbnail ?? '');
      setEpisodeNumber(
        modal.episode.episodeNumber != null
          ? String(modal.episode.episodeNumber)
          : String(nextEpisodeNumber)
      );
      setImageUrls(
        modal.episode.images?.map((img) => img.url).join('\n') ?? ''
      );
    }
  }, [modal.visible, modal.episode, nextEpisodeNumber]);

  const handleSubmit = () => {
    const epNum = Number(episodeNumber);
    if (!title.trim() || !thumbnail.trim() || !epNum) {
      Alert.alert('입력 오류', '제목, 썸네일, 회차 번호를 입력해주세요.');
      return;
    }
    const images = imageUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url, idx) => ({ url, order: idx + 1 }));
    onSubmit({ title: title.trim(), thumbnail: thumbnail.trim(), episodeNumber: epNum, images });
  };

  return (
    <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {modal.mode === 'create' ? '회차 추가' : '회차 수정'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>회차 번호</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 1"
              placeholderTextColor="#9BA1A6"
              value={episodeNumber}
              onChangeText={setEpisodeNumber}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>회차 제목</Text>
            <TextInput
              style={styles.input}
              placeholder="1화 제목"
              placeholderTextColor="#9BA1A6"
              value={title}
              onChangeText={setTitle}
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
            <Text style={styles.label}>이미지 URL (한 줄에 하나씩)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={'https://image1.jpg\nhttps://image2.jpg'}
              placeholderTextColor="#9BA1A6"
              value={imageUrls}
              onChangeText={setImageUrls}
              multiline
              numberOfLines={5}
              autoCapitalize="none"
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
                  {modal.mode === 'create' ? '추가' : '저장'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────
export default function ComicDetailScreen() {
  const { comicId } = useLocalSearchParams<{ comicId: string }>();
  const navigation = useNavigation();
  const id = Number(comicId);

  const [comic, setComic] = useState<Comic | null>(null);
  const [episodes, setEpisodes] = useState<Percomic[]>([]);
  const [loading, setLoading] = useState(false);
  const [epModal, setEpModal] = useState<EpisodeFormModal>(EMPTY_EP_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, eps] = await Promise.all([
        comicsApi.getById(id),
        episodesApi.getAll(id),
      ]);
      setComic(c);
      setEpisodes(eps);
      navigation.setOptions({ title: c.title });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () =>
    setEpModal({ visible: true, mode: 'create', episode: {} });

  const openEdit = (ep: Percomic) =>
    setEpModal({ visible: true, mode: 'edit', episode: ep });

  const closeModal = () => setEpModal(EMPTY_EP_FORM);

  const handleSubmit = async (data: {
    title: string;
    thumbnail: string;
    episodeNumber: number;
    images: { url: string; order: number }[];
  }) => {
    setSubmitLoading(true);
    try {
      if (epModal.mode === 'create') {
        await episodesApi.create(id, data);
      } else if (epModal.episode.id != null) {
        await episodesApi.update(id, epModal.episode.id, data);
      }
      closeModal();
      await load();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (ep: Percomic) => {
    Alert.alert('회차 삭제', `"${ep.title}"을(를) 삭제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await episodesApi.delete(id, ep.id);
            await load();
          } catch (e: any) {
            Alert.alert('오류', e.message);
          }
        },
      },
    ]);
  };

  const nextEpisodeNumber = episodes.length > 0
    ? Math.max(...episodes.map((e) => e.episodeNumber)) + 1
    : 1;

  if (loading && !comic) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0a7ea4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 작품 헤더 */}
      {comic && (
        <View style={styles.comicHeader}>
          <Image source={{ uri: comic.thumbnail }} style={styles.comicThumb} contentFit="cover" />
          <View style={styles.comicInfo}>
            <Text style={styles.comicTitle}>{comic.title}</Text>
            <Text style={styles.comicDesc} numberOfLines={3}>{comic.description}</Text>
            <Text style={styles.episodeCount}>{episodes.length}화</Text>
          </View>
        </View>
      )}

      {/* 회차 목록 */}
      <View style={styles.episodeHeader}>
        <Text style={styles.episodeHeaderTitle}>회차 목록</Text>
        <Pressable style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>+ 회차 추가</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#0a7ea4" />
      ) : episodes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>등록된 회차가 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.episodeItem}>
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.epThumb}
                contentFit="cover"
              />
              <View style={styles.epInfo}>
                <Text style={styles.epNumber}>{item.episodeNumber}화</Text>
                <Text style={styles.epTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.epDate}>
                  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                </Text>
              </View>
              <View style={styles.epActions}>
                <Pressable style={styles.editButton} onPress={() => openEdit(item)}>
                  <Text style={styles.editButtonText}>수정</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <EpisodeFormSheet
        modal={epModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={submitLoading}
        nextEpisodeNumber={nextEpisodeNumber}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  comicHeader: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  comicThumb: {
    width: 80,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  comicInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  comicTitle: { fontSize: 17, fontWeight: '700', color: '#11181C' },
  comicDesc: { fontSize: 13, color: '#687076', lineHeight: 18 },
  episodeCount: { fontSize: 13, fontWeight: '600', color: '#0a7ea4', marginTop: 4 },

  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  episodeHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  addButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  epThumb: {
    width: 56,
    height: 76,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  epInfo: { flex: 1 },
  epNumber: { fontSize: 12, fontWeight: '700', color: '#0a7ea4', marginBottom: 2 },
  epTitle: { fontSize: 14, fontWeight: '600', color: '#11181C', marginBottom: 4 },
  epDate: { fontSize: 12, color: '#9BA1A6' },
  epActions: { gap: 6 },
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

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#687076', fontSize: 14 },

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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
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
