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

const { height, width } = Dimensions.get("window"); // Obtenemos ancho y alto

interface VideoItem {
  id: string;
  url: string;
}

interface FYPProps {
  onVideoSelect?: (videoId: string | null) => void;
}

const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 300,
};

export default function FYP({ onVideoSelect }: FYPProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const videoRefs = useRef<(Video | null)[]>([]); 
    const [isPlaying, setIsPlaying] = useState(true);
    const isFocused = useIsFocused();

    // Estado de datos
    const [data, setData] = useState<VideoItem[]>([]);
    
    // Referencia de datos para evitar clausuras obsoletas
    const dataRef = useRef<VideoItem[]>([]);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

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

    // --- Lógica de Carga ---
    const loadMore = useCallback(async (isInitialLoad = false) => {
        if (!API_URL) return;
        if (!isInitialLoad && !hasMore) return;
        if (loadingMore || refreshing) return;

        setLoadError(null);
        if (isInitialLoad && data.length === 0) {
            setLoadingInitial(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const res = await axios.get(`${API_URL}/videos/feed`, {
                params: { page: isInitialLoad ? 0 : page, size: PAGE_SIZE },
            });
            
            const items = Array.isArray(res.data) ? res.data : [];
            const startingPage = isInitialLoad ? 1 : page + 1;

            setData(prev => {
                if (isInitialLoad) return items;
                const existing = new Set(prev.map((i: any) => i.id));
                return [...prev, ...items.filter((i: any) => !existing.has(i.id))];
            });

            setPage(startingPage);
            if (items.length < PAGE_SIZE) setHasMore(false);
            else setHasMore(true);

            if (isInitialLoad && items.length > 0 && onVideoSelect) {
                onVideoSelect(items[0].id);
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
            const items = Array.isArray(res.data) ? res.data : [];
            setData(items);
            setPage(1);
            setHasMore(items.length >= PAGE_SIZE);
            
            if (items.length > 0 && onVideoSelect) {
                onVideoSelect(items[0].id);
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
            const items = Array.isArray(res.data) ? res.data : [];
            setData(prev => {
                const ids = new Set(prev.map((i: any) => i.id));
                const newOnes = items.filter((i: any) => !ids.has(i.id));
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

    // --- Control de Reproducción Centralizado ---
    useEffect(() => {
        // 1. Pausar todos los que NO son el actual
        videoRefs.current.forEach((video, index) => {
            if (video && index !== currentIndex) {
                video.pauseAsync();
                // Opcional: si quieres que se reinicien al volver a verlos
                // video.setPositionAsync(0); 
            }
        });

        // 2. Manejar el video actual
        const currentVideo = videoRefs.current[currentIndex];
        if (currentVideo) {
            if (isFocused && isPlaying) {
                currentVideo.playAsync();
            } else {
                currentVideo.pauseAsync();
            }
        }
    }, [isFocused, isPlaying, currentIndex, data]);


    // --- MANEJO DE VISTA ---
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            
            const currentData = dataRef.current;
            const vid = currentData[newIndex]?.id;

            if (vid && onVideoSelect) {
                onVideoSelect(vid);
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

    // --- ESTILOS CORREGIDOS ---
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: "black" },
        videoContainer: { 
            height: height, 
            width: width, // Ancho explícito
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'black' // Fondo negro explícito
        },
        video: { 
            width: width, // Dimensiones explícitas
            height: height,
            position: 'absolute', // Asegurar posición absoluta para cubrir
        },
        controls: { position: "absolute", bottom: 20, left: 20, flexDirection: "row", alignItems: "center", zIndex: 10 },
        centerIcon: { position: "absolute", top: "45%", left: "45%", zIndex: 10 },
        loadingContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }
    });

    if (loadingInitial && data.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
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
                                style={styles.video} // Usando estilo con dimensiones fijas
                                resizeMode={ResizeMode.COVER} // Importante para llenar pantalla
                                isLooping
                                shouldPlay={false} // Controlado por useEffect
                                useNativeControls={false}
                                // Añadir poster si es necesario para evitar parpadeo negro
                                // posterSource={{ uri: 'loading_image_url' }}
                            />

                            <View style={styles.controls}>
                                <TouchableOpacity onPress={() => handlePlayPause(index)}>
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            {index === currentIndex && !isPlaying && (
                                <View style={styles.centerIcon}>
                                    <Ionicons name="play" size={64} color="white" />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                )}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={height}
                snapToAlignment="start"
                
                // --- AJUSTES PARA SOLUCIONAR PANTALLA NEGRA ---
                initialNumToRender={3}
                windowSize={5}
                maxToRenderPerBatch={3}
                // IMPORTANTE: Cambiado a false para evitar que el video se descargue de la GPU
                removeClippedSubviews={false} 
                // ----------------------------------------------

                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                
                onEndReached={() => loadMore(false)}
                onEndReachedThreshold={0.5}
                
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refreshFeed} tintColor="#4CAF50" />
                }
                
                ListFooterComponent={loadingMore ? <ActivityIndicator color="#4CAF50" /> : null}
            />
        </View>
    );
}