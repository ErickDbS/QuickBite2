import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import CommentsComponent from "../components/commentsComponent";

const { height } = Dimensions.get("window");

export default function VideoFullScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const { video: videoId } = route.params || {};

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<any>({});

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const [like, setLike] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchVideoUrl = async () => {
      if (!videoId) {
        setError("ID de video no proporcionado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/${videoId}`
        );

        if (response.data && response.data.url) {
          setVideoUrl(response.data.url);
        } else {
          setVideoUrl(typeof response.data === "string" ? response.data : null);
          if (!response.data)
            throw new Error("URL no encontrada en la respuesta");
        }
      } catch (err) {
        console.error("Error obteniendo el video:", err);
        setError("No se pudo cargar el video.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoUrl();
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
    if (!like) {
      setLike(true);
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setLike(false);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-2.5">Obteniendo video...</Text>
      </View>
    );
  }

  if (error || !videoUrl) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
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

  return (
    <View className="flex-1 bg-black justify-center items-center relative">
      <Video
        ref={videoRef}
        className="w-full h-full"
        source={{ uri: videoUrl }}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
        onPlaybackStatusUpdate={(status) => setStatus(() => status)}
        onError={(e) => console.log("Error en reproducción:", e)}
      />

      <TouchableOpacity
        className="absolute top-12 left-5 z-50 p-2 bg-black/30 rounded-full"
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={30} color="white" />
      </TouchableOpacity>

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
              {like ? (
                <Ionicons name="heart" size={34} color="red" />
              ) : (
                <Ionicons name="heart-outline" size={34} color="white" />
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
          <Text className="text-white text-xs">123K</Text>
        </View>

        <View className="items-center">
          <TouchableWithoutFeedback onPress={openComments}>
            <Ionicons name="chatbubble-outline" size={34} color="white" />
          </TouchableWithoutFeedback>
          <Text className="text-white text-xs">456</Text>
        </View>

        <View className="items-center">
          <Ionicons name="share-social-outline" size={34} color="white" />
          <Text className="text-white text-xs">Compartir</Text>
        </View>
      </View>

      {status.isBuffering && (
        <View className="absolute inset-0 justify-center items-center bg-black/30 pointer-events-none">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

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
            <CommentsComponent videoId={videoId} onClose={closeModal} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
