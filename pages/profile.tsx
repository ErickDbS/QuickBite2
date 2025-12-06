// screens/Profile.tsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Settings from "../components/settings";
import VideoGrid from "../components/videoGrid";
import FollowListModal from "../components/followModal";
import axios from "axios";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native"; // Importar useFocusEffect

const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
const userImgPlaceholder = require("../assets/user.png");

export default function Profile({ navigation }: any) {
  const { height } = Dimensions.get("window");
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'following' | 'followers'>('following');
  
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState(true);

  // Función para obtener el token
  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      return token;
    } catch (error) {
      console.error("Error obteniendo el token del SecureStore", error);
      return null;
    }
  };

  const handleOpenModal = (type: 'following' | 'followers') => {
    setModalType(type);
    setIsModalVisible(true);
  };
  
  const openSettingsModal = () => {
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSettingsModal = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };
  
  // 🚨 REFACTORIZACIÓN CLAVE: getMyProfile ahora es más simple
  // Le pasaremos un argumento `showLoading` para controlar el spinner.
  const getMyProfile = useCallback(async (showLoading: boolean = true) => {
    
    // 1. Mostrar spinner solo en la carga inicial o si se especifica
    if (showLoading && !user) setLoading(true); 

    try {
      const token = await getToken();

      if (!token) {
        console.error("No hay token, el usuario no está autenticado");
        return;
      }

      const res = await axios.get(
        `${API_URL}/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 200 || res.status === 201) {
        setUser(res.data);
      }
    } catch (error) {
      console.error("Error en la petición:", error);
    } finally {
      setLoading(false);
    }
  // 🚨 Dependencia simple: Solo de la API
  }, [API_URL]); 

  // 🚨 CORRECCIÓN: Usamos useFocusEffect para recargar al volver
  useFocusEffect(
    useCallback(() => {
      // 1. Cargar el perfil. Le pasamos 'false' para que no muestre el spinner
      //    si ya tenemos datos, logrando una actualización 'silenciosa' o rápida.
      getMyProfile(false); 
      
      // Retornamos una función de limpieza si fuera necesario
      return () => {};
      
    // 🚨 Dependencia de getMyProfile.
    }, [getMyProfile]) 
  ); 
  
  // ---

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
          <Text className="text-red-500">Error: No se pudo cargar la información del usuario.</Text>
        </View>
      );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 bg-gray-900">
        <View className="absolute top-0 left-0 right-0 pt-16">
          <View className="flex-row justify-center items-center bg-gray-900 p-4">
            <Text className="text-lg text-white font-bold">{user?.alias}</Text>
            <View className="absolute right-4">
              <TouchableOpacity onPress={openSettingsModal}>
                <Ionicons name="options-outline" size={24} color={"white"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="flex-1 pt-20 mt-20">
          <View>
            <Image
              className="w-24 h-24 rounded-full mx-auto bg-slate-700"
              source={user.image ? { uri: user.image } : userImgPlaceholder}
            />
            <Text className="text-white text-center pt-4 italic">@{user?.handle}</Text>
          </View>

          {/* Estadísticas */}
          <View className="flex-row justify-center gap-6 pt-4">
            
            <TouchableOpacity 
              className="flex-col items-center"
              onPress={() => handleOpenModal('following')}
            >
              <Text className="text-white font-bold">
                {user?.followingCount}
              </Text>
              <Text className="text-white">Seguidos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-col items-center"
              onPress={() => handleOpenModal('followers')}
            >
              <Text className="text-white font-bold">
                {user?.followersCount}
              </Text>
              <Text className="text-white">Seguidores</Text>
            </TouchableOpacity>
            
            <View className="flex-col items-center">
              <Text className="text-white font-bold">{user?.likes}</Text>
              <Text className="text-white">Me gusta</Text>
            </View>
          </View>

          <View className="flex-row justify-center gap-1 pt-4">
            <View>
              <TouchableOpacity>
                <Text className="text-white text-md bg-green-600 rounded-lg p-3 font-bold w-[8rem] text-center">
                  Editar Perfil
                </Text>
              </TouchableOpacity>
            </View>
            <View>
              <TouchableOpacity
                onPress={() => navigation.navigate("VideoGrid")}
              >
                <Text className="text-white text-md bg-gray-600 rounded-lg p-2 font-bold w-[3rem] text-center">
                  <FontAwesome name="heart" size={22} color="white" />
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="items-center pt-4">
            <Text className="text-white text-center text-md font-bold">
              Mis videos
            </Text>
          </View>
        </View>
        <View className="pt-4">
          {user?.videos?.length > 0 ? (
            <VideoGrid videos={user?.videos} navigation={navigation} />
          ) : (
            <View className="flex-1 justify-center items-center mt-10">
              <Text className="text-white text-lg">
                No ha subido videos aún.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Configuración (Settings) */}
      {visible && (
        <View className="absolute inset-0">
          <TouchableWithoutFeedback onPress={closeSettingsModal}>
            <View className="flex-1 bg-black/50" />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              transform: [{ translateY }],
              position: "absolute",
              left: 0,
              right: 0,
              height: height / 3,
              bottom: 0,
              backgroundColor: "black",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
          >
            <Settings navigation={navigation} />
          </Animated.View>
        </View>
      )}
      
      {/* Modal de Seguidores/Seguidos (FollowListModal) */}
      {isModalVisible && (
          <FollowListModal
              isVisible={true}
              onClose={() => setIsModalVisible(false)}
              type={modalType}
              userId={user?.id}
              navigation={navigation}
          />
      )}
    </View>
  );
}