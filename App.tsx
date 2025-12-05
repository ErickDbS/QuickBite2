import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import "./global.css";
import Landing from "./pages/landing";
import BottomTap from "./navigation/bottomTap";
import UserProfile from "./pages/userProfile";
import Settings from "./components/settings";
import SettingsPage from "./pages/settings";
import VideoGrid from "./components/videoGrid";
import VideoPreviewScreen from "./pages/videoPreviewScreen";
import UploadVideoScreen from "./pages/uploadVideoScreen";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import VideoFullScreen from "./components/VideoFullScreen";
const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          // Configuramos el interceptor para agregar el token a las peticiones que no sean de login, registro o feed
          axios.interceptors.request.use((config) => {
            const publicUrls = [
              "/auth/login",
              "/auth/register",
              "/videos/feed",
            ];

            // Si la URL NO está en la lista de públicas, agregamos el token
            const isPublicUrl = publicUrls.some((url) =>
              config.url?.includes(url)
            );
            if (!isPublicUrl) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
          });

          setIsAuthenticated(true);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "BottomTap" : "Landing"}
      >
        <Stack.Screen
          name="Landing"
          options={{ headerShown: false }}
          component={Landing}
        />
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}
          component={Login}
        />
        <Stack.Screen
          name="Register"
          options={{ headerShown: false }}
          component={Register}
        />
        <Stack.Screen
          name="BottomTap"
          options={{ headerShown: false }}
          component={BottomTap}
        />

        <Stack.Screen
          name="UserProfile"
          options={{ headerShown: false }}
          component={UserProfile}
        />
        <Stack.Screen
          name="SettingsPage"
          options={{ headerShown: false }}
          component={SettingsPage}
        />
        <Stack.Screen
          name="VideoGrid"
          options={{ headerShown: false }}
          component={VideoGrid}
        />
        <Stack.Screen
          name="Preview"
          options={{ headerShown: false }}
          component={VideoPreviewScreen}
        />
        <Stack.Screen
          name="Upload"
          options={{ headerShown: false }}
          component={UploadVideoScreen}
        />

        <Stack.Screen
          name="VideoFullScreen"
          options={{ headerShown: false }}
          component={VideoFullScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
