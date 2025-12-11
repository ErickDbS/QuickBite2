import axios from "axios";
import { useState } from "react";
import {
    ScrollView,
    View,
    Text,
    ImageBackground,
    TouchableOpacity,
    Alert,
} from "react-native";

const image = require("../assets/landing-back.png");

const Landing = ({ navigation }: any) => {
    const [tip, setTip] = useState({})
    const showTip = async () => {
        try {
            const tip = await axios.get(`${process.env.EXPO_PUBLIC_TIP}`)
            const data = tip.data
            const firstTip = {
                title: data.titulo,
                content: data.contenido,
                source: data.fuente
            }
            setTip(firstTip)
            Alert.alert(firstTip.title, firstTip.content)
        } catch (error) {
            console.error("error obteniendo el tip", error)
        }
    }
    return (
        <ImageBackground
            className="flex flex-1 justify-center"
            source={image}
            resizeMode={"cover"}
        >
            <ScrollView className="flex felx-col ">
                <View className="pt-[12rem] px-10">
                    <Text className="text-7xl font-bold text-white text-center mb-8">
                        QuickBite
                    </Text>

                    {/*Slogan*/}
                    <View className="flex-col items-center">
                        <Text className="text-white text-3xl text-center font-bold">
                            De la pantalla a tu plato.
                        </Text>
                        <Text className="text-green-300 font-bold text-3xl">
                            ¡Así de fácil!
                        </Text>
                    </View>

                    {/* Iniciar sesión */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Login")}
                        className="mt-[6rem] bg-green-600 rounded-2xl p-4 w-[50%] justify-center items-center mx-auto"
                    >
                        <Text className="text-lg font-bold text-white">
                            Iniciar Sesión
                        </Text>
                    </TouchableOpacity>
                    {/* Mas tarde */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate("BottomTap")}
                        className="mt-[1rem] rounded-2xl p-4 w-[50%] justify-center items-center mx-auto"
                    >
                        <Text className="text-lg text-green-400 font-bold">
                            Mas tarde
                        </Text>
                    </TouchableOpacity>

                    {/* Registrarse */}
                    <View className="flex-col justify-center items-center mt-4">
                        <Text className="text-2xl text-white">
                            ¿Aun no tienes una cuenta?
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Register")}
                        >
                            <Text className="text-xl text-green-400 font-bold">
                                Registrate aqui
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => showTip()}
                        className="mt-[1rem] rounded-2xl p-4 w-[50%] justify-center items-center mx-auto"
                    >
                        <Text className="text-lg text-green-400 font-bold">
                            Tip del dia
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ImageBackground>
    );
};

export default Landing;
