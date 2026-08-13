/**
 * 설정 화면 — app/(tabs)/settings.tsx
 *
 * 구조:
 * ┌─ MainHeader ────────────────────────────┐
 * │ 🏫 Cathori                          🔔  │
 * ├─────────────────────────────────────────┤
 * │ 프로필 섹션 (아이콘 + 이름 + 이메일 + 학과)  │
 * ├─ 알림 배너 (조건부: OS 권한 비활성 시) ─────┤
 * │ ⚠ 알림 권한이 비활성화되어 있습니다         │
 * │     [ 권한 설정으로 이동 ]                │
 * ├─ 공지 설정 ─────────────────────────────┤
 * │ 📋 관심 공지 키워드 설정            >    │
 * ├─ 알림 설정 ─────────────────────────────┤
 * │ 🔔 키워드 알림 수신           [토글]     │
 * │ 📢 이벤트 알림 수신           [토글]     │
 * │ ⚙ 시스템 알림 설정              >       │
 * ├─ 기타 ──────────────────────────────────┤
 * │ 📱 버전 정보                    v0.1.0-beta   │
 * │ 🚪 로그아웃                             │
 * ├─────────────────────────────────────────┤
 * │ © 2026 가톨릭대학교 팀 회광반조. 모든 권리 보유. │
 * └─────────────────────────────────────────┘
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/src/constants/colors';
import { withdraw } from '@/src/services/auth';
import { unregisterDeviceToken } from '@/src/services/pushToken';
import { MainHeader } from '@/src/shared/components';
import { useAuthStore } from '@/src/store/useAuthStore';

// ─── 상수 ──────────────────────────────────────────────────────────

const APP_VERSION = '0.1.0-beta';

// ─── 알림 권한 확인 유틸 (expo-notifications) ────────────────────────
// expo-notifications 미설치 시 fallback 처리
let getPermissionsAsync: (() => Promise<{ status: string }>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // expo-notifications가 설치돼 있으면 권한 확인 함수를 가져옴
  const Notifications = require('expo-notifications');
  getPermissionsAsync = Notifications.getPermissionsAsync;
} catch {
  // expo-notifications가 설치되지 않은 환경TODO:
  // TODO: expo-notifications가 설치되지 않은 환경일 때 알림 권한을 자동으로 granted로 설정하는 로직 추가
}

// ─── 토스트 유틸 ─────────────────────────────────────────────────────
function showToast(message: string) {
  if (Platform.OS === 'android') {
    // Android only
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

// ─── 설정 화면 ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  // ── Zustand 사용자 정보 ──
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // ── 알림 권한 상태 ──
  const [notificationPermitted, setNotificationPermitted] = useState(true);

  // ── 회원탈퇴 모달 ──
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  /** OS 알림 권한 확인 */
  /** OS 알림 권한 확인 */
