import { Feather } from '@expo/vector-icons';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/src/constants/colors';

interface AndroidReviewPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  onReviewPress: () => void;
}

export function AndroidReviewPromptModal({
  visible,
  onDismiss,
  onReviewPress,
}: AndroidReviewPromptModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          accessibilityLabel="앱 리뷰 요청"
          style={styles.card}
        >
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Feather name="star" size={22} color={Colors.primary} />
            </View>
            <TouchableOpacity
              accessibilityLabel="리뷰 요청 닫기"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onDismiss}
            >
              <Feather name="x" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Cathori가 도움이 되었나요?</Text>
          <Text style={styles.description}>
            리뷰를 남겨주시면 더 나은 서비스를 만드는 데 큰 도움이 됩니다.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={onDismiss}
              style={styles.laterButton}
            >
              <Text style={styles.laterButtonText}>나중에</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={onReviewPress}
              style={styles.reviewButton}
            >
              <Text style={styles.reviewButtonText}>리뷰 남기기</Text>
              <Feather name="external-link" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.categoryBadgeBg,
  },
  title: {
    marginBottom: 10,
    color: Colors.textPrimary,
    fontFamily: 'Pretendard',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  description: {
    marginBottom: 24,
    color: Colors.textSecondary,
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  laterButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.tabBg,
  },
  laterButtonText: {
    color: Colors.textSecondary,
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewButton: {
    flex: 1.45,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '700',
  },
});
