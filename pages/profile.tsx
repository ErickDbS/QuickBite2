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
  Alert,
} from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Settings from "../components/settings";
import VideoGrid from "../components/videoGrid";
import FollowListModal from "../components/followModal";
import axios from "axios";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native"; 
import * as ImagePicker from 'expo-image-picker'; 

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
  const [isUploading, setIsUploading] = useState(false); 
  const [imageVersion, setImageVersion] = useState(0);

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
  
  const getMyProfile = useCallback(async (showLoading: boolean = true) => {
    if (showLoading && !user) setLoading(true); 

    try {
      const token = await getToken();
      if (!token) return;

      const res = await axios.get(
        `${API_URL}/user`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 200 || res.status === 201) {
        const profile = res.data;

        const totalLikes = profile.videos?.reduce(
          (sum: number, vid: any) => sum + (vid.likes || 0),
          0
        ) || 0;

        profile.likes = totalLikes; 
        setUser(profile);
      }

    } catch (error) {
      console.error("Error en la petición:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, user]); 

  const changeProfilePhoto = async (imageUri: string) => {
    setIsUploading(true);
    try {
        const token = await getToken();
        if (!token) {
            Alert.alert("Error", "No estás autenticado.");
            return;
        }

        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            name: `profile-${user.id}-${Date.now()}.jpg`,
            type: 'image/jpeg', 
        } as any);

        const res = await axios.post(
            `${API_URL}/user/change-photo`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        if (res.status === 200) {
          console.log('datos del usuario: ', res.data)
            const newImageUri = res.data.imageURl; // ✅ usar la propiedad correcta
              setUser((prevUser: any) => ({
                ...prevUser,
                imageURl: newImageUri,
              }));

            setImageVersion(prev => prev + 1); // forzar re-render
            Alert.alert("Éxito", "La foto de perfil ha sido actualizada.");
        } else {
             Alert.alert("Error", "No se pudo actualizar la foto de perfil.");
        }

    } catch (error) {
        console.error("Error al subir la imagen:", error);
        Alert.alert("Error", "Ocurrió un error al intentar subir la foto.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleImagePick = async () => {
    if (isUploading) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitas otorgar permiso para acceder a la galería.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      changeProfilePhoto(selectedUri);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getMyProfile(false); 
    }, [getMyProfile]) 
  ); 
  
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
          <TouchableOpacity
            className="w-24 h-24 mx-auto relative" 
            onPress={handleImagePick}
            disabled={isUploading}
          >
              <Image
                key={imageVersion} 
                className="w-24 h-24 rounded-full bg-slate-700"
                source={user.imageURl ? { uri: user.imageURl } : userImgPlaceholder}
              />

            <View className="absolute bottom-0 right-0 p-1 bg-red-500 rounded-full border-2 border-gray-900">
              {isUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <FontAwesome name="pencil" size={12} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <Text className="text-white text-center pt-4 italic">{user?.handle}</Text>

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
