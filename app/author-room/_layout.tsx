import { Stack } from 'expo-router';

export default function AuthorRoomLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '작가룸', headerBackTitle: '뒤로' }} />
      <Stack.Screen name="[comicId]" options={{ title: '작품 관리', headerBackTitle: '작가룸' }} />
    </Stack>
  );
}
