/**
 * 회원가입 화면
 * Phase 1 Task 1-3~1-4에서 로직 본격 구현
 * 시나리오: R-1 ~ R-4
 *
 * 레이아웃 구조:
 *  - TopAppBar: 뒤로 가기 + "회원가입" 타이틀 (blur 배경, absolute)
 *  - Main: 노란 안내 카드 + 폼 6섹션 (스크롤)
 *  - BottomNavBar: 이전 + 완료 버튼 (blur 배경, absolute)
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
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

/** 학년 옵션 */
const GRADE_OPTIONS = [1, 2, 3, 4] as const;

/** 재학 상태 옵션 */
const STATUS_OPTIONS = ['재학', '휴학'] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Phase 1에서 실제 상태 관리로 교체
  const selectedGrade = 1; // 기본 선택: 1학년
  const selectedStatus = '재학'; // 기본 선택: 재학

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
                    editable={false} // Phase 1에서 활성화
                  />
                </View>
              </View>
              {/* 인증번호 전송 버튼 */}
              <TouchableOpacity
                style={styles.verifyButton}
                activeOpacity={0.85}
                disabled // Phase 1에서 활성화
              >
                <Text style={styles.verifyButtonText}>인증번호 전송</Text>
              </TouchableOpacity>
            </View>

            {/* 2. 인증번호 섹션 */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>인증번호</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="인증 번호 6자리 입력"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={false} // Phase 1에서 활성화
                />
                {/* Phase 1에서 타이머 표시 추가 */}
              </View>
            </View>

            {/* 3. 비밀번호 섹션 */}
            <View style={styles.sectionGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.sectionLabel}>비밀번호</Text>
              </View>
              {/* 비밀번호 규칙 안내 — Phase 1에서 동적 검증으로 교체 */}
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
                  editable={false} // Phase 1에서 활성화
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
                <TouchableOpacity
                  style={styles.selectButton}
                  activeOpacity={0.7}
                  disabled // Phase 1에서 활성화
                >
                  <Text style={styles.selectPlaceholder}>
                    전공을 선택하세요
                  </Text>
                  <Feather name="chevron-down" size={16} color="#757684" />
                </TouchableOpacity>
              </View>
              {/* 복수/부전공 */}
              <View style={styles.subsection}>
                <View style={styles.labelContainer}>
                  <Text style={styles.sectionLabel}>
                    복수 · 부전공 선택 (선택사항)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.selectButton}
                  activeOpacity={0.7}
                  disabled // Phase 1에서 활성화
                >
                  <Text style={styles.selectPlaceholder}>
                    선택안함/미확정시 비워주세요
                  </Text>
                  <Feather name="chevron-down" size={16} color="#757684" />
                </TouchableOpacity>
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
                      disabled // Phase 1에서 활성화
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
                      disabled // Phase 1에서 활성화
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
            style={styles.completeButton}
            activeOpacity={0.85}
            disabled // Phase 1에서 활성화
          >
            <Text style={styles.completeButtonText}>완료</Text>
            <Feather name="check" size={18} color="#FFFFFF" />
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
