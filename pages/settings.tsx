import { Ionicons } from "@expo/vector-icons"
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"


export default function SettingsPage({navigation}:any){
    return (
        <View className="flex-1 bg-black">
            <ScrollView>
            <SafeAreaView className="items-start pl-2 w-full">
                <TouchableOpacity className="mb-5" onPress={() => navigation.goBack()}>
                    <Ionicons
                        name="chevron-back-outline"
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
                <Text className="text-white text-3xl font-bold pl-2">Ajustes y Privacidad</Text>

                <View className="mt-6 w-full">
                    <Text className="text-gray-400 pl-2">Cuenta</Text>

                    <View className="bg-[#1d1d1d] mt-5 rounded-xl">
                            <TouchableOpacity className="pl-5 pr-5 mt-4 flex-row justify-between items-center">
                                <Ionicons
                                    name="home-outline"
                                    size={20}
                                    color="white"
                                />
                                <Text className="text-white text-lg font-bold flex-1 pl-2">Cuenta</Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={14}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity className="pl-5 pr-5 mt-4 flex-row justify-between items-center">
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color="white"
                                />
                                <Text className="text-white text-lg font-bold flex-1 pl-2">Privacidad</Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={14}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity className="pl-5 pr-5 mt-4 flex-row justify-between items-center">
                                <Ionicons
                                    name="shield-outline"
                                    size={20}
                                    color="white"
                                />
                                <Text className="text-white text-lg font-bold flex-1 pl-2">Seguridad y permisos</Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={14}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity className="pl-5 pr-5 mt-4 mb-4 flex-row justify-between items-center">
                                <Ionicons
                                    name="share-social-outline"
                                    size={20}
                                    color="white"
                                />
                                <Text className="text-white text-lg font-bold flex-1 pl-2">Compartir el perfil</Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={14}
                                    color="white"
                                />
                            </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </ScrollView>    
    </View>
    )
}