import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
  StyleSheet,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import CommentsComponent from "../components/commentsComponent";
import * as SecureStore from "expo-secure-store";

const { height } = Dimensions.get("window");

interface VideoData {
    id: string;
    url: string;
    description: string;
    likes: number;
    commentsCount: number; 
    creator: {
        handle: string;
        // ...
    };
    // ...
}

export default function VideoFullScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>(); 
  const { video: videoId } = route.params || {};

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});
  
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const [isLiked, setIsLiked] = useState(false); 
  const scale = useRef(new Animated.Value(1)).current;

  // ... (getToken y useEffect para fetchVideoData, que ya están correctos)
  // ... (openComments, closeModal, handleLike, que ya están correctos)

  // -----------------------------------------------------

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      return token;
    } catch (error) {
      console.error("Error obteniendo el token del SecureStore", error);
      return null;
    }
  };


  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId || typeof videoId !== 'string') {
        setError("ID de video no proporcionado o inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = await getToken();
        
        if (!token) {
             setError("Usuario no autenticado.");
             setLoading(false);
             return;
        }

        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/${videoId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const data = response.data;
        
        if (data?.url && typeof data.url === 'string') {
          setVideoData(data);
          // 🚨 Aquí podrías inicializar isLiked si tu backend devuelve si el usuario ya le dio like
        } else {
          throw new Error("URL del video no encontrada o datos incompletos.");
        }
      } catch (err: any) {
        console.error("Error obteniendo el video:", err.response?.data || err.message);
        setError("No se pudo cargar el video. Inténtalo más tarde.");
        Alert.alert("Error de Carga", "No se pudo obtener el video o la URL.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);


  const openComments = useCallback(() => {
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const closeModal = useCallback(() => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [translateY]);

  const handleLike = () => {
    // 🚨 (Lógica de like/unlike al backend)
    if (!isLiked) {
      setIsLiked(true);
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      setIsLiked(false);
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  };
  // -----------------------------------------------------

  if (loading) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-2.5">Obteniendo video...</Text>
      </View>
    );
  }

  if (error || !videoData || !videoData.url) {
    return (
      <View style={styles.fullScreenCenter}>
        <Text className="text-red-500 text-base mb-5">
          {error || "Video no disponible"}
        </Text>
        <TouchableOpacity
          className="p-2.5 bg-gray-800 rounded-lg"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white">Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const shouldPlay = !status.didJustFinish && !visible;
  const { url: videoUrl, likes = 0, commentsCount = 0, creator, description } = videoData;


  return (
    <View style={styles.container}>
      {/* 🚨 CRÍTICO: El contenedor del video envuelve al Video y se le aplica Z-index 0 o bajo */}
      <TouchableWithoutFeedback 
        style={styles.videoWrapper}
        onPress={() => {
          if (videoRef.current && status.isLoaded) {
            status.isPlaying ? videoRef.current.pauseAsync() : videoRef.current.playAsync();
          }
        }}
      >
        <Video
          ref={videoRef}
          style={styles.videoPlayer}
          source={{ uri: videoUrl }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER} 
          isLooping
          shouldPlay={shouldPlay} 
          onPlaybackStatusUpdate={(status) => setStatus(() => status)}
          onError={(e) => console.log("Error en reproducción:", e)}
        />
      </TouchableWithoutFeedback>


      {/* 🚨 CONTENEDOR DE LA INTERFAZ: Usamos 'absolute fill' para posicionar el resto de la UI */}
      <View style={styles.uiOverlay}> 
        
        {/* Botón de volver */}
        <TouchableOpacity
          className="absolute top-12 left-5 z-50 p-2 bg-black/30 rounded-full"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={30} color="white" />
        </TouchableOpacity>

        {/* Información del creador y descripción */}
        <View className="absolute left-4 bottom-12 pb-10 z-10 w-2/3">
            <Text className="text-white font-bold text-lg mb-1">{creator?.handle || '@usuario'}</Text>
            <Text className="text-white text-base">{description}</Text>
        </View>

        {/* Barra de iconos laterales (Likes/Comentarios/Compartir) */}
        <View className="absolute right-4 bottom-12 gap-6 pb-10 z-10">
          
          <View className="items-center">
            <TouchableWithoutFeedback>
              <Ionicons name="person-circle-outline" size={34} color="white" />
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">Perfil</Text>
          </View>

          <View className="items-center">
            <TouchableWithoutFeedback onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale }] }}>
                {isLiked ? (
                  <Ionicons name="heart" size={34} color="red" />
                ) : (
                  <Ionicons name="heart-outline" size={34} color="white" />
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">{likes > 999 ? `${(likes / 1000).toFixed(1)}K` : likes}</Text>
          </View>

          <View className="items-center">
            <TouchableWithoutFeedback onPress={openComments}>
              <Ionicons name="chatbubble-outline" size={34} color="white" />
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">{commentsCount > 999 ? `${(commentsCount / 1000).toFixed(1)}K` : commentsCount}</Text>
          </View>

          <View className="items-center">
            <Ionicons name="share-social-outline" size={34} color="white" />
            <Text className="text-white text-xs">Compartir</Text>
          </View>
        </View>

        {/* Indicador de carga/buffering */}
        {status.isBuffering && (
          <View className="absolute inset-0 justify-center items-center bg-black/30 pointer-events-none">
            <ActivityIndicator size="large" color="white" />
          </View>
        )}

      </View>
      
      {/* Modal de comentarios (DEBE ESTAR FUERA DEL UIOverlay para su propia gestión de Z-index) */}
      {visible && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={styles.modalBackground} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              transform: [{ translateY }],
              ...styles.commentsModal,
            }}
          >
            <CommentsComponent videoId={videoId} onClose={closeModal} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
    },
    fullScreenCenter: {
        flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
    },
    // Contenedor principal del video
    videoWrapper: {
        flex: 1,
        zIndex: 0, // Z-index bajo para que la UI flote encima
    },
    // Componente Video
    videoPlayer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    // 🚨 CRÍTICO: Contenedor para toda la UI flotante
    uiOverlay: {
        ...StyleSheet.absoluteFillObject, // Hace que ocupe todo el espacio y flote encima
        zIndex: 10,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50, // Z-index alto para el modal
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    commentsModal: {
        position: "absolute",
        left: 0,
        right: 0,
        height: "70%",
        bottom: 0,
        backgroundColor: "black",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
    }
});