import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { comicsApi, episodesApi, toImageUrl } from '@/lib/api';
import { Comic, Percomic } from '@/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ComicDetailScreen() {
  const { comicId } = useLocalSearchParams<{ comicId: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [comic, setComic] = useState<Comic | null>(null);
  const [episodes, setEpisodes] = useState<Percomic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const id = Number(comicId);
      const [comicData, episodeData] = await Promise.all([
        comicsApi.getById(id),
        episodesApi.getAll(id),
      ]);
      setComic(comicData);
      setEpisodes(episodeData);
      navigation.setOptions({ title: comicData.title });
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [comicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !comic) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || '불러오기 실패'}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View style={styles.header}>
      <Image
        source={{ uri: toImageUrl(comic.thumbnail) }}
        style={styles.headerThumbnail}
        contentFit="cover"
      />
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>{comic.title}</Text>
        <Text style={styles.headerDesc} numberOfLines={4}>
          {comic.description}
        </Text>
      </View>
      <View style={styles.divider} />
      <Text style={styles.episodeListLabel}>회차 목록</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={[...episodes].sort((a, b) => b.episodeNumber - a.episodeNumber)}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.episodeCard}
            android_ripple={{ color: '#e0e0e0' }}
            onPress={() =>
              router.push({
                pathname: '/comic/viewer',
                params: { comicId, episodeId: String(item.id) },
              } as any)
            }
          >
            <Image
              source={{ uri: toImageUrl(item.thumbnail) }}
              style={styles.episodeThumbnail}
              contentFit="cover"
            />
            <View style={styles.episodeInfo}>
              <Text style={styles.episodeNumber}>{item.episodeNumber}화</Text>
              <Text style={styles.episodeTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.episodeDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 등록된 회차가 없습니다.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: '#fff',
  },
  headerThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E0E0E0',
  },
  headerInfo: {
    padding: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  headerDesc: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
  divider: {
    height: 8,
    backgroundColor: '#F0F0F0',
  },
  episodeListLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  episodeThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  episodeInfo: {
    flex: 1,
    gap: 4,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  episodeDate: {
    fontSize: 12,
    color: '#687076',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#687076',
    fontSize: 15,
  },
});
