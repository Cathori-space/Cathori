import { useRouter } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/src/constants/colors';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useMembershipPromptStore } from '@/src/store/useMembershipPromptStore';

export function MembershipPrompt() {
  const router = useRouter();
  const visible = useMembershipPromptStore((s) => s.visible);
  const close = useMembershipPromptStore((s) => s.close);
  const status = useAuthStore((s) => s.status);
  const navigate = (path: '/login' | '/register') => {
    close();
    router.push(path);
  };
  return (
    <Modal visible={visible && status === 'guest'} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>회원 전용 기능이에요</Text>
          <Text style={styles.message}>로그인하거나 회원가입하면 북마크와 맞춤 알림을 이용할 수 있어요.</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigate('/register')} accessibilityRole="button">
            <Text style={styles.buttonText}>회원가입</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => navigate('/login')} accessibilityRole="button">
            <Text style={styles.buttonText}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={close} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.message}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.45)' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 16, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center', color: Colors.textSecondary },
  button: { width: '100%', padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
