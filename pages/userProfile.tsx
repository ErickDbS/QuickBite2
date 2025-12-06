// screens/UserProfile.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Image } from "react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import VideoGrid from "../components/videoGrid"; 
import FollowListModal from "../components/followModal"; // Importación del modal

const userImgPlaceholder = require("../assets/user.png"); 
const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
const { height } = Dimensions.get("window");

// Interfaz para tipado del usuario externo
interface ExternalUser {
  id: string;
  alias: string;
  handle: string;
  description: string;
  image: string | null;
  followingCount: number;
  followersCount: number;
  likes: number; 
  videos: any[]; 
}

// Interfaz para los parámetros de la ruta
interface UserProfileRouteParams {
  userId: string; 
}

export default function UserProfile({ navigation }: any) {
  const route = useRoute();
  const { userId } = route.params as UserProfileRouteParams;
  
  const [user, setUser] = useState<ExternalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false); 
  const [isFollowToggling, setIsFollowToggling] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'following' | 'followers'>('following');

  const getToken = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      return token;
    } catch (error) {
      console.error("Error obteniendo el token del SecureStore", error);
      return null;
    }
  }, []);

  // Función interna para verificar el estado de seguimiento (persistencia)
  const checkFollowStatus = useCallback(async (token: string, targetUserId: string) => {
    try {
      const res = await axios.get(`${API_URL}/user/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const followedUsers = res.data; 
      
      // Asumiendo que res.data es un array de usuarios seguidos (a pesar de la captura de API)
      if (Array.isArray(followedUsers)) {
        const isCurrentlyFollowing = followedUsers.some(
          (followedUser: any) => followedUser.id === targetUserId
        );
        setIsFollowing(isCurrentlyFollowing);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
      setIsFollowing(false);
    }
  }, [API_URL]);


  const getUserProfile = useCallback(async () => {
    if (!userId) {
      Alert.alert("Error", "ID de usuario no proporcionado.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        Alert.alert("Acceso", "Debes iniciar sesión para ver perfiles.");
        setLoading(false);
        return;
      }
      
      const profileRequest = axios.get(`${API_URL}/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
      });
      const checkStatusPromise = checkFollowStatus(token, userId);

      const [profileRes] = await Promise.all([
         profileRequest, 
         checkStatusPromise 
      ]);

      if (profileRes.status === 200 || profileRes.status === 201) {
        const userData: ExternalUser = profileRes.data;
        setUser(userData);
      } else {
        throw new Error("Failed to load user profile");
      }
    } catch (error) {
      console.error("Error fetching user profile or follow status:", error);
      Alert.alert("Error de Carga", "No se pudo cargar la información completa del perfil.");
    } finally {
      setLoading(false);
    }
  }, [userId, getToken, checkFollowStatus, API_URL]);

  useEffect(() => {
    getUserProfile();
  }, [getUserProfile]); 

  const handleFollowToggle = async () => {
    if (!user || loading || isFollowToggling) return;

    const token = await getToken();
    if (!token) {
      Alert.alert("Acceso", "Debes iniciar sesión para seguir a un usuario.");
      return;
    }

    setIsFollowToggling(true);
    const newIsFollowing = !isFollowing;
    const action = newIsFollowing ? 'seguir' : 'dejar de seguir';
    
    setIsFollowing(newIsFollowing);
    setUser(prev => prev ? {
        ...prev,
        followersCount: newIsFollowing ? prev.followersCount + 1 : prev.followersCount - 1,
    } : null);

    try {
        await axios.post(`${API_URL}/user/${userId}/follow`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
    } catch (error) {
        console.error(`Error al ${action} al usuario:`, error);
        Alert.alert("Error", `No se pudo ${action} al usuario.`);
        
        setIsFollowing(!newIsFollowing);
        setUser(prev => prev ? {
            ...prev,
            followersCount: newIsFollowing ? prev.followersCount - 1 : prev.followersCount + 1,
        } : null);
    } finally {
        setIsFollowToggling(false);
    }
  };

  const handleOpenModal = (type: 'following' | 'followers') => {
    setModalType(type);
    setIsModalVisible(true);
  };
  
  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-2">Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-red-500">Usuario no encontrado o error de carga.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 p-2 bg-gray-700 rounded-md">
            <Text className="text-white">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 bg-gray-900">
        
        <SafeAreaView className="absolute top-0 left-0 right-0 z-10 bg-gray-900 pt-8">
            <View className="flex-row justify-center items-center p-2">
                <TouchableOpacity onPress={() => navigation.goBack()} className="absolute left-4">
                    <Ionicons name="chevron-back" size={30} color="white" />
                </TouchableOpacity>
                <Text className="text-lg text-white font-bold">
                    {user?.alias || "Perfil"}
                </Text>
            </View>
        </SafeAreaView>

        <View className="flex-1 pt-20 mt-20">
          <View>
            <Image 
                className="w-24 h-24 rounded-full mx-auto bg-slate-700" 
                source={user.image ? { uri: user.image } : userImgPlaceholder} 
            />
            <Text className="text-white text-center pt-4 italic">
              {user?.handle}
            </Text>
          </View>

          {/* Estadísticas */}
          <View className="flex-row justify-center gap-6 pt-4">
            
            <TouchableOpacity 
              className="flex-col items-center" 
              onPress={() => handleOpenModal('following')}
            >
              <Text className="text-white font-bold">{user?.followingCount}</Text>
              <Text className="text-white">Seguidos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-col items-center" 
              onPress={() => handleOpenModal('followers')}
            >
              <Text className="text-white font-bold">{user?.followersCount}</Text>
              <Text className="text-white">Seguidores</Text>
            </TouchableOpacity>
            
            <View className="flex-col items-center">
              <Text className="text-white font-bold">{user?.likes}</Text>
              <Text className="text-white">Me gusta</Text>
            </View>
          </View>

          {/* Botones de Interacción (Seguir) */}
          <View className="flex-row justify-center gap-2 pt-4">
            
            <TouchableOpacity onPress={handleFollowToggle} disabled={isFollowToggling}>
              <Text className={`text-white text-md rounded-lg p-3 font-bold w-[8rem] text-center ${isFollowing ? 'bg-gray-600' : 'bg-red-600'}`}>
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text className="text-white text-md bg-gray-600 rounded-lg p-3 font-bold w-[3rem] text-center">
                <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color="white" />
              </Text>
            </TouchableOpacity>
          </View>

          {/* Descripción */}
          <View className="items-center pt-6 px-4">
            <Text className="text-white text-center">
              {user?.description || "Este usuario aún no tiene descripción."}
            </Text>
          </View>
          
          {/* Título de Videos */}
          <View className="items-center pt-4">
            <Text className="text-white text-center text-md font-bold">
              Videos de {user?.alias}
            </Text>
          </View>

          {/* Grid de Videos */}
          <View className="pt-4">
            {user?.videos?.length > 0 ? (
                <VideoGrid videos={user.videos} navigation={navigation} />
            ) : (
                <View className="flex-1 justify-center items-center mt-10" style={{ minHeight: height / 2 }}>
                    <Text className="text-white text-lg opacity-70">
                        {user.alias} no ha subido videos aún.
                    </Text>
                </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 🚨 Corrección de Anidación: Renderizar solo si es visible */}
      {isModalVisible && (
          <FollowListModal
              isVisible={true} // Siempre true, el padre controla la existencia
              onClose={() => setIsModalVisible(false)}
              type={modalType}
              userId={userId} 
              navigation={navigation}
          />
      )}
    </View>
  );
}