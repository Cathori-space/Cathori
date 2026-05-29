/**
 * 로그인 화면
 *
 * 레이아웃:
 *  - 상단 40%: DCU Blue 배경 + 블러 장식 + 브랜드 로고
 *  - 하단 60%: 흰색 Auth Sheet (cornerRadius 24) + 로그인 폼
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import { useLogin } from '@/src/features/auth/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
/** 상단 브랜딩 영역 비율 (시안: 353.59 / 884 ≈ 40%) */
const HEADER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── 폼 상태 ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── 로그인 mutation ──
  const { login, isLoading, errorMessage, resetError } = useLogin();

  /** 이메일/비밀번호 기본 유효성 (빈 값 방지) */
  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  /** 로그인 버튼 터치 핸들러 */
  const handleLogin = () => {
    if (!isFormValid || isLoading) return;
    resetError(); // 이전 에러 초기화
    login({ email: email.trim(), password });
  };

  return (
    <View style={styles.container}>
      {/* ── 상단 40%: 브랜딩 영역 (DCU Blue) ── */}
      <View style={styles.headerSection}>
        {/* 장식용 블러 원 — 시안의 Background Decorative Element */}
        <View style={styles.decorCircle} />
        <View style={styles.decorCircleSmall} />

        {/* 브랜드 아이콘 + 텍스트 */}
        <View style={styles.brandContainer}>
          {/* 노란 아이콘 배경 — 시안의 64x64 노란 사각형 */}
          <View style={styles.iconWrapper}>
            <Feather name="bell" size={28} color="#00175B" />
          </View>

          <Text style={styles.logoText}>Cathori</Text>
          <Text style={styles.taglineText}>
            관심 공지를 편하게, 놓치지 않고
          </Text>
        </View>
      </View>

      {/* ── 하단 60%: Auth Sheet ── */}
      <KeyboardAvoidingView
        style={styles.sheetSection}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 상단 핸들 — 시안의 Accessibility Notch */}
        <View style={styles.sheetHandle} />

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingBottom: 14 + insets.bottom,
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 폼 섹션 ── */}
          <View style={styles.formSection}>
            {/* 이메일 입력 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>UNIVERSITY EMAIL</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="@catholic.ac.kr"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address" // 이메일 전용 키보드 타입
                  autoCapitalize="none"
                  autoCorrect={false} // 자동교정 해제
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) resetError();
                  }}
                  editable={!isLoading}
                  returnKeyType="next" // 키보드에서 다음으로 버튼 클릭 시
                />
              </View>
            </View>

            {/* 비밀번호 입력 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) resetError();
                  }}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            {/* 에러 메시지 */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* 로그인 CTA 버튼 */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid || isLoading) && styles.loginButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!isFormValid || isLoading}
              onPress={handleLogin}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>로그인</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── "또는" 디바이더 ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Text style={styles.dividerText}>또는</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* ── 하단 액션 링크 ── */}
          <View style={styles.actionLinks}>
            {/* 회원가입 버튼 (아웃라인) */}
            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.7}
              onPress={() => router.push('/register' as never)}
            >
              <Text style={styles.registerButtonText}>회원가입</Text>
            </TouchableOpacity>

            {/* 게스트 둘러보기
            TODO : "준비 중입니다" 토스트 구현 필요 */}
            <TouchableOpacity
              style={styles.guestButton}
              activeOpacity={0.5}
            >
              <Text style={styles.guestButtonText}>게스트로 둘러보기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // #00288C
  },

  // ─── 상단 브랜딩 영역 ─────────────────────────────────
  headerSection: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: 9999,
    backgroundColor: '#00288C',
    left: -80,
    bottom: -50,
    opacity: 0.3,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 9999,
    backgroundColor: '#FCC00610',
    right: -48,
    top: 80,
    opacity: 0.5,
  },
  brandContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FCC006', // 시안: Ginkgo Yellow
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    // 시안의 그림자 효과
    ...Platform.select({
      android: { elevation: 8 }, // Android only
      ios: {
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  logoText: {
    fontFamily: 'Pretendard',
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.8,
    marginBottom: 8,
  },
  taglineText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '500',
    color: '#DBEAFEE5', // 시안: 흰색 90% opacity
    letterSpacing: -0.35,
    textAlign: 'center',
  },

  // ─── 하단 Auth Sheet ──────────────────────────────────
  sheetSection: {
    flex: 1,
    backgroundColor: '#F9F9F9', // 시안: Auth Sheet 배경
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // 시안의 그림자 효과
    ...Platform.select({
      android: { elevation: 16 }, // Android only
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.1,
        shadowRadius: 35,
      },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#C5C5D433', // 시안: separator 20%
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 14,
    justifyContent: 'space-between',
    flexGrow: 1,
  },

  // ─── 폼 섹션 ──────────────────────────────────────────
  formSection: {
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 0, // 라벨이 인풋 위에 겹치는 구조 (layout: none)
  },
  inputLabel: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '700',
    color: '#444652', // 시안: textSecondary
    letterSpacing: 1,
    lineHeight: 15,
    marginLeft: 4,
    marginBottom: 4,
  },
  inputContainer: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F3F3', // 시안: Input 배경
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  textInput: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary, // #00288C
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    // 시안의 그림자
    ...Platform.select({
      android: { elevation: 6 }, // Android only
      ios: {
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 13,
      },
    }),
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
  },

  // ─── 에러 메시지 ──────────────────────────────────────
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
    lineHeight: 18,
  },

  // ─── 디바이더 ─────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#C5C5D44D', // 시안: 30% 투명도 separator
  },
  dividerTextContainer: {
    paddingHorizontal: 16,
  },
  dividerText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '600',
    color: '#C5C5D4', // 시안: separator 색상
    letterSpacing: 0.6,
  },

  // ─── 하단 액션 링크 ───────────────────────────────────
  actionLinks: {
    gap: 16,
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary, // 시안: DCU Blue 아웃라인
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 23,
  },
  guestButton: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '500',
    color: '#44465299', // 시안: 60% opacity textSecondary
    lineHeight: 20,
  },
});
