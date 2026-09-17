import { useRouter } from 'expo-router';

import { LanguagePickerScreen } from '@/components/language-picker-screen';

export default function LanguagePickerRoute() {
  const router = useRouter();
  return <LanguagePickerScreen onSelected={() => router.back()} />;
}
