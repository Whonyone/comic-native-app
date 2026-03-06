import { comicsApi, episodesApi, toImageUrl } from '@/lib/api';
import { Comic, Percomic } from '@/types';
import * as ImagePicker from 'expo-image-picker';
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
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';

// ── 타입 ──────────────────────────────────────────────────
interface ImageItem {
  id: string;
  uri: string;        // 표시용 URI (로컬 file:// 또는 서버 http://)
  isNew: boolean;     // true: 새로 선택한 파일 / false: 서버에 이미 있는 파일
  serverPath?: string; // DB 저장 경로 (isNew: false 일 때)
}

interface EpisodeFormState {
  visible: boolean;
  mode: 'create' | 'edit';
  episode: Partial<Percomic>;
}

const EMPTY_EP_FORM: EpisodeFormState = {
  visible: false,
  mode: 'create',
  episode: { title: '', episodeNumber: undefined, images: [] },
};

// ── 에피소드 폼 모달 ──────────────────────────────────────
function EpisodeFormSheet({
  modal,
  onClose,
  onSubmit,
  loading,
  nextEpisodeNumber,
}: {
  modal: EpisodeFormState;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  loading: boolean;
  nextEpisodeNumber: number;
}) {
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (!modal.visible) return;
    setTitle(modal.episode.title ?? '');
    setEpisodeNumber(
      modal.episode.episodeNumber != null
        ? String(modal.episode.episodeNumber)
        : String(nextEpisodeNumber)
    );
    setThumbnailUri(null);

    if (modal.mode === 'edit' && modal.episode.images?.length) {
      // 기존 이미지 로드 (서버 경로 보존)
      const items = modal.episode.images.map((img, idx) => ({
        id: `existing_${idx}_${img.url}`,
        uri: toImageUrl(img.url),
        isNew: false,
        serverPath: img.url,
      }));
      setImages(items);
      setLoadedCount(0);
    } else {
      setImages([]);
      setLoadedCount(0);
    }
  }, [modal.visible, modal.episode, nextEpisodeNumber]);

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
    if (!result.canceled) setThumbnailUri(result.assets[0].uri);
  };

  // 이미지 전체 교체 (갤러리에서 새로 선택)
  const replaceAllImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
      allowsMultipleSelection: true,
      orderedSelection: true,
    });
    if (!result.canceled) {
      setImages(
        result.assets.map((asset, idx) => ({
          id: `new_${idx}_${asset.uri}`,
          uri: asset.uri,
          isNew: true,
        }))
      );
    }
  };

  const removeImage = (id: string) =>
    setImages((prev) => prev.filter((item) => item.id !== id));

  const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<ImageItem>) => {
    const orderNum = images.findIndex((img) => img.id === item.id) + 1;
    return (
      <ScaleDecorator>
        <View style={[styles.imageThumbWrap, isActive && styles.imageThumbActive]}>
          <TouchableOpacity onLongPress={drag} delayLongPress={200} activeOpacity={0.9}>
            <Image
              source={{ uri: item.uri }}
              style={styles.imageThumb}
              contentFit="cover"
              onLoad={() => setLoadedCount((c) => c + 1)}
            />
            <View style={styles.dragHint} pointerEvents="none">
              <Text style={styles.dragHintText}>≡</Text>
            </View>
          </TouchableOpacity>
          {/* 드래그 중인 아이템은 번호 숨김 (혼란 방지) */}
          {!isActive && (
            <View style={styles.orderBadge} pointerEvents="none">
              <Text style={styles.orderBadgeText}>{orderNum}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(item.id)}>
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  const handleSubmit = () => {
    const epNum = Number(episodeNumber);
    if (!title.trim() || !epNum) {
      Alert.alert('입력 오류', '제목과 회차 번호를 입력해주세요.');
      return;
    }
    if (modal.mode === 'create' && (!thumbnailUri || images.length === 0)) {
      Alert.alert('입력 오류', '썸네일과 이미지를 1개 이상 선택해주세요.');
      return;
    }
    if (modal.mode === 'edit' && images.length === 0) {
      Alert.alert('입력 오류', '이미지가 1개 이상 있어야 합니다.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('episodeNumber', String(epNum));

    if (thumbnailUri) {
      const filename = thumbnailUri.split('/').pop() ?? 'thumbnail.jpg';
      const ext = filename.split('.').pop() ?? 'jpg';
      formData.append('thumbnail', {
        uri: thumbnailUri,
        name: `thumbnail.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);
    }

    const hasNewImages = images.some((img) => img.isNew);
    if (hasNewImages) {
      // 새 파일 전송 (전체 교체)
      images.forEach((img, idx) => {
        const filename = img.uri.split('/').pop() ?? `image_${idx}.jpg`;
        const ext = filename.split('.').pop() ?? 'jpg';
        formData.append('images', {
          uri: img.uri,
          name: `image_${String(idx + 1).padStart(3, '0')}.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        } as any);
      });
    } else {
      // 기존 이미지 경로만 전송 (순서/삭제 반영)
      const paths = images.map((img) => img.serverPath!);
      formData.append('existingImagePaths', JSON.stringify(paths));
    }

    onSubmit(formData);
  };

  const existingThumbnail = modal.episode.thumbnail
    ? toImageUrl(modal.episode.thumbnail)
    : null;

  return (
    <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Modal 안에 GestureHandlerRootView 필수 (Modal은 별도 RN 트리) */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {modal.mode === 'create' ? '회차 추가' : '회차 수정'}
            </Text>

            {/* 텍스트 입력 + 썸네일만 ScrollView에 */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}>
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

              {/* 썸네일 */}
              <Text style={styles.label}>
                썸네일{modal.mode === 'edit' && !thumbnailUri ? ' (변경 안 하면 유지)' : ''}
              </Text>
              <Pressable style={styles.imagePicker} onPress={pickThumbnail}>
                {thumbnailUri ? (
                  <Image source={{ uri: thumbnailUri }} style={styles.imagePreview} contentFit="cover" />
                ) : existingThumbnail ? (
                  <Image source={{ uri: existingThumbnail }} style={styles.imagePreview} contentFit="cover" />
                ) : (
                  <Text style={styles.imagePickerText}>+ 썸네일 선택</Text>
                )}
              </Pressable>
              {(thumbnailUri || existingThumbnail) && (
                <Pressable onPress={pickThumbnail}>
                  <Text style={styles.changeImageText}>썸네일 변경</Text>
                </Pressable>
              )}
            </ScrollView>

            {/* 이미지 섹션: ScrollView 밖 (DraggableFlatList 제스처 충돌 방지) */}
            <View style={styles.imageSectionHeader}>
              <Text style={styles.imageSectionTitle}>
                회차 이미지 {images.length > 0 ? `(${images.length}장)` : ''}
              </Text>
              <Pressable onPress={replaceAllImages}>
                <Text style={styles.replaceAllText}>
                  {images.length > 0 ? '전체 교체' : '+ 이미지 선택'}
                </Text>
              </Pressable>
            </View>

            {images.length > 0 ? (
              <>
                <Text style={styles.dragHintLabel}>꾹 눌러서 드래그하면 순서를 바꿀 수 있어요</Text>
                <DraggableFlatList
                  data={images}
                  extraData={images}
                  horizontal
                  keyExtractor={(item) => item.id}
                  onDragEnd={({ data }) => setImages(data)}
                  renderItem={renderDraggableItem}
                  contentContainerStyle={styles.imageList}
                  showsHorizontalScrollIndicator={false}
                  activationDistance={5}
                />
                {loadedCount < images.length && (
                  <View style={styles.imageLoadingBar}>
                    <ActivityIndicator size="small" color="#0a7ea4" />
                    <Text style={styles.imageLoadingText}>
                      이미지 로딩중입니다 ({loadedCount}/{images.length})
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable style={styles.addImagesButton} onPress={replaceAllImages}>
                <Text style={styles.addImagesButtonText}>
                  {modal.mode === 'edit' ? '이미지를 선택해주세요' : '+ 이미지 선택 (여러 장 가능)'}
                </Text>
              </Pressable>
            )}

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
      </GestureHandlerRootView>
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
  const [epModal, setEpModal] = useState<EpisodeFormState>(EMPTY_EP_FORM);
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

  const handleSubmit = async (formData: FormData) => {
    setSubmitLoading(true);
    try {
      if (epModal.mode === 'create') {
        await episodesApi.create(id, formData);
      } else if (epModal.episode.id != null) {
        await episodesApi.update(id, epModal.episode.id, formData);
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
      {comic && (
        <View style={styles.comicHeader}>
          <Image
            source={{ uri: toImageUrl(comic.thumbnail) }}
            style={styles.comicThumb}
            contentFit="cover"
          />
          <View style={styles.comicInfo}>
            <Text style={styles.comicTitle}>{comic.title}</Text>
            <Text style={styles.comicDesc} numberOfLines={3}>{comic.description}</Text>
            <Text style={styles.episodeCount}>{episodes.length}화</Text>
          </View>
        </View>
      )}

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
                source={{ uri: toImageUrl(item.thumbnail) }}
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
    maxHeight: '92%',
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
  imagePicker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    height: 140,
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

  // 이미지 섹션
  imageSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 2,
  },
  imageSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#687076',
  },
  replaceAllText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
    marginTop: 12,
  },
  dragHintLabel: {
    fontSize: 12,
    color: '#9BA1A6',
    marginBottom: 8,
  },
  imageList: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  imageThumbWrap: {
    marginRight: 10,
    position: 'relative',
    borderRadius: 8,
    overflow: 'visible',
  },
  imageThumbActive: {
    opacity: 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  imageThumb: {
    width: 80,
    height: 108,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  dragHint: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dragHintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  orderBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(10,126,164,0.85)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  orderBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  imageLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  imageLoadingText: {
    fontSize: 12,
    color: '#687076',
  },
  addImagesButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    marginTop: 4,
  },
  addImagesButtonText: { fontSize: 14, color: '#687076' },

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
