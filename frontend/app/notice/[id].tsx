/**
 * 공지 상세 화면 — Task 3에서 구현 예정
 * 동적 라우팅: notice/[id]
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>
      <View style={styles.placeholder}>
        <Text style={styles.text}>공지 상세 화면 — Task 3에서 구현 예정</Text>
        <Text style={styles.subText}>공지 ID: {id}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  back: {
    padding: 16,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  subText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
