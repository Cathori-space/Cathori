/**
 * SearchBar — 검색 입력 바
 *
 * 동작:
 *  - controlled: value/onChangeText로 부모가 상태 보유
 *  - onSubmit: 키보드 Return(검색) 키 누를 때 1회 호출 → 부모에서 히스토리 추가에 사용
 *  - clear(X) 버튼: 입력값이 있을 때만 렌더, 탭 시 빈 문자열로 초기화
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors } from '@/src/constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  /** 키보드 Return 키 입력 시 호출 — 검색 기록 추가에 사용 */
  onSubmit?: (text: string) => void;
  placeholder?: string;
}

function SearchBarComponent({
  value,
  onChangeText,
  onSubmit,
  placeholder = '공지 검색',
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Feather name="search" size={18} color={Colors.textSecondary} />
      <TextInput
        style={styles.input}
        value={value}               // 부모에서 검색 상태 넘겨줌
        onChangeText={onChangeText} // 입력 시마다 트리거 -> 디바운스로 제어됨
        onSubmitEditing={() => onSubmit?.(value)} // 엔터 칠 때만 트리거 -> 히스토리 추가에 사용
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Feather name="x" size={18} color={Colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

export const SearchBar = SearchBarComponent;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.chipBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  input: {
    flex: 1,
    fontFamily: 'Pretendard',
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
});
