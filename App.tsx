import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import "./global.css";
import Landing from "./pages/landing";
import BottomTap from "./navigation/bottomTap";
import UserProfile from "./pages/userProfile";
import SettingsPage from "./pages/settings";
import VideoGrid from "./components/videoGrid";
import VideoPreviewScreen from "./pages/videoPreviewScreen";
import UploadVideoScreen from "./pages/uploadVideoScreen";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import * as Notifications from 'expo-notifications';

const Stack = createNativeStackNavigator();
const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

// Variable para evitar bucles de refresco
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: Error) => void; }[] = [];

// Función para procesar la cola de peticiones fallidas
const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * Función para renovar el Access Token usando el Refresh Token
 * @returns {Promise<string | null>}
 */
const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
    
    if (!refreshToken || !API_URL) return null;

    try {
        // 🚨 CAMBIO DE RUTA: DEBE SER /auth/refreshToken
        const response = await axios.post(`${API_URL}/auth/refreshToken`, { 
            refreshToken: refreshToken 
        });

        // La API devuelve 200 OK. Procesamos los nuevos tokens.
        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken; // Capturar el nuevo RT (si lo hay)
        
        await SecureStore.setItemAsync('accessToken', newAccessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken || refreshToken);

        return newAccessToken;
    } catch (e) {
        console.error("Fallo al renovar el token:", e);
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return null;
    }
}


/**
 * Configura los interceptores de Axios (Request y Response)
 */
const setupAxiosInterceptors = (setAuthStatus: (status: boolean) => void) => {
    
    // 1. INTERCEPTOR DE REQUEST: Adjunta el accessToken
    axios.interceptors.request.use(async (config) => {
        const publicUrls = [
            '/auth/login',
            '/auth/register',
            '/videos/feed'
        ];
        
        // Si la URL NO está en la lista de públicas, agregamos el token
        const isPublicUrl = publicUrls.some(url => config.url?.includes(url));
        if (!isPublicUrl) {
            const token = await SecureStore.getItemAsync('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    });

    // 2. INTERCEPTOR DE RESPONSE: Maneja la expiración del token (401)
    axios.interceptors.response.use(
        (response: AxiosResponse) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
            
            // Si no es 401, o si ya se reintentó, o si es una URL pública (login/refresh), devolvemos el error
            if (error.response?.status !== 401 || originalRequest._retry || !originalRequest.url || originalRequest.url.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            // Marcamos la petición como reintentada
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                
                // Intenta refrescar el token
                const newAccessToken = await refreshAccessToken();
                
                if (newAccessToken) {
                    // Refresco exitoso, actualizamos la cola de fallos y el estado
                    processQueue(null, newAccessToken);
                    isRefreshing = false;
                    setAuthStatus(true);
                    
                    // Reintentamos la petición original
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return axios(originalRequest);
                } else {
                    // Refresco fallido (refresh token no válido o expirado)
                    processQueue(new Error('Refresh failed, tokens cleared.'));
                    isRefreshing = false;
                    setAuthStatus(false); // Forzar cierre de sesión
                    return Promise.reject(error);
                }
            }
            
            // Si ya se está refrescando, agregamos la petición fallida a la cola
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve: (token) => {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    resolve(axios(originalRequest));
                }, reject });
            });
        }
    );
};


export default function App() {
    const [ready, setReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Función para verificar la validez del token al inicio
    const checkAuthenticationStatus = useCallback(async () => {
        setReady(false);
        const token = await SecureStore.getItemAsync('accessToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!token || !refreshToken) {
            // No hay tokens, forzamos no autenticado
            setIsAuthenticated(false);
            setReady(true);
            return;
        }

        // Intenta hacer una llamada simple autenticada para validar el token
        try {
            // Ejemplo de endpoint que requiere autenticación
            await axios.get(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Token es válido
            setIsAuthenticated(true);
        } catch (e: any) {
            if (e.response?.status === 401) {
                // Token expirado, intentamos renovarlo (solo si no es el interceptor el que está activo)
                console.log("Access Token expirado al inicio, intentando renovación...");
                const newToken = await refreshAccessToken();
                setIsAuthenticated(!!newToken);
            } else {
                // Otro error (ej: red o API no disponible)
                 console.error("Error al validar token de acceso:", e.message);
                setIsAuthenticated(false);
            }
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => {
        // Configuramos interceptores tan pronto como se monta la app
        setupAxiosInterceptors(setIsAuthenticated);
        
        // Verificamos el estado de autenticación (validez del token)
        checkAuthenticationStatus();
    }, [checkAuthenticationStatus]);

    if (!ready) return null; // Muestra un Splash Screen o similar mientras se verifica el token

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName={isAuthenticated ? "BottomTap" : "Landing"}>
                {/* ... el resto de tus pantallas ... */}
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
                    options={{ headerShown: false}}
                    component={UserProfile}
                />
                <Stack.Screen
                    name="SettingsPage"
                    options={{headerShown: false}}
                    component={SettingsPage}
                />
                <Stack.Screen
                    name="VideoGrid"
                    options={{headerShown: false}}
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
            </Stack.Navigator>
        </NavigationContainer>
    );
}