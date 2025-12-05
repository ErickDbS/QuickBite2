import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "react-native";

const icon = require("../assets/icon.png");
export default function UserProfile() {
  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 bg-gray-900">
        <View className="absolute top-0 left-0 right-0 pt-16">
          <Text className="text-lg text-white text-center pt-4 font-bold">
            [Nombre de usuario]
          </Text>
          <View className="absolute right-4"></View>
        </View>

        {/* Contenido principal gris */}
        <View className="flex-1 pt-20 mt-20">
          <View>
            <Image className="w-24 h-24 rounded-full mx-auto" source={icon} />
            <Text className="text-white text-center pt-4 italic">
              [@identificador]
            </Text>
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
            <View className="flex-col items-center">
              <TouchableOpacity>
                <Text className="text-white text-md bg-green-600 rounded-lg p-3 font-bold w-[8rem] text-center">
                  Seguir
                </Text>
              </TouchableOpacity>
            </View>
            <View>
              <TouchableOpacity>
                <Text className="text-white text-md bg-gray-600 rounded-lg p-3 font-bold w-[8rem] text-center">
                  Mensajes
                </Text>
              </TouchableOpacity>
            </View>
            <View>
              <TouchableOpacity>
                <Text className="text-white text-md bg-gray-600 rounded-lg p-3 font-bold w-[3rem] text-center">
                  .
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="items-center pt-6">
            <Text className="text-white font-bold">
              Descripcion: aqui va la descripcion que describe
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
// function handleAxiosError(error: unknown) {
//   throw new Error("Function not implemented.");
// }
