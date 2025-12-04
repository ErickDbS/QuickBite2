import { Animated, ScrollView, Text, TouchableOpacity, View, Dimensions, TouchableWithoutFeedback } from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import Settings from "../components/settings";
import VideoGrid from "../components/videoGrid";
const icon = require("../assets/profile-example.png")
const { height } = Dimensions.get("window")

export default function Profile({navigation}: any){
        const [visible, setVisible] = useState(false)
        const translateY = useRef(new Animated.Value(height)).current;

    const openModal = () => {
        setVisible(true);
        Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
        }).start(() => setVisible(false));
    };

    return(
        <View className="flex-1 bg-black">
            <ScrollView className="flex-1 bg-gray-900">
                <View className="absolute top-0 left-0 right-0 pt-16">
                    <View className="flex-row justify-center items-center bg-gray-900 p-4">
                        <Text className="text-lg text-white font-bold">Carlos y Edwin</Text>
                        <View className="absolute right-4">
                            <TouchableOpacity onPress={openModal}>
                                <Ionicons
                                    name="options-outline"
                                    size={24}
                                    color={"white"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="flex-1 pt-20 mt-20">
                    <View>
                        <Image
                            className="w-24 h-24 rounded-full mx-auto" 
                            source={icon}/>
                        <Text className="text-white text-center pt-4">@Carlos&Edwin</Text>
                    </View>
 
                    <View className="flex-row justify-center gap-6 pt-4">
                        <View className="flex-col items-center">
                            <Text className="text-white font-bold">100</Text>
                            <Text className="text-white">Seguidos</Text>
                        </View>
                        <View className="flex-col items-center">
                            <Text className="text-white font-bold">1M</Text>
                            <Text className="text-white">Seguidores</Text>
                        </View>
                        <View className="flex-col items-center">
                            <Text className="text-white font-bold">100M</Text>
                            <Text className="text-white">Me gusta</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-center gap-1 pt-4">
                        <View>
                            <TouchableOpacity>
                                <Text className="text-white text-md bg-green-600 rounded-lg p-3 font-bold w-[8rem] text-center">Editar Perfil</Text>
                            </TouchableOpacity>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => navigation.navigate("VideoGrid")}>
                                <Text className="text-white text-md bg-gray-600 rounded-lg p-3 font-bold w-[3rem] text-center">.</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="items-center pt-4">
                        <Text className="text-white text-center text-md font-bold">Somos apacionados por la cocina y tal</Text>
                    </View>
                </View>
                <View className="pt-4">
                    <VideoGrid/>
                </View>
            </ScrollView>

                {visible && (
                    <View className="absolute inset-0">
                        <TouchableWithoutFeedback onPress={closeModal}>
                            <View className="flex-1 bg-black/50" />
                        </TouchableWithoutFeedback>
            
                        <Animated.View
                            style={{
                                transform: [{ translateY }],
                                position: "absolute",
                                left: 0,
                                right: 0,
                                height: height / 3,
                                bottom: 0,
                                backgroundColor: "black",
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                overflow: "hidden",
                            }}
                            >
                            <Settings navigation={navigation} />
                        </Animated.View>
                    </View>
                )}
        </View>
    )
}