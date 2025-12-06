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
  SafeAreaView,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import CommentsComponent from "../components/commentsComponent";
import * as SecureStore from "expo-secure-store";

const { height, width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 12;

interface VideoData {
    id: string;
    url: string;
    description: string;
    likes: number; 
    commentsCount: number; 
    creator: {
        handle: string;
    };
    isLikedByUser?: boolean; 
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
  
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false); 
  const [isLiking, setIsLiking] = useState(false); 
  const scale = useRef(new Animated.Value(1)).current;

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
          setLocalLikesCount(data.likes || 0);
          setIsLiked(data.isLikedByUser || false); 
        } else {
          throw new Error("URL del video no encontrada o datos incompletos.");
        }
      } catch (err: any) {
        console.error("Error obteniendo el video:", err.response?.data || err.message);
        setError("No se pudo cargar el video. Inténtalo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);


  const openComments = useCallback(() => {
    // Si el video está reproduciéndose, pausarlo al abrir el modal
    if (videoRef.current && status.isPlaying) {
        videoRef.current.pauseAsync();
    }

    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [translateY, status.isPlaying]);

  const closeModal = useCallback(() => {
    // Reanudar la reproducción al cerrar el modal
    if (videoRef.current && !status.isPlaying && status.positionMillis > 0) {
        videoRef.current.playAsync();
    }
    
    Animated.timing(translateY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [translateY, status.isPlaying, status.positionMillis]);

  const handleLike = async () => {
    if (isLiking || !videoId) return;

    setIsLiking(true);
    const token = await getToken();

    if (!token) {
        Alert.alert("Acceso denegado", "Debes iniciar sesión para dar 'Me Gusta'.");
        setIsLiking(false);
        return;
    }

    const newIsLiked = !isLiked;
    const oldLikesCount = localLikesCount;
    const newLikesCount = newIsLiked ? oldLikesCount + 1 : oldLikesCount - 1;

    // 🚨 Optimistic UI Update: Esto hace que el corazón se ponga rojo inmediatamente.
    setIsLiked(newIsLiked);
    setLocalLikesCount(newLikesCount);

    // Animación de Like
    Animated.sequence([
      Animated.spring(scale, {
        toValue: newIsLiked ? 1.3 : 1.0,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.0,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    try {
        // 🚨 CRÍTICO: Asegurarse de que el endpoint no devuelve un error silencioso o 204 No Content
        const apiResponse = await axios.patch(
            `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/${videoId}/like`,
            {},
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log("Like API response status:", apiResponse.status);
        
    } catch (err: any) {
        // 🚨 CRÍTICO: Registramos el error de la respuesta HTTP
        console.error("Error al registrar el like:", err.response?.status, err.response?.data || err.message);
        Alert.alert("Error", "No se pudo registrar el 'Me Gusta'.");
        
        // 🚨 Revertir el estado
        setIsLiked(!newIsLiked); 
        setLocalLikesCount(oldLikesCount);
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } finally {
        setIsLiking(false);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current || !status.isLoaded) return;

    if (status.isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
  };


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
  const { url: videoUrl, creator, description } = videoData;
  const commentsCount = videoData.commentsCount || 0;


  return (
    <View style={styles.container}>
      {/* 1. REPRODUCTOR DE VIDEO */}
      <TouchableWithoutFeedback 
        // 🚨 CRÍTICO: Usamos 'containerPressable' para asegurar que cubra toda la pantalla
        style={styles.containerPressable} 
        onPress={togglePlayPause}
      >
        <Video
          ref={videoRef}
          // El video debe cubrir todo el espacio
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


      {/* 2. CAPA DE SUPERPOSICIÓN DE LA UI (UIOverlay) */}
      <View style={styles.uiOverlay} pointerEvents="box-none"> 
        
        {/* Botón de volver */}
        <SafeAreaView style={styles.backButtonContainer}>
             <TouchableOpacity
                className="p-2 bg-black/30 rounded-full"
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="chevron-back" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>


        {/* INFORMACIÓN DEL CREADOR Y DESCRIPCIÓN (Parte inferior izquierda) */}
        <View style={styles.contentContainerLeft}> 
            <Text className="text-white font-bold text-lg mb-1">{creator?.handle || '@usuario'}</Text>
            <Text className="text-white text-base">{description}</Text>
        </View>

        {/* BARRA DE ICONOS LATERALES (Parte inferior derecha, vertical) */}
        <View style={styles.iconsContainerRight}> 
          
          <View style={styles.iconItem}>
            {/* 🚨 Botón de Like */}
            <TouchableWithoutFeedback onPress={handleLike} disabled={isLiking}>
              <Animated.View style={{ transform: [{ scale }] }}>
                {isLiked ? (
                  <Ionicons name="heart" size={34} color="red" />
                ) : (
                  <Ionicons name="heart-outline" size={34} color="white" />
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">{localLikesCount > 999 ? `${(localLikesCount / 1000).toFixed(1)}K` : localLikesCount}</Text>
          </View>

          <View style={styles.iconItem}>
            <TouchableWithoutFeedback onPress={openComments}>
              <Ionicons name="chatbubble-outline" size={34} color="white" />
            </TouchableWithoutFeedback>
            <Text className="text-white text-xs">{commentsCount > 999 ? `${(commentsCount / 1000).toFixed(1)}K` : commentsCount}</Text>
          </View>

          <View style={styles.iconItem}>
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
        
        {/* Indicador de Pausa/Reproducción */}
        {!status.isPlaying && !status.didJustFinish && !loading && !status.isBuffering && (
            <View style={styles.playPauseIndicator}>
                 <Ionicons name="play" size={80} color="white" style={{ opacity: 0.6 }} />
            </View>
        )}

      </View>
      
      {/* 3. MODAL DE COMENTARIOS */}
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
    // 🚨 CRÍTICO: Nuevo estilo para asegurar que el Touchable cubra todo
    containerPressable: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5, // Asegura que esté por encima del video
    },
    videoPlayer: {
        // Asegura que ocupe todo el espacio
        width: width,
        height: height,
        position: 'absolute',
        zIndex: 1, // El video está detrás del Pressable
    },
    uiOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10, // La capa de UI está sobre el Pressable
        paddingBottom: 90, 
    },
    playPauseIndicator: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 11,
        pointerEvents: 'none',
    },
    backButtonContainer: {
        position: 'absolute',
        top: 0,
        left: HORIZONTAL_PADDING,
        zIndex: 50,
    },
    contentContainerLeft: {
        position: 'absolute',
        left: HORIZONTAL_PADDING,
        bottom: 0, 
        width: width * 0.65,
        zIndex: 10,
        paddingBottom: 100,
    },
    iconsContainerRight: {
        position: 'absolute',
        right: HORIZONTAL_PADDING,
        bottom: 0, 
        gap: 24,
        alignItems: 'center',
        zIndex: 10,
        paddingBottom: 250,
    },
    iconItem: {
        alignItems: 'center',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
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