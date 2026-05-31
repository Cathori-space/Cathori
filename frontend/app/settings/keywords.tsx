/**
 * 관심 공지 키워드 설정 화면 — app/settings/keywords.tsx
 *
 * 구조:
 * ┌─ SubHeader ──────────────────────────────┐
 * │ ←     관심 공지 키워드 설정              │
 * ├──────────────────────────────────────────┤
 * │ 관심 공지 키워드 설정 (대 타이틀)          │
 * │ 설정된 키워드가 포함된 공지사항이 등록되면   │
 * │ 알림을 받습니다.                         │
 * ├──────────────────────────────────────────┤
 * │ 새 키워드 추가                           │
 * │ [🔍 키워드 입력...         ] [추가]      │
 * ├──────────────────────────────────────────┤
 * │ 등록된 키워드                            │
 * │ [국가장학금 ×] [해외연수 ×] [인턴 ×]     │
 * ├──────────────────────────────────────────┤
 * │ 추천 키워드 (1차 MVP 제외)               │
 * └──────────────────────────────────────────┘
 *
 * 정책:
 *  - 추가/삭제 즉시 서버 반영 (별도 저장 버튼 없음)
 *  - 낙관적 업데이트 적용
 *  - 태그 최대 20개
 */

import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/src/constants/colors';
import {
  extractTagErrorCode,
  getTagErrorMessage,
  useCreateTag,
  useDeleteTag,
  useRefreshTags,
} from '@/src/features/settings/hooks';
import { SubHeader } from '@/src/shared/components';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── 토스트 유틸 ─────────────────────────────────────────────────────

function showToast(message: string) {
  if (Platform.OS === 'android') {
    // Android only
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

// ─── 관심 키워드 설정 화면 ──────────────────────────────────────────

export default function KeywordSettingsScreen() {
  const tags = useAuthStore((s) => s.tags);
  const insets = useSafeAreaInsets();

  const [inputValue, setInputValue] = useState('');

  const createTagMutation = useCreateTag();
  const deleteTagMutation = useDeleteTag();
  const { refreshTags, isRefreshing } = useRefreshTags();

  /** 최신 태그 목록 새로고침 (Pull-to-Refresh) */
  const handleRefresh = async () => {
    const { success } = await refreshTags();
    if (success) {
      showToast('관심 키워드 목록이 갱신되었습니다');
    } else {
      showToast('키워드 목록을 가져오지 못했습니다. 네트워크 상태를 확인해주세요.');
    }
  };

  /** 태그 추가 */
  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;

    // 클라이언트 중복 체크 (서버에서도 409 반환하지만, 불필요한 네트워크 요청 방지)
    if (tags.some((tag) => tag.tagName === trimmed)) {
      showToast('이미 등록된 태그입니다');
      return;
    }

    createTagMutation.mutate(trimmed, {
      onSuccess: () => {
        setInputValue('');
      },
      onError: (error) => {
        const code = extractTagErrorCode(error);
        if (code) {
          showToast(getTagErrorMessage(code));
        } else {
          showToast('태그 추가에 실패했습니다');
        }
      },
    });
  };

  /** 태그 삭제 */
  const handleDeleteTag = (tagId: number) => {
    deleteTagMutation.mutate(tagId, {
      onError: (error) => {
        const code = extractTagErrorCode(error);
        if (code) {
          showToast(getTagErrorMessage(code));
        } else {
          showToast('태그 삭제에 실패했습니다');
        }
      },
    });
  };

  /** 입력란 제출 (키보드 완료 버튼) */
  const handleSubmitEditing = () => {
    handleAddTag();
  };

  return (
    <View style={styles.screen}>
      {/* 헤더 — 뒤로가기 + 타이틀 */}
      <SubHeader title="관심 공지 키워드 설정" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent,
          {
            paddingTop: insets.top + 64 + 16,
            paddingBottom: insets.bottom + 82 + 16
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── 페이지 타이틀 + 안내 ── */}
        <View style={styles.pageTitleSection}>
          <Text style={styles.pageTitle}>관심 공지 키워드 설정</Text>
          <Text style={styles.pageDescription}>
            설정된 키워드가 포함된 공지사항이 등록되면 알림을 받습니다.
          </Text>
        </View>

        {/* ── 새 키워드 추가 섹션 ── */}
        <View style={styles.addSection}>
          <Text style={styles.sectionLabel}>새 키워드 추가</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Feather name="search" size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="키워드 입력 (예: 장학, 공모전)"
                placeholderTextColor={Colors.textSecondary}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSubmitEditing}
                returnKeyType="done"
                maxLength={20}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.addButton,
                inputValue.trim().length === 0 && styles.addButtonDisabled,
              ]}
              onPress={handleAddTag}
              activeOpacity={0.85}
              disabled={inputValue.trim().length === 0}
            >
              <Text style={styles.addButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 등록된 키워드 섹션 ── */}
        <View style={styles.registeredSection}>
          <Text style={styles.sectionLabel}>등록된 키워드</Text>
          {tags.length > 0 ? (
            <View style={styles.chipContainer}>
              {tags.map((tag) => (
                <View key={tag.tagId} style={styles.chip}>
                  <Text style={styles.chipText}>{tag.tagName}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteTag(tag.tagId)}
                    hitSlop={8}
                  >
                    <Feather name="x" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChipContainer}>
              <Feather name="tag" size={24} color={Colors.separator} />
              <Text style={styles.emptyChipText}>
                등록된 키워드가 없습니다
              </Text>
            </View>
          )}
        </View>

        {/* ── 추천 키워드 섹션 (1차 MVP 제외) ── */}
        {/* TODO(2차 MVP): 추천 키워드 섹션 구현 */}
        {/* <View style={styles.recommendedSection}>
          <Text style={styles.sectionLabel}>추천 키워드</Text>
          <Text style={styles.recommendedDescription}>
            다른 학생들이 많이 등록한 키워드입니다.
          </Text>
        </View> */}
      </ScrollView>
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
    paddingTop: 80, // SubHeader 높이 (64) + 여유
    paddingHorizontal: 16,
    paddingBottom: 128,
    gap: 24,
  },

  // ─── 페이지 타이틀 ───
  pageTitleSection: {
    paddingHorizontal: 8,
    gap: 7,
  },
  pageTitle: {
    fontFamily: 'Pretendard',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  pageDescription: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ─── 새 키워드 추가 ───
  addSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    gap: 12,
    // shadow
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 7,
      },
    }),
  },
  sectionLabel: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.35,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textPrimary,
    padding: 0,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── 등록된 키워드 ───
  registeredSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    gap: 16,
    // shadow
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 7,
      },
    }),
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DDE1FF',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
  },
  chipText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyChipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyChipText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
});
