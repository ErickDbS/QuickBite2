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

const { height, width } = Dimensions.get("window");

interface VideoItem {
  id: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  userHasLiked: boolean;
  creator?: { handle: string; [key: string]: any };
  description: string;
  [key: string]: any;
}

interface FYPProps {
  onVideoSelect?: (videoId: string | null, commentsCount: number, likesCount: number, userHasLiked: boolean) => void;
  onSetFypUpdateLikes?: (func: (videoId: string, newLikesCount: number, newUserHasLiked: boolean) => void) => void;
}

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 300,
};

export default function FYP({ onVideoSelect, onSetFypUpdateLikes }: FYPProps) {
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
  const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

  const mapVideoData = (item: any): VideoItem => ({
    id: item.id,
    url: item.url,
    commentsCount: item.commentsCount || 0,
    likesCount: item.likes || 0,
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

  const loadMore = useCallback(async (isInitialLoad = false) => {
    if (!API_URL || (!isInitialLoad && !hasMore) || loadingMore || refreshing) return;

    setLoadError(null);
    isInitialLoad && data.length === 0 ? setLoadingInitial(true) : setLoadingMore(true);

    try {
      const res = await axios.get(`${API_URL}/videos/feed`, {
        params: { page: isInitialLoad ? 0 : page, size: PAGE_SIZE },
      });

      const items: VideoItem[] = Array.isArray(res.data) ? res.data.map(mapVideoData) : [];
      const startingPage = isInitialLoad ? 1 : page + 1;

      setData(prev => isInitialLoad ? items : [
        ...prev,
        ...items.filter((i: any) => !prev.some(p => p.id === i.id))
      ]);

      setPage(startingPage);
      setHasMore(items.length >= PAGE_SIZE);

      if (isInitialLoad && items.length > 0 && onVideoSelect) {
        onVideoSelect(items[0].id, items[0].commentsCount, items[0].likesCount, items[0].userHasLiked);
      }
    } catch (e: any) {
      console.error("Error loading feed:", e?.message);
      setLoadError("Error cargando videos");
      setHasMore(false);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [API_URL, hasMore, page, loadingMore, refreshing, data.length, onVideoSelect]);

  const refreshFeed = useCallback(async () => {
    if (!API_URL || refreshing) return;
    setRefreshing(true);
    try {
      const res = await axios.get(`${API_URL}/videos/feed`, {
        params: { page: 0, size: PAGE_SIZE },
      });
      const items: VideoItem[] = Array.isArray(res.data) ? res.data.map(mapVideoData) : [];
      setData(items);
      setPage(1);
      setHasMore(items.length >= PAGE_SIZE);

      if (items.length > 0 && onVideoSelect) {
        onVideoSelect(items[0].id, items[0].commentsCount, items[0].likesCount, items[0].userHasLiked);
      }
      setCurrentIndex(0);
    } catch (e: any) {
      console.log("Error refreshing:", e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [API_URL, refreshing, onVideoSelect]);

  const backgroundRefresh = useCallback(async () => {
    if (!API_URL || loadingMore || refreshing) return;
    try {
      const res = await axios.get(`${API_URL}/videos/feed`, {
        params: { page: 0, size: PAGE_SIZE },
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
  }, [API_URL, loadingMore, refreshing]);

  useEffect(() => {
    loadMore(true);
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const id = setInterval(backgroundRefresh, BACKGROUND_REFRESH_MS);
    return () => clearInterval(id);
  }, [isFocused, backgroundRefresh]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pauseAsync();
        video.setPositionAsync(0);
      }
    });

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      isFocused && isPlaying ? currentVideo.playAsync() : currentVideo.pauseAsync();
    }
  }, [isFocused, isPlaying, currentIndex, data]);

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
          currentVideo.userHasLiked || false
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

  if (loadError && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'white', marginBottom: 10 }}>{loadError}</Text>
        <TouchableOpacity
          onPress={() => loadMore(true)}
          style={{ padding: 10, backgroundColor: '#4CAF50', borderRadius: 5 }}
        >
          <Text style={{ color: 'white' }}>Reintentar</Text>
        </TouchableOpacity>
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
              <Video
                ref={(ref) => { if (ref) videoRefs.current[index] = ref; }}
                source={{ uri: item.url }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={false}
                useNativeControls={false}
              />

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