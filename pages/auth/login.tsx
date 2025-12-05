import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "../../global.css";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

export default function Login({ navigation }: any) {
  // === VALIDACIÓN ===
  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email("Correo inválido")
      .required("El correo es requerido"),
    password: Yup.string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .required("La contraseña es requerida"),
  });

  // === POST LOGIN ===
  const handleLogin = async (values: any) => {
    try {
      const payload = {
        email: values.email,
        password: values.password,
      };

      console.log("Payload login:", payload);

      const res = await axios.post(
        `${process.env.EXPO_PUBLIC_AWS_API_URL}/auth/login`,
        payload
      );

      console.log("Login exitoso:", res.data);

      const accessToken = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;

      if (accessToken) {
        await SecureStore.setItemAsync("accessToken", accessToken);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }

      console.log("Access token recibido:", accessToken);
      console.log("Refresh token recibido:", refreshToken);
      console.log("Guardado en SecureStore:");
      console.log(
        "accessToken:",
        await SecureStore.getItemAsync("accessToken")
      );
      console.log(
        "refreshToken:",
        await SecureStore.getItemAsync("refreshToken")
      );

      navigation.reset({
        index: 0,
        routes: [{ name: "BottomTap" }],
      });
    } catch (err: any) {
      console.log("Error login:", err.response?.data || err.message);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-300">
      <View className="pt-20 px-10">
        <Text className="text-2xl font-bold text-green-600 text-center mb-8">
          Iniciar Sesión
        </Text>

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
          }) => (
            <View className="w-full max-w-md mx-auto">
              {/* Email */}
              <Text className="font-bold text-lg mb-1">Correo Electrónico</Text>
              <TextInput
                className="border-2 rounded-xl p-3 w-full mb-1"
                placeholder="correo@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={handleChange("email")}
                onBlur={handleBlur("email")}
                value={values.email}
              />
              {errors.email && touched.email && (
                <Text className="text-red-600 mb-3">{errors.email}</Text>
              )}

              {/* Password */}
              <Text className="font-bold text-lg mb-1 mt-3">Contraseña</Text>
              <TextInput
                className="border-2 rounded-xl p-3 w-full mb-1"
                placeholder="********"
                secureTextEntry={true}
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                value={values.password}
              />
              {errors.password && touched.password && (
                <Text className="text-red-600 mb-3">{errors.password}</Text>
              )}

              {/* BOTÓN */}
              <TouchableOpacity
                className="bg-green-600 rounded-2xl p-4 w-[50%] justify-center items-center mx-auto mt-4"
                onPress={() => handleSubmit()}
              >
                <Text className="text-lg font-bold text-white">INGRESAR</Text>
              </TouchableOpacity>

              {/* Ir a registro */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-md">¿Aún no tienes una cuenta?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text className="text-md text-green-600 font-bold">
                    {" "}
                    Regístrate aquí
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Formik>
      </View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}
