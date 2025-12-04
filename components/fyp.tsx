import { useEffect, useRef, useState, useCallback } from "react";
import { 
    View, 
    FlatList, 
    Dimensions, 
    TouchableWithoutFeedback, 
    Animated, 
    StyleSheet, 
    ActivityIndicator, 
    Text 
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import axios from "axios";

const { height } = Dimensions.get("window");

// Asegúrate de que esta interfaz coincida con la respuesta de tu API
interface VideoItem {
  id: string;
  url: string;
  // Añadir cualquier otra propiedad necesaria como 'creator', 'description', etc.
}

interface FYPProps {
  onVideoSelect?: (videoId: string | null) => void;
}

// Configuración de la visibilidad para la FlatList
const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 300,
};

export default function FYP({ onVideoSelect }: FYPProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const videoRefs = useRef<(Video | null)[]>([]);
    const [isPlaying, setIsPlaying] = useState(true);
    const isFocused = useIsFocused();

    // Feed remoto
    const [data, setData] = useState<VideoItem[]>([]);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 5;
    // `loadingInitial` para el spinner grande en el centro
    const [loadingInitial, setLoadingInitial] = useState(true); 
    // `loadingMore` para el spinner en el footer
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const BACKGROUND_REFRESH_MS = 30000;
    
    // Animación de Play/Pause (manteniendo tu implementación original)
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
    if (!API_URL) {
        console.error("Error: EXPO_PUBLIC_AWS_API_URL no está definido.");
    }

    const loadMore = useCallback(async (isInitialLoad = false) => {
        if (!API_URL) return;

        // Si es la carga inicial y ya tiene datos, no hacer nada a menos que se fuerce
        if (!isInitialLoad && !hasMore) return;

        // Evitar múltiples cargas concurrentes
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
                // Si es una carga inicial forzada, reemplazar
                if (isInitialLoad) return items;

                // Carga normal: agregar solo los nuevos
                const existing = new Set(prev.map((i: any) => i.id));
                return [...prev, ...items.filter((i: any) => !existing.has(i.id))];
            });

            setPage(startingPage);
            if (items.length < PAGE_SIZE) setHasMore(false);
            else setHasMore(true);

            // Si es la primera carga y hay videos, notificar al Home
            if (isInitialLoad && items.length > 0 && onVideoSelect) {
                onVideoSelect(items[0].id);
            }

        } catch (e: any) {
            console.error("Error loading feed:", e?.message);
            setLoadError("No se pudieron cargar los videos. Revisa tu conexión.");
            setHasMore(false); // Detener la carga automática tras un error
        } finally {
            setLoadingInitial(false);
            setLoadingMore(false);
        }
    }, [API_URL, hasMore, page, loadingMore, refreshing, data.length, onVideoSelect]);

    const refreshFeed = useCallback(async () => {
        if (!API_URL || refreshing) return;
        setRefreshing(true);
        setLoadError(null);
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
            setCurrentIndex(0); // Volver al primer video
            videoRefs.current.forEach(async (ref) => ref?.pauseAsync());

        } catch (e: any) {
            console.error("Error refreshing feed:", e?.message);
            setLoadError("Error al refrescar el feed.");
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
                // Asegúrate de mantener el orden actual y solo agregar nuevos
                return newOnes.length ? [...newOnes, ...prev] : prev;
            });
        } catch (e: any) {
            console.log("Error background refresh:", e?.message);
        }
    }, [API_URL, loadingMore, refreshing]);

    // 1. Carga inicial
    useEffect(() => {
        loadMore(true);
    }, []); // Solo se ejecuta una vez al montar

    // 2. Refresh en segundo plano
    useEffect(() => {
        if (!isFocused) return;
        const id = setInterval(backgroundRefresh, BACKGROUND_REFRESH_MS);
        return () => clearInterval(id);
    }, [isFocused, backgroundRefresh]);

    // 3. Control de reproducción por foco y estado
    useEffect(() => {
        const currentVideoRef = videoRefs.current[currentIndex];

        if (!isFocused) {
            videoRefs.current.forEach((video) => video?.pauseAsync());
        } else if (currentVideoRef) {
            // Reproducir solo si el video está enfocado y `isPlaying` es true
            if (isPlaying) {
                 currentVideoRef.playAsync();
            } else {
                 currentVideoRef.pauseAsync();
            }
        }
    }, [isFocused, isPlaying, currentIndex]);


    // 4. Manejo del cambio de video visible
    const onViewableItemsChanged = useRef(async ({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            
            // Pausar y resetear el video anterior, solo si hay cambio de índice
            if (newIndex !== currentIndex) {
                const previousVideo = videoRefs.current[currentIndex];
                if (previousVideo) {
                    // console.log(`Pausando video en index ${currentIndex}`);
                    await previousVideo.pauseAsync();
                    await previousVideo.setPositionAsync(0);
                }
            }

            // Actualizar el estado y notificar al Home
            const vid = data[newIndex]?.id;
            if (vid && onVideoSelect) {
                // console.log(`Nuevo video visible: ${vid}`);
                onVideoSelect(vid);
            }
            setCurrentIndex(newIndex);
            setIsPlaying(true); // Siempre empieza a reproducir el nuevo video

            // Reproducir el nuevo video
            const currentVideo = videoRefs.current[newIndex];
            if (currentVideo) {
                await currentVideo.playAsync();
            }
        }
    });

    const showIcon = () => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                delay: 500,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePlayPause = async (index: number) => {
        const currentVideo = videoRefs.current[index];
        if (!currentVideo) return;

        if (isPlaying) {
            await currentVideo.pauseAsync();
            setIsPlaying(false);
        } else {
            showIcon();
            await currentVideo.playAsync();
            setIsPlaying(true);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: "black",
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'black',
            height: height,
        },
        errorText: {
            color: 'red',
            marginTop: 10,
            textAlign: 'center',
        },
        videoContainer: {
            height, 
            width: "100%"
        },
        video: {
            flex: 1,
        },
        controls: {
            position: "absolute",
            bottom: 20,
            left: 20,
            flexDirection: "row",
            alignItems: "center",
        },
    });

    // --- Renderizado principal ---
    if (loadingInitial && data.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={{ color: 'white', marginTop: 10 }}>Cargando feed...</Text>
                {loadError && <Text style={styles.errorText}>{loadError}</Text>}
            </View>
        );
    }
    
    if (data.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: 'gray', fontSize: 16 }}>
                    No hay videos disponibles.
                </Text>
                {loadError && <Text style={styles.errorText}>{loadError}</Text>}
                <TouchableWithoutFeedback onPress={() => loadMore(true)}>
                    <Text style={{ color: '#4CAF50', marginTop: 15, fontSize: 16 }}>
                        Tocar para Reintentar
                    </Text>
                </TouchableWithoutFeedback>
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
                                ref={(ref) => {
                                    if (ref) videoRefs.current[index] = ref;
                                }}
                                source={{ uri: item.url }}
                                style={styles.video}
                                resizeMode={ResizeMode.COVER}
                                isLooping
                                // Solo reproducir si es el video actual Y la pantalla está enfocada Y el estado es isPlaying
                                shouldPlay={index === currentIndex && isPlaying && isFocused}
                                useNativeControls={false} 
                                // Logs para debug de carga de videos
                                // onLoadStart={() => console.log('Video Loading Start:', item.id)}
                                // onLoad={() => console.log('Video Loaded:', item.id)}
                                // onError={(e) => console.log('Video Error:', e)}
                            />

                            {/* Controles de Reproducción (tu diseño original) */}
                            <View style={styles.controls}>
                                <TouchableWithoutFeedback onPress={() => handlePlayPause(index)}>
                                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
                                </TouchableWithoutFeedback>
                            </View>

                            {/* Icono de Pausa/Play en el centro */}
                            {index === currentIndex && !isPlaying && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: "45%",
                                        left: "45%",
                                    }}
                                >
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
                
                // Viewability Config
                onViewableItemsChanged={onViewableItemsChanged.current}
                viewabilityConfig={viewabilityConfig}
                
                // Infinite Scroll
                onEndReached={() => loadMore(false)}
                onEndReachedThreshold={0.6}
                
                // Pull to Refresh
                refreshing={refreshing}
                onRefresh={refreshFeed}

                // Footer para el loading
                ListFooterComponent={loadingMore && data.length > 0 ? (
                    <ActivityIndicator size="small" color="#4CAF50" style={{ marginVertical: 20 }} /> 
                ) : null}
            />
        </View>
    );
}