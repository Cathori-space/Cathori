export default {
  expo: {
    name: "cathori",
    slug: "cathori",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/cathori-icon.png",
    scheme: "cathori",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "site.cathori.cathoriapp",
      googleServicesFile: process.env.GOOGLE_SERVICES_IOS_PLIST ?? "./GoogleService-Info.plist",
      entitlements: {
        "aps-environment": "production"
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/cathori-android-icon-foreground.png",
        backgroundColor: "#00288C"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "site.cathori.cathoriapp",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      versionCode: 1
    },
    web: {
      output: "static",
      favicon: "./assets/images/cathori-favicon.png"
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", {
        image: "./assets/images/cathori-splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" }
      }],
      ["expo-notifications", { color: "#00288C" }],
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      ["expo-build-properties", {
        ios: {
          useFrameworks: "dynamic"
        }
      }],
      "expo-secure-store",
      "expo-font"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "d1bedcf6-bb50-489d-aee8-e43f2cd65f83"
      }
    }
  }
};
