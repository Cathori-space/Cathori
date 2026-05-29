/**
 * 회원가입 화면
 *
 * 레이아웃:
 *  - TopAppBar: 뒤로 가기 + "회원가입" 타이틀 (blur 배경, absolute)
 *  - Main: 노란 안내 카드 + 폼 6섹션 (스크롤)
 *  - BottomNavBar: 이전 + 완료 버튼 (blur 배경, absolute)
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/constants/colors';
import { useEmailVerification, useRegister } from '@/src/features/auth/hooks';

/** 학년 옵션 */
const GRADE_OPTIONS = [1, 2, 3, 4] as const;

/** 재학 상태 옵션 */
const STATUS_OPTIONS = ['재학', '휴학'] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── 폼 상태 ──
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [major1, setMajor1] = useState('');
  const [major2, setMajor2] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('재학');

  // ── 훅 ──
  const emailVerification = useEmailVerification(); // TODO: 구조 할당 분해 문법으로 변경 예정 
  const { register, isLoading: isRegistering, errorMessage: registerError, resetError: resetRegisterError } = useRegister();

  /** 인증번호 전송 핸들러 */
  const handleSendVerification = () => {
    if (!email.trim()) return;
    emailVerification.sendVerification({ email: email.trim() });
  };

  /** 인증번호 검증 핸들러 (6자리 입력 완료 시 자동 검증) */
  const handleVerify = (code: string) => {
    setVerificationCode(code);
    if (code.length === 6) {
      emailVerification.verify({ email: email.trim(), code });
    }
  };

  /** 완료 버튼 — 회원가입 + 자동 로그인 */
  const handleComplete = () => {
    if (isRegistering) return;
    if (!emailVerification.isVerified) {
      Alert.alert('알림', '이메일 인증을 먼저 완료해주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (!major1.trim()) {
      Alert.alert('알림', '주전공을 입력해주세요.');
      return;
    }

    resetRegisterError();
    register({
      email: email.trim(),
      password,
      major1: major1.trim(),
      major2: major2.trim() || null,
      grade: selectedGrade,
      status: selectedStatus,
    });
  };

  /** 폼 전체 유효성 */
  const isFormValid =
    emailVerification.isVerified &&
    password.length >= 8 &&
    major1.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* ── TopAppBar (absolute) ── */}
      <SafeAreaView edges={['top']} style={styles.topAppBar}>
        <View style={styles.topAppBarContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={24} color="#00175B" />
          </TouchableOpacity>
          <Text style={styles.topAppBarTitle}>회원가입</Text>
          {/* 오른쪽 빈 공간 (중앙 정렬용) */}
          <View style={styles.backButton} />
        </View>
      </SafeAreaView>

      {/* ── Main (스크롤) ── */}
      <KeyboardAvoidingView
        style={styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 64 + 16,
              paddingBottom: insets.bottom + 82 + 16
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 노란 안내 카드 — 시안: Section - Academic Brief */}
          <View style={styles.briefCard}>
            <Text style={styles.briefTitle}>
              가톨릭대 학생 인증 및 회원가입
            </Text>
            <Text style={styles.briefSubtitle}>
              학교 메일 인증을 통해 서비스를 시작하세요.
            </Text>
          </View>

          {/* ── 폼 섹션 (gap: 39) ── */}
          <View style={styles.formContainer}>
            {/* 1. 학교 이메일 섹션 */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>학교 이메일</Text>
              </View>
              <View style={styles.emailRow}>
                <View style={[styles.inputContainer, styles.emailInput]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="@catholic.ac.kr"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!emailVerification.isVerified && !emailVerification.isSending}
                  />
                </View>
              </View>
              {/* 인증번호 전송 버튼 */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (emailVerification.isVerified || !email.trim()) && styles.buttonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={emailVerification.isVerified || !email.trim() || emailVerification.isSending}
                onPress={handleSendVerification}
              >
                {emailVerification.isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {emailVerification.isSent ? '재발송' : '인증번호 전송'}
                  </Text>
                )}
              </TouchableOpacity>
              {/* 발송 에러 메시지 */}
              {emailVerification.sendErrorMessage && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{emailVerification.sendErrorMessage}</Text>
                </View>
              )}
            </View>

            {/* 2. 인증번호 섹션 */}
            {emailVerification.isSent && (
              <View style={styles.sectionGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.sectionLabel}>인증번호</Text>
                </View>
                <View style={styles.codeInputRow}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="인증 번호 6자리 입력"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={verificationCode}
                      onChangeText={handleVerify}
                      editable={!emailVerification.isVerified && !emailVerification.isVerifying}
                    />
                  </View>
                  {/* 타이머 표시 */}
                  {!emailVerification.isVerified && (
                    <Text style={[
                      styles.timerText,
                      emailVerification.isExpired && styles.timerExpired,
                    ]}>
                      {emailVerification.formattedTime}
                    </Text>
                  )}
                </View>
                {/* 인증 성공 표시 */}
                {emailVerification.isVerified && (
                  <View style={styles.successContainer}>
                    <Feather name="check-circle" size={14} color="#10B981" />
                    <Text style={styles.successText}>인증이 완료되었습니다</Text>
                  </View>
                )}
                {/* 검증 에러 메시지 */}
                {emailVerification.verifyErrorMessage && (
                  <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{emailVerification.verifyErrorMessage}</Text>
                  </View>
                )}
              </View>
            )}

            {/* 3. 비밀번호 섹션 */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>비밀번호</Text>
              </View>
              <View style={styles.passwordRulesContainer}>
                <Text style={styles.passwordRule}>
                  • 8자 이상, 영문·숫자·특수문자 포함
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* 4. 전공 선택 섹션 */}
            <View style={styles.sectionGroup}>
              {/* 주전공 */}
              <View style={styles.subsection}>
                <View style={styles.labelContainer}>
                  <Text style={styles.sectionLabel}>전공 선택</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput // TODO: 드롭다운 형식으로 변경 예정
                    style={styles.textInput}
                    placeholder="전공을 입력하세요 (예: 컴퓨터공학과)"
                    placeholderTextColor="#9CA3AF"
                    value={major1}
                    onChangeText={setMajor1}
                  />
                </View>
              </View>
              {/* 복수/부전공 */}
              <View style={styles.subsection}>
                <View style={styles.labelContainer}>
                  <Text style={styles.sectionLabel}>
                    복수 · 부전공 선택 (선택사항)
                  </Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput // TODO: 드롭다운 형식으로 변경 예정
                    style={styles.textInput}
                    placeholder="선택안함/미확정시 비워주세요"
                    placeholderTextColor="#9CA3AF"
                    value={major2}
                    onChangeText={setMajor2}
                  />
                </View>
                <View style={styles.helperContainer}>
                  <Text style={styles.helperText}>
                    추후 마이페이지에서 변경 가능합니다
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. 학년 선택 섹션 — 시안: 4개 pill 버튼 */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>학년 선택</Text>
              </View>
              <View style={styles.gradeRow}>
                {GRADE_OPTIONS.map((grade) => {
                  const isSelected = grade === selectedGrade;
                  return (
                    <TouchableOpacity
                      key={grade}
                      style={[
                        styles.gradePill,
                        isSelected && styles.gradePillSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedGrade(grade)}
                    >
                      <Text
                        style={[
                          styles.gradePillText,
                          isSelected && styles.gradePillTextSelected,
                        ]}
                      >
                        {grade}학년
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6. 재학 상태 섹션 — 시안: 토글 (재학 / 휴학) */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>재학 상태</Text>
              </View>
              <View style={styles.statusToggleContainer}>
                {STATUS_OPTIONS.map((status) => {
                  const isSelected = status === selectedStatus;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusToggle,
                        isSelected && styles.statusToggleSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          isSelected && styles.statusToggleTextSelected,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 회원가입 에러 메시지 */}
          {registerError && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{registerError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── BottomNavBar (absolute) ── */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          {/* 이전 버튼 */}
          <TouchableOpacity
            style={styles.prevButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={18} color="#444652" />
            <Text style={styles.prevButtonText}>이전</Text>
          </TouchableOpacity>

          {/* 완료 버튼 */}
          <TouchableOpacity
            style={[
              styles.completeButton,
              (!isFormValid || isRegistering) && styles.buttonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!isFormValid || isRegistering}
            onPress={handleComplete}
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>완료</Text>
                <Feather name="check" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9', // 시안: 메인 배경
  },

  // ─── TopAppBar ────────────────────────────────────────
  topAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFFCC', // 시안: 80% 흰색 + blur
  },
  topAppBarContent: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAppBarTitle: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '700',
    color: '#00175B',
    letterSpacing: -0.45,
    textAlign: 'center',
  },

  // ─── Main (스크롤) ────────────────────────────────────
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 96, // TopAppBar 높이 (64) + SafeArea + 여유
    paddingHorizontal: 24,
    paddingBottom: 144, // BottomNavBar 높이 + 여유
    gap: 39, // 시안: Main gap
  },

  // ─── 노란 안내 카드 ───────────────────────────────────
  briefCard: {
    backgroundColor: '#FCC006', // 시안: Ginkgo Yellow
    borderRadius: 16,
    padding: 24,
    gap: 8,
    // 시안의 그림자
    ...Platform.select({
      android: { elevation: 2 }, // Android only
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  briefTitle: {
    fontFamily: 'Pretendard',
    fontSize: 20,
    fontWeight: '700',
    color: '#6C5000', // 시안: highlightText 계열
    lineHeight: 25,
  },
  briefSubtitle: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: '#6C5000CC', // 시안: 80% opacity
    lineHeight: 20,
  },

  // ─── 폼 컨테이너 ──────────────────────────────────────
  formContainer: {
    gap: 39, // 시안: Form gap
  },
  sectionGroup: {
    gap: 16, // 시안: 각 Section 내부 gap
  },
  subsection: {
    gap: 16,
  },
  labelContainer: {
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '700',
    color: '#757684', // 시안: 라벨 색상
    letterSpacing: 1.1,
    lineHeight: 17,
  },

  // ─── 인풋 공통 ────────────────────────────────────────
  inputContainer: {
    borderRadius: 12,
    backgroundColor: '#F3F3F3', // 시안: Input 배경
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 17,
  },
  textInput: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  emailRow: {
    gap: 12,
  },
  emailInput: {
    // 이메일 입력은 전체 너비
  },
  codeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 44,
    textAlign: 'right',
  },
  timerExpired: {
    color: '#EF4444',
  },

  // ─── 인증번호 전송 버튼 ───────────────────────────────
  verifyButton: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.primary, // 시안: gradient 간소화
  },
  verifyButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // ─── 에러/성공 메시지 ──────────────────────────────────
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  successText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
    lineHeight: 18,
  },

  // ─── 비밀번호 규칙 ────────────────────────────────────
  passwordRulesContainer: {
    paddingHorizontal: 4,
  },
  passwordRule: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    color: '#757684',
    lineHeight: 18,
  },

  // ─── 전공 선택 드롭다운 ───────────────────────────────
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectPlaceholder: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    color: '#9CA3AF',
  },
  helperContainer: {
    paddingHorizontal: 4,
  },
  helperText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },

  // ─── 학년 pill 버튼 ──────────────────────────────────
  gradeRow: {
    flexDirection: 'row',
    gap: 0,
  },
  gradePill: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#E2E2E2', // 시안: 미선택 배경
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradePillSelected: {
    backgroundColor: '#00175B', // 시안: 선택 배경 (Dark Blue)
  },
  gradePillText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: '#444652', // 시안: 미선택 텍스트
  },
  gradePillTextSelected: {
    color: '#FFFFFF',
  },

  // ─── 재학 상태 토글 ──────────────────────────────────
  statusToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3', // 시안: 토글 배경
    borderRadius: 16,
    padding: 4,
  },
  statusToggle: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleSelected: {
    backgroundColor: '#FFFFFF',
    // 시안의 그림자
    ...Platform.select({
      android: { elevation: 1 }, // Android only
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  statusToggleText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: '#757684', // 시안: 미선택 텍스트
  },
  statusToggleTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // ─── BottomNavBar ─────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFFCC', // 시안: 80% 흰색 + blur
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // 시안의 그림자
    ...Platform.select({
      android: { elevation: 12 }, // Android only
      ios: {
        shadowColor: '#00175B',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.06,
        shadowRadius: 35,
      },
    }),
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 60,
    paddingBottom: 32,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -1,
    paddingVertical: 8,
    paddingHorizontal: 32,
  },
  prevButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: '#444652',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 32,
    // 시안의 그림자
    ...Platform.select({
      android: { elevation: 6 }, // Android only
      ios: {
        shadowColor: '#00288C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 13,
      },
    }),
  },
  completeButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
