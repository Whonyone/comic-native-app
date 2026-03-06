import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── 마이페이지 메인 ───────────────────────────────────────
export default function MyPageScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const isAuthor = user?.role === 'author';

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

        {/* 작가룸 진입 버튼 */}
        {isAuthor && (
          <Pressable
            style={styles.authorRoomButton}
            onPress={() => router.push('/author-room' as any)}>
            <Text style={styles.authorRoomButtonText}>작가룸 들어가기</Text>
          </Pressable>
        )}
      </ScrollView>
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

  // 작가룸 버튼
  authorRoomButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  authorRoomButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
