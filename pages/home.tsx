import { View, Text, TouchableWithoutFeedback, Animated, Dimensions, Alert, Platform, TouchableOpacity, Image } from "react-native";
import FYP from "../components/fyp";
import { Ionicons } from "@expo/vector-icons";
import CommentsComponent from "../components/commentsComponent";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

interface HomeScreenProps {
  navigation: any;
}

// 🚨 Nuevo Tipo para controlar la fuente de datos
type FeedType = 'FOR_YOU' | 'FOLLOWING';

async function getToken() {
  const rawToken = await SecureStore.getItemAsync('accessToken');
  return rawToken ? rawToken.trim() : null;
}

export default function Home({ navigation }: HomeScreenProps) {
  const isFocused = useIsFocused();
  const [visible, setVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null); // 🚨 NUEVO ESTADO
  const [creatorImage, setCreatorImage] = useState<string | null>(null); // Imagen del usuario para el icono de perfil
  const [commentsCount, setCommentsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  // 🚨 Estado para la pestaña activa (por defecto 'Para Ti')
  const [activeTab, setActiveTab] = useState<FeedType>('FOR_YOU'); 

  const fypUpdateLikesRef = useRef<((videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) | null>(null);

  const handleSetFypUpdateLikes = useCallback((func: (videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) => {
    fypUpdateLikesRef.current = func;
  }, []);

  // 🚨 CAMBIO CRÍTICO: Recibe el creatorId
  const handleVideoSelect = useCallback((videoId: string | null, count: number = 0, likes: number = 0, hasLiked: boolean = false, creatorId: string | null = null) => {
    if (selectedVideoId !== videoId) {
      setVisible(false);
      translateY.setValue(height);
    }
    setSelectedVideoId(videoId);
    setCommentsCount(count);
    setLikesCount(likes);
    setUserHasLiked(hasLiked);
    setSelectedCreatorId(creatorId); // 🚨 Guardar el ID del creador
  }, [selectedVideoId, height, translateY]);

  const openComments = useCallback(() => {
    if (!selectedVideoId) return;
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedVideoId, translateY]);

  const closeModal = useCallback(() => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [translateY]);

  const handleLike = async () => {
    if (!selectedVideoId || isLiking || !API_URL) return;
    
    setIsLiking(true);
    const token = await getToken();

    if (!token) {
      Alert.alert("Inicio de Sesión Requerido", "Debes iniciar sesión para dar 'Me Gusta' a un video.");
      setIsLiking(false);
      return;
    }

    const newHasLiked = !userHasLiked;
    const oldLikesCount = likesCount;
    const newLikesCount = newHasLiked ? oldLikesCount + 1 : oldLikesCount - 1;

    setUserHasLiked(newHasLiked);
    setLikesCount(newLikesCount);

    Animated.sequence([
      Animated.spring(scale, {
        toValue: newHasLiked ? 1.2 : 0.9,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await axios.patch(
        `${API_URL}/videos/${selectedVideoId}/like`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (fypUpdateLikesRef.current) {
        fypUpdateLikesRef.current(selectedVideoId, newLikesCount, newHasLiked);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setUserHasLiked(!newHasLiked);
      setLikesCount(oldLikesCount);
      Alert.alert("Error", "No se pudo registrar el 'Me Gusta'. Inténtalo de nuevo.");
    } finally {
      setIsLiking(false);
    }
  }

  // 🚨 Definir la URL del endpoint basándose en la pestaña activa
  const feedUrl = useMemo(() => {
    return activeTab === 'FOR_YOU' 
      ? `${API_URL}/videos/feed` 
      : `${API_URL}/videos/feed/followed`;
  }, [activeTab, API_URL]);

  // 🚨 Función para obtener la imagen del creador
  const fetchCreatorProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setCreatorImage(null);
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const res = await axios.get(`${API_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        const profile = res.data;
        setCreatorImage(profile.imageURl || null);
      }
    } catch (error) {
      console.error("Error fetching creator profile:", error);
      setCreatorImage(null);
    }
  }, []);

  // 🚨 Cada vez que cambia el creatorId, actualizar la imagen
  useEffect(() => {
    fetchCreatorProfile(selectedCreatorId);
  }, [selectedCreatorId, fetchCreatorProfile]);

  return (
    <View className="flex-1">
      <View className="flex-1 bg-gray-900">
        
        {/* Pasar la URL y la pestaña activa a FYP */}
        <FYP 
          key={activeTab} 
          feedUrl={feedUrl}
          feedType={activeTab}
          onVideoSelect={handleVideoSelect}
          onSetFypUpdateLikes={handleSetFypUpdateLikes}
        />

        <View className="absolute top-16 left-0 right-0 z-10" style={{ paddingTop: Platform.OS === 'ios' ? 0 : 10 }}>
          <View className="flex-row justify-center gap-10">
            
            <TouchableOpacity onPress={() => setActiveTab('FOLLOWING')}>
                <Text 
                    className={`text-lg text-white font-bold ${activeTab === 'FOLLOWING' ? 'opacity-100' : 'opacity-60'}`}
                >
                    Siguiendo
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('FOR_YOU')}>
                <Text 
                    className={`text-lg text-white font-bold ${activeTab === 'FOR_YOU' ? 'opacity-100' : 'opacity-60'}`}
                >
                    Para ti
                </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="absolute right-4 bottom-24 gap-6 pb-20">
          
          {/* Profile Button */}
          <View className="items-center">
            <TouchableWithoutFeedback 
              onPress={() => {
                if (selectedCreatorId) {
                  navigation.navigate("UserProfile", { userId: selectedCreatorId });
                } else {
                  Alert.alert("Error", "No se ha seleccionado un video para ver su perfil.");
                }
              }}
            >
              {creatorImage ? (
                <Image
                  source={{ uri: `${creatorImage}?t=${new Date().getTime()}` }} 
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
              ) : (
                <Ionicons name="person-circle-outline" size={34} color="white" />
              )}
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">Perfil</Text>
          </View>

          {/* Like Button */}
          <View className="items-center">
            <TouchableWithoutFeedback onPress={handleLike} disabled={isLiking}>
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons 
                  name={userHasLiked ? "heart" : "heart-outline"} 
                  size={34} 
                  color={userHasLiked ? "red" : "white"} 
                />
              </Animated.View>
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">
              {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}K` : likesCount}
            </Text>
          </View>

          {/* Comments Button */}
          <View className="items-center">
            <TouchableWithoutFeedback onPress={openComments} disabled={!selectedVideoId}>
              <Ionicons
                name="chatbubble-outline"
                size={34}
                color={selectedVideoId ? "white" : "gray"}
              />
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">{commentsCount}</Text>
          </View>
        </View>
      </View>

      {/* Comments Modal */}
      {visible && (
        <View className="absolute inset-0 z-20">
          <TouchableWithoutFeedback onPress={closeModal}>
            <View className="flex-1 bg-black/50" />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              transform: [{ translateY }],
              position: "absolute",
              left: 0,
              right: 0,
              height: "70%",
              bottom: 0,
              backgroundColor: "black",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
          >
            <CommentsComponent
              videoId={selectedVideoId}
              onClose={closeModal}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
