import { View, Text, TouchableWithoutFeedback, Animated, Dimensions, Alert } from "react-native";
import FYP from "../components/fyp";
import { Ionicons } from "@expo/vector-icons";
import CommentsComponent from "../components/commentsComponent";
import { useRef, useState, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const { height } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

interface HomeScreenProps {
  navigation: any;
}

async function getToken() {
  const rawToken = await SecureStore.getItemAsync('accessToken');
  return rawToken ? rawToken.trim() : null;
}

export default function Home({ navigation }: HomeScreenProps) {
  const isFocused = useIsFocused();
  const [visible, setVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [commentsCount, setCommentsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const fypUpdateLikesRef = useRef<((videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) | null>(null);

  const handleSetFypUpdateLikes = useCallback((func: (videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) => {
    fypUpdateLikesRef.current = func;
  }, []);

  const handleVideoSelect = useCallback((videoId: string | null, count: number = 0, likes: number = 0, hasLiked: boolean = false) => {
    if (selectedVideoId !== videoId) {
      setVisible(false);
      translateY.setValue(height);
    }
    setSelectedVideoId(videoId);
    setCommentsCount(count);
    setLikesCount(likes);
    setUserHasLiked(hasLiked);
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

    // Optimistic update
    const newHasLiked = !userHasLiked;
    const oldLikesCount = likesCount;
    const newLikesCount = newHasLiked ? oldLikesCount + 1 : oldLikesCount - 1;

    setUserHasLiked(newHasLiked);
    setLikesCount(newLikesCount);

    // Animation
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
      // Rollback on error
      setUserHasLiked(!newHasLiked);
      setLikesCount(oldLikesCount);
      Alert.alert("Error", "No se pudo registrar el 'Me Gusta'. Inténtalo de nuevo.");
    } finally {
      setIsLiking(false);
    }
  }

  return (
    <View className="flex-1">
      <View className="flex-1 bg-gray-900">
        <FYP 
          onVideoSelect={handleVideoSelect} 
          onSetFypUpdateLikes={handleSetFypUpdateLikes}
        />

        <View className="absolute top-16 left-0 right-0 z-10">
          <View className="flex-row justify-center gap-20">
            <Text className="text-lg text-white font-bold">Siguiendo</Text>
            <Text className="text-lg text-white font-bold">Para ti</Text>
          </View>
        </View>

        <View className="absolute right-4 bottom-24 gap-6 pb-20">
          {/* Profile Button */}
          <View className="items-center">
            <TouchableWithoutFeedback onPress={() => navigation.navigate("UserProfile")}>
              <Ionicons name="person-circle-outline" size={34} color="white" />
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

          {/* Share Button */}
          <View className="items-center">
            <Ionicons name="share-social-outline" size={34} color="white" />
            <Text className="text-white text-xs">Compartir</Text>
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