import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function Index() {
  const { token } = useAuth();
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
