/* global jest */
const React = require('react');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  const component = (name) => function MockComponent(props) {
    return React.createElement(name, props, props.children);
  };
  return {
    View: component('View'), Text: component('Text'), TextInput: component('TextInput'),
    TouchableOpacity: component('TouchableOpacity'), Pressable: component('Pressable'),
    ScrollView: component('ScrollView'), KeyboardAvoidingView: component('KeyboardAvoidingView'),
    ActivityIndicator: component('ActivityIndicator'),
    Modal: (props) => props.visible ? React.createElement('Modal', props, props.children) : null,
    FlatList: React.forwardRef(function MockFlatList(props, ref) {
      React.useImperativeHandle(ref, () => ({ scrollToIndex: jest.fn(), scrollToOffset: jest.fn() }));
      return React.createElement('FlatList', props,
        props.data.length
          ? props.data.map((item) => React.createElement(React.Fragment, { key: item }, props.renderItem({ item })))
          : props.ListEmptyComponent);
    }),
    Keyboard: { dismiss: jest.fn() },
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios', select: (options) => options.ios ?? options.default },
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1, absoluteFillObject: {} },
  };
});
jest.mock('@expo/vector-icons', () => ({ Feather: 'Icon' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
