import { View, Text, TouchableWithoutFeedback, Animated, Dimensions } from "react-native";
import FYP from "../components/fyp";
import { Ionicons } from "@expo/vector-icons";
import CommentsComponent from "../components/commentsComponent";
import { useRef, useState, useCallback } from "react"
import { useIsFocused } from "@react-navigation/native";

const { height } = Dimensions.get("window")

interface HomeScreenProps {
  navigation: any;
}

export default function Home({ navigation }: HomeScreenProps) {
    const isFocused = useIsFocused();
    const [visible, setVisible] = useState(false);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const translateY = useRef(new Animated.Value(height)).current;
    const [like, setLike] = useState(true);
    const scale = useRef(new Animated.Value(1)).current;

    // Callback para recibir el ID del video actual de FYP
    const handleVideoSelect = useCallback((videoId: string | null) => {
        // Si el video cambia, cerramos el modal de comentarios
        if (selectedVideoId !== videoId) {
            setVisible(false);
            translateY.setValue(height); // Asegurarse de que la animación se reinicie
        }
        setSelectedVideoId(videoId);
    }, [selectedVideoId, height, translateY]);

    const openComments = useCallback(() => {
        if (!selectedVideoId) {
            console.log('No video selected, cannot open comments');
            return;
        }
        // console.log('Opening comments for video:', selectedVideoId); // Descomentar para debug
        setVisible(true);
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [selectedVideoId, translateY]); // selectedVideoId como dependencia es crucial

    // openModal ya no es necesario, usar openComments directamente

    const closeModal = useCallback(() => {
        Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
        }).start(() => setVisible(false));
    }, [translateY]);

    const handleLike = () => {
        if(!like){
            setLike(true)
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
            setLike(false)
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
    }


    return(
        <View className="flex-1">
            <View className="flex-1 bg-gray-900">
                {/* Pasamos isFocused para que FYP sepa si debe reproducir videos */}
                <FYP onVideoSelect={handleVideoSelect} /> 

                {/* Encabezado */}
                <View className="absolute top-16 left-0 right-0 z-10">
                    <View className="flex-row justify-center gap-20">
                        <Text className="text-lg text-white font-bold">Siguiendo</Text>
                        <Text className="text-lg text-white font-bold">Para ti</Text>
                    </View>
                </View>

                {/* Iconos de Interacción */}
                <View className="absolute right-4 bottom-24 gap-6 pb-20">
                    <View className="items-center">
                        <TouchableWithoutFeedback onPress={() => navigation.navigate("UserProfile")}>
                            <Ionicons 
                                name="person-circle-outline"
                                size={34}
                                color="white"
                            />
                        </TouchableWithoutFeedback>
                        <Text className="text-white text-xs">Perfil</Text>
                    </View>

                    <View className="items-center">
                        <TouchableWithoutFeedback onPress={handleLike}>
                            <Animated.View
                                style={{transform: [{scale}] }}>
                                {like ? (
                                    <Ionicons 
                                        name="heart-outline"
                                        size={34}
                                        color="white"
                                    />
                                ) : (
                                    <Ionicons
                                        name="heart"
                                        size={34}
                                        color="red"
                                    />
                                )}
                            </Animated.View>

                        </TouchableWithoutFeedback>

                        <Text className="text-white text-xs">123K</Text>
                    </View>
                    <View className="items-center">
                        <TouchableWithoutFeedback onPress={openComments} disabled={!selectedVideoId}>
                            <Ionicons
                                name="chatbubble-outline"
                                size={34}
                                color={selectedVideoId ? "white" : "gray"} // Deshabilitado visualmente si no hay video ID
                            />
                        </TouchableWithoutFeedback>

                        <Text className="text-white text-xs">456</Text>
                    </View>
                    <View className="items-center">
                        <Ionicons
                            name="share-social-outline"
                            size={34}
                            color="white"
                        />
                        <Text className="text-white text-xs">Compartir</Text>
                    </View>
                </View>
            </View>

            {/* Modal de Comentarios */}
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
                    {/* Aquí se pasa el ID del video al componente de comentarios */}
                    <CommentsComponent 
                        videoId={selectedVideoId}
                        onClose={closeModal}
                    />
                    </Animated.View>
                </View>
            )}

            
        </View>
    )
}