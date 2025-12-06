import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  TouchableOpacity
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const { height, width } = Dimensions.get("window");

interface VideoItem {
  id: string;
  url: string; 
  commentsCount: number;
  likesCount: number;
  userHasLiked: boolean;
  // Asumimos que creator tiene una propiedad 'id' para el perfil
  creator?: { id: string; handle: string; [key: string]: any }; 
  description: string;
  [key: string]: any;
}

interface FYPProps {
  // 🚨 CAMBIO CRÍTICO: Añadido creatorId como quinto parámetro
  onVideoSelect?: (videoId: string | null, commentsCount: number, likesCount: number, userHasLiked: boolean, creatorId: string | null) => void; 
  onSetFypUpdateLikes?: (func: (videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) => void;
  feedUrl: string; 
  feedType: 'FOR_YOU' | 'FOLLOWING'; 
}

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 300,
};

async function getToken() {
  const rawToken = await SecureStore.getItemAsync('accessToken');
  return rawToken ? rawToken.trim() : null;
}

export default function FYP({ onVideoSelect, onSetFypUpdateLikes, feedUrl, feedType }: FYPProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<(Video | null)[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const isFocused = useIsFocused();
  const [data, setData] = useState<VideoItem[]>([]);
  const dataRef = useRef<VideoItem[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const BACKGROUND_REFRESH_MS = 30000;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🚨 CORRECCIÓN CLAVE 1: Mapeo de datos (asegurar URL y userHasLiked)
  const mapVideoData = (item: any): VideoItem => ({
    id: item.id,
    url: item.url || item.videoUrl || '', 
    commentsCount: item.commentsCount || 0,
    likesCount: item.likesCount || item.likes || 0, 
    userHasLiked: item.isLiked === true, 
    creator: item.creator,
    description: item.description || '',
  });

  const updateVideoLikesInternal = useCallback((videoId: string, newLikesCount: number, newUserHasLiked: boolean) => {
    setData(prevData =>
      prevData.map(video => {
        if (video.id === videoId) {
          return {
            ...video,
            likesCount: newLikesCount,
            userHasLiked: newUserHasLiked,
          };
        }
        return video;
      })
    );
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (onSetFypUpdateLikes) {
      onSetFypUpdateLikes(updateVideoLikesInternal);
    }
  }, [onSetFypUpdateLikes, updateVideoLikesInternal]);

  const getAxiosConfig = useCallback(async () => {
    if (feedType === 'FOLLOWING') {
        const token = await getToken();
        if (!token) {
            setLoadError("Debes iniciar sesión para ver contenido de 'Siguiendo'");
            return {
                headers: {},
                authRequired: true,
                tokenMissing: true,
            };
        }
        return {
            headers: { 'Authorization': `Bearer ${token}` },
            authRequired: true,
            tokenMissing: false,
        };
    }
    return { 
        headers: {}, 
        authRequired: false,
        tokenMissing: false,
    };
  }, [feedType]);


  const loadMore = useCallback(async (isInitialLoad = false) => {
    if ((!isInitialLoad && !hasMore) || loadingMore || refreshing) return;

    const config = await getAxiosConfig();
    if (config.tokenMissing) {
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
    }

    setLoadError(null);
    isInitialLoad && data.length === 0 ? setLoadingInitial(true) : setLoadingMore(true);

    try {
      const res = await axios.get(feedUrl, {
        params: { page: isInitialLoad ? 0 : page, size: PAGE_SIZE },
        headers: config.headers,
      });

      const items: VideoItem[] = Array.isArray(res.data) ? res.data.map(mapVideoData) : [];
      const startingPage = isInitialLoad ? 1 : page + 1;

      setData(prev => {
        const newItems = items.filter((i: any) => !prev.some(p => p.id === i.id));
        return isInitialLoad ? newItems : [...prev, ...newItems];
      });

      setPage(startingPage);
      setHasMore(items.length >= PAGE_SIZE);

      if (isInitialLoad && items.length > 0 && onVideoSelect) {
        onVideoSelect(
          items[0].id, 
          items[0].commentsCount, 
          items[0].likesCount, 
          items[0].userHasLiked,
          // 🚨 ADICIÓN CRÍTICA 1
          items[0].creator?.id || null 
        );
      }
    } catch (e: any) {
      console.error("Error loading feed:", e?.message, e.response?.status);
      setLoadError(
        feedType === 'FOLLOWING' && (e.response?.status === 401 || e.response?.status === 403)
          ? "Sesión expirada. Por favor, vuelve a iniciar sesión."
          : "Error cargando videos"
      );
      setHasMore(false);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [hasMore, page, loadingMore, refreshing, data.length, onVideoSelect, feedUrl, feedType, getAxiosConfig]);

  const refreshFeed = useCallback(async () => {
    if (refreshing) return;
    
    const config = await getAxiosConfig();
    if (config.tokenMissing) {
        setRefreshing(false);
        return;
    }

    setRefreshing(true);
    try {
      const res = await axios.get(feedUrl, {
        params: { page: 0, size: PAGE_SIZE },
        headers: config.headers,
      });
      const items: VideoItem[] = Array.isArray(res.data) ? res.data.map(mapVideoData) : [];
      setData(items);
      setPage(1);
      setHasMore(items.length >= PAGE_SIZE);

      if (items.length > 0 && onVideoSelect) {
        onVideoSelect(
          items[0].id, 
          items[0].commentsCount, 
          items[0].likesCount, 
          items[0].userHasLiked,
          // 🚨 ADICIÓN CRÍTICA 2
          items[0].creator?.id || null
        );
      }
      setCurrentIndex(0);
    } catch (e: any) {
      console.log("Error refreshing:", e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onVideoSelect, feedUrl, getAxiosConfig]);

  const backgroundRefresh = useCallback(async () => {
    if (loadingMore || refreshing) return;

    const config = await getAxiosConfig();
    if (config.tokenMissing) return;

    try {
      const res = await axios.get(feedUrl, {
        params: { page: 0, size: PAGE_SIZE },
        headers: config.headers,
      });
      const items: VideoItem[] = Array.isArray(res.data) ? res.data.map(mapVideoData) : [];
      setData(prev => {
        const ids = new Set(prev.map(i => i.id));
        const newOnes = items.filter(i => !ids.has(i.id));
        return newOnes.length ? [...newOnes, ...prev] : prev;
      });
    } catch (e: any) {
      console.log("Error background refresh:", e?.message);
    }
  }, [loadingMore, refreshing, feedUrl, getAxiosConfig]);

  useEffect(() => {
    loadMore(true);
  }, [feedUrl]); // Recargar al cambiar de feed

  useEffect(() => {
    if (!isFocused) return;
    const id = setInterval(backgroundRefresh, BACKGROUND_REFRESH_MS);
    return () => clearInterval(id);
  }, [isFocused, backgroundRefresh]);

  // 🚨 CORRECCIÓN CLAVE 2: Lógica de Reproducción/Pausa al cambiar de slide/foco/feed
  useEffect(() => {
    // 1. Pausar todos al salir del foco o al cambiar de feed
    if (!isFocused) {
        videoRefs.current.forEach(video => {
            if (video) video.pauseAsync();
        });
        setIsPlaying(false);
        return;
    }

    // 2. Controlar la reproducción del video actual
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pauseAsync();
        // Resetear la posición de los videos no activos para que empiecen desde el inicio al volver
        video.setPositionAsync(0, { toleranceMillisBefore: 100, toleranceMillisAfter: 100 }); 
      }
    });

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      if (isFocused && isPlaying) {
          currentVideo.playAsync();
      } else {
          currentVideo.pauseAsync();
      }
    }
  }, [isFocused, isPlaying, currentIndex, data, feedUrl]); // feedUrl es importante aquí

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      const currentData = dataRef.current;
      const currentVideo = currentData[newIndex];
      const vid = currentVideo?.id;

      if (vid && onVideoSelect) {
        onVideoSelect(
          vid,
          currentVideo.commentsCount || 0,
          currentVideo.likesCount || 0,
          currentVideo.userHasLiked || false,
          // 🚨 ADICIÓN CRÍTICA 3
          currentVideo.creator?.id || null 
        );
      }

      setCurrentIndex(newIndex);
      setIsPlaying(true);
    }
  }).current;

  const showIcon = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, delay: 500, useNativeDriver: true }),
    ]).start();
  };

  const handlePlayPause = async (index: number) => {
    if (index !== currentIndex) return;
    setIsPlaying(!isPlaying);
    showIcon();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "black" },
    videoContainer: {
      height: height,
      width: width,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black'
    },
    video: {
      width: width,
      height: height,
      position: 'absolute',
    },
    controls: {
      position: "absolute",
      bottom: 20,
      left: 20,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 10
    },
    centerIcon: {
      position: "absolute",
      top: "45%",
      left: "45%",
      zIndex: 10
    },
    descriptionContainer: {
      position: 'absolute',
      bottom: 100,
      left: 16,
      right: 80,
      zIndex: 10,
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    descriptionText: {
      color: 'white',
      fontSize: 14,
      lineHeight: 18,
      textShadowColor: 'rgba(0, 0, 0, 0.7)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: 'black',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  if (loadingInitial && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // 🚨 Mensaje de error (incluyendo error de login en "Siguiendo")
  if (loadError && data.length === 0) {
    const isLoginError = loadError.includes("Debes iniciar sesión");
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'white', marginBottom: 10, textAlign: 'center' }}>
            {loadError}
        </Text>
        {!isLoginError && (
            <TouchableOpacity
                onPress={() => loadMore(true)}
                style={{ padding: 10, backgroundColor: '#4CAF50', borderRadius: 5 }}
            >
                <Text style={{ color: 'white' }}>Reintentar</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  }
  
  // 🚨 Mostrar mensaje si está en 'Siguiendo' y no hay videos
  if (feedType === 'FOLLOWING' && data.length === 0 && !loadingInitial) {
      return (
          <View style={styles.loadingContainer}>
              <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
                  Aún no sigues a nadie o no han subido videos.
              </Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <TouchableWithoutFeedback onPress={() => handlePlayPause(index)}>
            <View style={styles.videoContainer}>
              {/* 🚨 CORRECCIÓN CLAVE 3: Renderizar condicionalmente el componente Video.
                  Si la URL no llega, esto es lo que hace que la pantalla se quede en negro. */}
              {item.url ? (
                <Video
                  ref={(ref) => { if (ref) videoRefs.current[index] = ref; }}
                  source={{ uri: item.url }}
                  style={styles.video}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  shouldPlay={false}
                  useNativeControls={false}
                  onError={(e) => console.error(`Error en Video ${item.id}:`, e)}
                />
              ) : (
                 <View style={[styles.video, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: 'white' }}>Video no disponible (Falta URL)</Text>
                 </View>
              )}

              <View style={styles.controls}>
                <TouchableOpacity onPress={() => handlePlayPause(index)}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {index === currentIndex && !isPlaying && (
                <View style={styles.centerIcon}>
                  <Ionicons name="play" size={64} color="white" />
                </View>
              )}
              
              <View style={styles.descriptionContainer}>
                {item.creator?.handle && (
                  <Text style={[styles.descriptionText, { fontWeight: 'bold', marginBottom: 4 }]}>
                    {item.creator.handle}
                  </Text>
                )}
                {item.description && (
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={height}
        snapToAlignment="start"
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
        removeClippedSubviews={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => loadMore(false)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            tintColor="#4CAF50"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color="#4CAF50"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
      />
    </View>
  );
}