import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import Settings from "../components/settings";
import VideoGrid from "../components/videoGrid";
import axios from "axios";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as SecureStore from "expo-secure-store";

export default function Profile({ navigation }: any) {
  const { height } = Dimensions.get("window");
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState(true);
  const userImg = require("../assets/user.png");

  useEffect(() => {
    getMyProfile();
  }, []);

  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      return token;
    } catch (error) {
      console.error("Error obteniendo el token del SecureStore", error);
      return null;
    }
  };

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

  const getMyProfile = async () => {
    try {
      const token = await getToken();

      if (!token) {
        console.error("No hay token, el usuario no está autenticado");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_AWS_API_URL}/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 200 || res.status === 201) {
        setUser(res.data);
        console.log("Datos:", res.data);
      }
    } catch (error) {
      console.error("Error en la petición:", error);
      if (axios.isAxiosError(error)) {
        console.error("Detalle del error:", error.response?.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-white">Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1 bg-gray-900">
        <View className="absolute top-0 left-0 right-0 pt-16">
          <View className="flex-row justify-center items-center bg-gray-900 p-4">
            <Text className="text-lg text-white font-bold">{user?.alias}</Text>
            <View className="absolute right-4">
              <TouchableOpacity onPress={openModal}>
                <Ionicons name="options-outline" size={24} color={"white"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="flex-1 pt-20 mt-20">
          <View>
            <Image
              className="w-24 h-24 rounded-full mx-auto bg-slate-700"
              source={user.image || userImg}
            />
            <Text className="text-white text-center pt-4">{user?.handle}</Text>
          </View>

          <View className="flex-row justify-center gap-6 pt-4">
            <View className="flex-col items-center">
              <Text className="text-white font-bold">
                {user?.followingCount}
              </Text>
              <Text className="text-white">Seguidos</Text>
            </View>
            <View className="flex-col items-center">
              <Text className="text-white font-bold">
                {user?.followersCount}
              </Text>
              <Text className="text-white">Seguidores</Text>
            </View>
            <View className="flex-col items-center">
              <Text className="text-white font-bold">{user?.likes}</Text>
              <Text className="text-white">Me gusta</Text>
            </View>
          </View>

          <View className="flex-row justify-center gap-1 pt-4">
            <View>
              <TouchableOpacity>
                <Text className="text-white text-md bg-green-600 rounded-lg p-3 font-bold w-[8rem] text-center">
                  Editar Perfil
                </Text>
              </TouchableOpacity>
            </View>
            <View>
              <TouchableOpacity
                onPress={() => navigation.navigate("VideoGrid")}
              >
                <Text className="text-white text-md bg-gray-600 rounded-lg p-2 font-bold w-[3rem] text-center">
                  <FontAwesome name="heart" size={22} color="white" />
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="items-center pt-4">
            <Text className="text-white text-center text-md font-bold">
              Mis videos
            </Text>
          </View>
        </View>
        <View className="pt-4">
          {user?.videos?.length > 0 ? (
            <VideoGrid videos={user?.videos} navigation={navigation} />
          ) : (
            <View className="flex-1 justify-center items-center mt-10">
              <Text className="text-white text-lg">
                No ha subido videos aún.
              </Text>
            </View>
          )}
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
  );
}