const checkNotificationPermission = async () => {
  if (!getPermissionsAsync) {
    // expo-notifications 미설치 → 권한 확인 불가, 배너 숨김
    setNotificationPermitted(true);
    return;
  }
  try {
    const { status } = await getPermissionsAsync();
    setNotificationPermitted(status === 'granted'); // 알람 허용이 돼 있으면 true 아니라면 false
  } catch {
    setNotificationPermitted(true);
  }
};

  // 화면 진입 시 + 포그라운드 복귀 시 권한 재확인 (트랩 10 주의: 리스너 1회만 등록)
  useEffect(() => {
    checkNotificationPermission();

    // AppState가 바뀔 때마다 이 리스너로 등록한 이 함수가 실행됨 (active, background, inactive, unknown)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // 조건: 이전 상태가 background나 inactive였고
      // 다음 상태가 active(앱으로 돌아옴)일 때만
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkNotificationPermission();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove(); // cleanup — 중복 등록 방지
  }, [checkNotificationPermission]);

  // ── 핸들러 ──

  /** 관심 공지 키워드 설정 화면 이동 */
  const handleKeywordSettings = () => {
    router.push('/settings/keywords' as never);
  };

  /** 1차 MVP 비활성 기능 이벤트들 (토스트) */
  const handleToggleProfileEdit = () => {
    showToast('프로필 편집 기능은 추후 구현 예정입니다');
  };

  const handleToggleKeywordNotification = () => {
    showToast('현재는 설정한 모든 관심 태그에 대해서 알림을 수신합니다. (추후 개선 예정)');
  };

  const handleToggleEventNotification = () => {
    showToast('추후 이벤트 알람 구현 예정입니다');
  };

  /** 시스템 알림 설정 — OS 설정으로 외부 진입 */
  const handleSystemNotification = () => {
    Linking.openSettings();
  };

  /** 알림 권한 배너 → OS 설정 이동 */
  const handleGoToPermissionSettings = () => {
    Linking.openSettings();
  };

  /** 회원탈퇴 확인 모달 열기 */
  const handleWithdrawPress = () => {
    setWithdrawModalVisible(true);
  };

  /** 회원탈퇴 확정 — DELETE /api/users/me → clearAuth → 로그인 화면 이동 */
  const handleWithdrawConfirm = async () => {
    setWithdrawModalVisible(false);
    try {
      await withdraw();
    } catch (e) {
      console.warn('[withdraw] 탈퇴 API 실패:', e);
      Alert.alert('탈퇴 실패', '회원탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    try {
      await unregisterDeviceToken();
    } catch (e) {
      console.warn('[push] 토큰 반납 실패:', e);
    }
    await clearAuth();
    router.replace('/login');
  };

  /** 로그아웃 — 확인 다이얼로그 → clearAuth → 로그인 화면 이동 */
  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            // 토큰 반납(DELETE)은 JWT가 아직 유효할 때 먼저 호출해야 한다.
            // clearAuth()가 먼저면 토큰이 사라져 401이 된다. 실패해도 로그아웃은 진행.
            try {
              await unregisterDeviceToken();
            } catch (e) {
              console.warn('[push] 토큰 반납 실패:', e);
            }
            await clearAuth();
            router.replace('/login');
          },
        },
      ],
    );
  };

  // ── 프로필 표시 정보 파생 ──
  // TODO: const displayImage = ''; 추후에 구현 예정
  const displayName = '가톨릭대 학생' // user?.email?.split('@')[0] ?? '사용자';
  const displayEmail = user?.email ?? '';
  const displayMajor = user?.major ?? '';

  return (
    <View style={styles.screen}>
      {/* 상단 헤더 — 메인과 동일 */}
      <MainHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 섹션 ── */}
        <View style={styles.profileCard}>
          {/* TODO: 프로필 아이콘 추후에 구현 예정 */}
          <View style={styles.profileIconWrapper}>
            <Feather name="user" size={24} color={Colors.primary} />
          </View>

          {/* 프로필 정보 */}
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
            </View>

            <Text style={styles.profileEmail}>{displayEmail}</Text>

            {/* 학과 뱃지 */}
            {displayMajor.length > 0 && (
              <View style={styles.majorBadge}>
                <Text style={styles.majorBadgeText}>{displayMajor}</Text>
              </View>
            )}
          </View>

          {/* TODO: 프로필 옆 편집 기능 추후에 구현 예정 */}
          <TouchableOpacity onPress={handleToggleProfileEdit}>
            <Feather name="edit" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── 알림 권한 배너 (조건부) ── */}
        {!notificationPermitted && (
          <View style={styles.alertBanner}>
            <View style={styles.alertBannerContent}>
              {/* 아이콘 */}
              <View style={styles.alertIconWrapper}>
                <Feather name="bell-off" size={16} color="#BA1A1A" />
              </View>

              {/* 텍스트 */}
              <View style={styles.alertTextSection}>
                <Text style={styles.alertTitle}>
                  알림 권한이 비활성화되어 있습니다
                </Text>
                <Text style={styles.alertDescription}>
                  공지 알림을 받으려면 설정에서 허용해주세요.
                </Text>
              </View>
            </View>

            {/* 권한 설정 버튼 */}
            <TouchableOpacity
              style={styles.alertButton}
              onPress={handleGoToPermissionSettings}
              activeOpacity={0.85}
            >
              <Text style={styles.alertButtonText}>권한 설정으로 이동</Text>
              <Feather name="external-link" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── 공지 설정 섹션 ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>공지 설정</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleKeywordSettings}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <Feather name="tag" size={18} color={Colors.primary} />
                <Text style={styles.settingsRowText}>
                  관심 공지 태그 설정
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 알림 설정 섹션 ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <View style={styles.sectionCard}>
            {/* 키워드 알림 수신 */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <Feather name="bell" size={18} color={Colors.primary} />
                <Text style={styles.settingsRowText}>관심 태그 알림 수신</Text>
              </View>
              <Switch
                value={false}
                onValueChange={handleToggleKeywordNotification}
                trackColor={{ false: Colors.divider, true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* 이벤트 알림 수신 */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <Feather name="calendar" size={18} color={Colors.primary} />
                <Text style={styles.settingsRowText}>이벤트 알림 수신</Text>
              </View>
              <Switch
                value={false}
                onValueChange={handleToggleEventNotification}
                trackColor={{ false: Colors.divider, true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* 시스템 알림 설정 */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleSystemNotification}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <Feather name="settings" size={18} color={Colors.primary} />
                <Text style={styles.settingsRowText}>시스템 알림 설정</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 기타 섹션 ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>기타</Text>
          <View style={styles.sectionCard}>
            {/* 버전 정보 */}
            <View style={[styles.settingsRow, styles.settingsRowBorder]}>
              <View style={styles.settingsRowLeft}>
                <Feather name="info" size={18} color={Colors.primary} />
                <Text style={styles.settingsRowText}>버전 정보</Text>
              </View>
              <Text style={styles.versionText}>v{APP_VERSION}</Text>
            </View>

            {/* 로그아웃 */}
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <Feather name="log-out" size={18} color="#BA1A1A" />
                <Text style={styles.logoutText}>로그아웃</Text>
              </View>
            </TouchableOpacity>

            {/* 회원탈퇴 */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleWithdrawPress}
              activeOpacity={0.7}
            >
              <View style={styles.settingsRowLeft}>
                <Feather name="user-x" size={18} color="#BA1A1A" />
                <Text style={styles.withdrawText}>회원탈퇴</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 푸터 ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 가톨릭대학교 팀 회광반조. 모든 권리 보유.
          </Text>
        </View>
      </ScrollView>

      {/* ── 회원탈퇴 확인 모달 ── */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <Feather name="alert-triangle" size={28} color="#BA1A1A" />
            </View>
            <Text style={styles.modalTitle}>회원탈퇴</Text>
            <Text style={styles.modalDescription}>
              탈퇴 시 모든 데이터가 삭제되며{'\n'}복구할 수 없습니다.{'\n'}정말 탈퇴하시겠습니까?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleWithdrawConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonConfirmText}>탈퇴하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setWithdrawModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 128, // 하단 탭바 + 여유
    gap: 32,
  },

  // ─── 프로필 카드 ───
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 212, 0.3)',
    // shadow
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1.75,
      },
    }),
  },
  profileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(221, 225, 255, 0.2)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.45,
  },
  profileEmail: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  majorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  majorBadgeText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '700',
    color: '#6C5000',
    letterSpacing: 0.55,
  },

  // ─── 알림 배너 ───
  alertBanner: {
    backgroundColor: 'rgba(255, 218, 214, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.1)',
    padding: 20,
    gap: 16,
  },
  alertBannerContent: {
    flexDirection: 'row',
    gap: 16,
  },
  alertIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextSection: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '700',
    color: '#93000A',
    lineHeight: 22,
  },
  alertDescription: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(147, 0, 10, 0.7)',
    lineHeight: 20,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00175B',
    borderRadius: 12,
    paddingVertical: 12,
  },
  alertButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 섹션 그룹 ───
  sectionGroup: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.96,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 226, 226, 0.2)',
    overflow: 'hidden',
    // shadow
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 10.5,
      },
    }),
  },

  // ─── 설정 행 ───
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 226, 0.2)',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsRowText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    letterSpacing: -0.375,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(226, 226, 226, 0.2)',
    marginHorizontal: 16,
  },
  versionText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  logoutText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '500',
    color: '#BA1A1A',
    letterSpacing: -0.375,
  },
  withdrawText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '500',
    color: '#BA1A1A',
    letterSpacing: -0.375,
  },

  // ─── 회원탈퇴 모달 ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: '#BA1A1A',
    letterSpacing: -0.45,
  },
  modalDescription: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F2F2F2',
  },
  modalButtonConfirm: {
    backgroundColor: '#BA1A1A',
  },
  modalButtonCancelText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalButtonConfirmText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 푸터 ───
  footer: {
    alignItems: 'center',
    paddingTop: 15,
    opacity: 0.6,
  },
  footerText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.275,
    textAlign: 'center',
    lineHeight: 16,
  },
});
