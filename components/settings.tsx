import { Ionicons } from "@expo/vector-icons";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import * as SecureStore from "expo-secure-store";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  SettingsPage: undefined;
  Landing: undefined;
};

type SettingsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SettingsPage"
>;

export default function Settings({ navigation }: { navigation: SettingsNavigationProp }) {

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");

      console.log("Tokens eliminados correctamente");

      navigation.reset({
        index: 0,
        routes: [{ name: "Landing" }],
      });

    } catch (error) {
      console.log("Error al borrar tokens:", error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#1d1d1d" }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          alignItems: "center",
          backgroundColor: "#1d1d1d",
        }}
      >
        <View style={{ width: "100%", paddingTop: 10 }}>
          
          <TouchableOpacity onPress={() => navigation.navigate("SettingsPage")}>
            <View
              style={{
                marginBottom: 10,
                marginLeft: 10,
                marginTop: 10,
                width: "100%",
              }}
              className="flex-row items-center gap-6"
            >
              <Ionicons name="settings-outline" size={24} color="white" />
              <Text className="text-white text-center">Ajustes</Text>
            </View>
          </TouchableOpacity>

          <View
            style={{
              marginLeft: 10,
              marginBottom: 10,
              backgroundColor: "white",
              width: "95%",
              height: 1,
            }}
          ></View>

          {/* 🔥 BOTÓN DE CERRAR SESIÓN CORRECTO */}
          <TouchableOpacity onPress={handleLogout}>
            <View
              style={{
                marginBottom: 10,
                marginLeft: 10,
                marginTop: 10,
                width: "100%",
              }}
              className="flex-row items-center gap-6"
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="text-white text-center">Cerrar Sesión</Text>
            </View>
          </TouchableOpacity>

          <View
            style={{
              marginLeft: 10,
              marginBottom: 10,
              backgroundColor: "white",
              width: "95%",
              height: 1,
            }}
          ></View>
        </View>
      </ScrollView>
    </View>
  );
}
