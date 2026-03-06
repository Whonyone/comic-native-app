import { Stack } from 'expo-router';

export default function ComicLayout() {
  return (
    <Stack>
      <Stack.Screen name="[comicId]" options={{ headerShown: true }} />
    </Stack>
  );
}
