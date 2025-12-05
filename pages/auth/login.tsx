import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import "../../global.css"
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';

export default function Login({ navigation }: any) {

  const [apiError, setApiError] = useState<string | null>(null);

  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email("Correo inválido")
      .required("El correo es requerido"),
    password: Yup.string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .required("La contraseña es requerida"),
  });

  const handleLogin = async (values: any, { setSubmitting }: any) => {
    setApiError(null);
    
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

      console.log("Tokens guardados.");

      navigation.reset({
        index: 0,
        routes: [{ name: "BottomTap" }],
      });
    } catch (err: any) {
      console.log("Error login:", err.response?.data || err.message);
      
      const status = err.response?.status;
      
      if (status === 401 || status === 400) {
        setApiError("Correo o contraseña incorrectas");
      } else {
        setApiError("Error de conexión. Inténtalo más tarde.");
      }

    } finally {
      setSubmitting(false);
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
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, isValid }) => (
            <View className="w-full max-w-md mx-auto">

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
              
              {apiError && (
                 <Text className="text-red-600 mb-3 mt-3 text-center">{apiError}</Text>
              )}

              <TouchableOpacity
                className={`rounded-2xl p-4 w-[50%] justify-center items-center mx-auto mt-4 
                  ${isValid && !isSubmitting ? 'bg-green-600' : 'bg-gray-400'}`}
                onPress={() => handleSubmit()}
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                   <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-lg font-bold text-white">INGRESAR</Text>
                )}
              </TouchableOpacity>

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