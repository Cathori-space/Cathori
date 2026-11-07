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
    ActivityIndicator: component('ActivityIndicator'), RefreshControl: component('RefreshControl'),
    Switch: component('Switch'), Modal: (props) => props.visible ? React.createElement('Modal', props, props.children) : null,
    FlatList: (props) => React.createElement('FlatList', props,
      typeof props.ListHeaderComponent === 'function' ? React.createElement(props.ListHeaderComponent) : props.ListHeaderComponent,
      props.data.length ? props.data.map((item, index) => React.createElement(React.Fragment, { key: index }, props.renderItem({ item, index })))
        : typeof props.ListEmptyComponent === 'function' ? React.createElement(props.ListEmptyComponent) : props.ListEmptyComponent),
    StyleSheet: { create: (s) => s, hairlineWidth: 1, absoluteFillObject: {} },
    Platform: { OS: 'ios', select: (options) => options.ios ?? options.default },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Alert: { alert: jest.fn() }, ToastAndroid: { show: jest.fn(), SHORT: 0 },
    Linking: { openURL: jest.fn(), openSettings: jest.fn() }, Share: { share: jest.fn() },
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn(() => true) };
  const Stack = ({ children }) => React.createElement('Stack', null, children);
  Stack.Screen = function Screen(props) { return React.createElement('StackScreen', props); };
  Stack.Protected = function Protected({ guard, children }) { return guard ? children : null; };
  return { router, Stack, useRouter: () => router, useSegments: () => ['login'], useLocalSearchParams: () => ({ id: '213' }) };
});
jest.mock('@expo/vector-icons', () => ({ Feather: 'Icon', FontAwesome: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: 'SafeAreaView', SafeAreaProvider: 'SafeAreaProvider',
}));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: 'GestureHandlerRootView' }));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => 'Swipeable');
jest.mock('react-native-reanimated', () => ({}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn(async () => {}), AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getDevicePushTokenAsync: jest.fn(async () => ({ data: 'device' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
}));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(async () => 'device'),
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.2' } }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
require('axios').default.defaults.adapter = jest.fn();
const originalError = console.error;
jest.spyOn(console, 'error').mockImplementation((...args) => {
  if (String(args[0]).includes('react-test-renderer is deprecated')) return;
  originalError(...args);
});
