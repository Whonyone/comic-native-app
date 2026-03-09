import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { episodesApi, toImageUrl } from '@/lib/api';
import { Percomic } from '@/types';

export default function ViewerScreen() {
  const { comicId, episodeId } = useLocalSearchParams<{ comicId: string; episodeId: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [episode, setEpisode] = useState<Percomic | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Percomic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cid = Number(comicId);
      const eid = Number(episodeId);
      const [ep, all] = await Promise.all([
        episodesApi.getById(cid, eid),
        episodesApi.getAll(cid),
      ]);
      setEpisode(ep);
      setAllEpisodes(all.sort((a, b) => a.episodeNumber - b.episodeNumber));
      navigation.setOptions({ title: ep.title });
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [comicId, episodeId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentIndex = allEpisodes.findIndex((e) => e.id === Number(episodeId));
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const navigateTo = (ep: Percomic) => {
    router.replace({
      pathname: '/comic/viewer',
      params: { comicId, episodeId: String(ep.id) },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !episode) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || '불러오기 실패'}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {episode.images.map((img) => (
          <Image
            key={img.url}
            source={{ uri: toImageUrl(img.url) }}
            style={styles.comicImage}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable
          style={[styles.navButton, !prevEpisode && styles.navButtonDisabled]}
          onPress={() => prevEpisode && navigateTo(prevEpisode)}
          disabled={!prevEpisode}
        >
          <Text style={[styles.navButtonText, !prevEpisode && styles.navButtonTextDisabled]}>
            ← 이전 회차
          </Text>
        </Pressable>

        <Text style={styles.episodeIndicator}>{episode.episodeNumber}화</Text>

        <Pressable
          style={[styles.navButton, !nextEpisode && styles.navButtonDisabled]}
          onPress={() => nextEpisode && navigateTo(nextEpisode)}
          disabled={!nextEpisode}
        >
          <Text style={[styles.navButtonText, !nextEpisode && styles.navButtonTextDisabled]}>
            다음 회차 →
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 0,
  },
  comicImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#333',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  episodeIndicator: {
    color: '#aaa',
    fontSize: 13,
  },
});
