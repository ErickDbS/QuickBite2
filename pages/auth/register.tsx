import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import "../../global.css"
import * as Yup from 'yup'
import { Formik } from 'formik';
import { useState } from 'react';
import axios from 'axios';

export default function Register({ navigation }: any) {

  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    })
  }

  const [step, setStep] = useState(1)
  const [firstStepData, setFirstStepData] = useState<any>(null)

  const registerSchema = Yup.object().shape({
    nombre: Yup.string().required("El nombre es requerido"),
    apellido: Yup.string().required("El apellido es requerido"),
    email: Yup.string().email("El correo es invalido").required("El correo es requerido"),
    password: Yup.string().min(6, "La contraseña debe tener al menos 6 caracteres").required("La contraseña es requerida"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required("La confirmación es requerida")
  })

  const registrationNextStep = Yup.object().shape({
    alias: Yup.string().required("El nombre de usuario es requerido"),
    userIdentifier: Yup.string().required("El identificador es requerido")
  })

  const handleRegister = async (values: any) => {
    if (!firstStepData) {
      console.error("Faltan datos del primer paso");
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
    if (!API_URL) {
        Alert.alert("Error de Configuración", "La URL de la API no está definida.");
        return;
    }

    const payload = {
      name: firstStepData.nombre,
      lastname: firstStepData.apellido,
      alias: values.alias,
      email: firstStepData.email,
      password: firstStepData.password,
      handle: values.userIdentifier
    };


    console.log("Intentando registrar con Payload:", payload);
    console.log("URL de Registro:", `${API_URL}/auth/register`);

    try {
      const res = await axios.post(`${API_URL}/auth/register`, payload);

      console.log("Registro exitoso:", res.data);

      navigation.reset({
        index: 0,
        routes: [{ name: 'BottomTap' }]
      });

    } catch (err: any) {
      console.error("Error al intentar registrar:", err);
      
      let errorMessage = "Ocurrió un error inesperado al registrar.";

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        console.error(`Error Status: ${status}`);
        console.error("Error Response Data:", data);

        if (status === 400 && data.message) {
            errorMessage = data.message;
        } else if (status === 500) {
            errorMessage = "Error interno del servidor. Inténtalo más tarde.";
        } else {
            errorMessage = `Error ${status}: El servidor rechazó la solicitud.`;
        }

      } else if (err.request) {
        errorMessage = "Error de conexión: No se pudo contactar al servidor. Revisa tu API_URL.";
      } else {
        errorMessage = `Error de la aplicación: ${err.message}`;
      }
      
      Alert.alert("⚠️ Error de Registro", errorMessage);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-300">

      {step === 1 ? (
        <View className="pt-20 px-10">
          <Text className="text-2xl font-bold text-green-600 text-center mb-8">
            Unete a QuickBite
          </Text>

          <Formik
            initialValues={{
              nombre: '',
              apellido: '',
              email: '',
              password: '',
              confirmPassword: ''
            }}
            validationSchema={registerSchema}
            onSubmit={(values) => {
              setFirstStepData(values);
              setStep(2);
            }}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, validateForm, setTouched }) => (
              <View className="w-full max-w-md mx-auto">

                <Text className='font-bold text-lg mb-1'>Nombre</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-1'
                  placeholder='Mi nombre'
                  onChangeText={handleChange('nombre')}
                  onBlur={handleBlur('nombre')}
                  value={values.nombre}
                />
                {errors.nombre && touched.nombre && <Text className='text-red-600 mb-3'>{errors.nombre}</Text>}

                <Text className='font-bold text-lg mb-1 mt-3'>Apellido</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-1'
                  placeholder='Mi apellido'
                  onChangeText={handleChange('apellido')}
                  onBlur={handleBlur('apellido')}
                  value={values.apellido}
                />
                {errors.apellido && touched.apellido && <Text className='text-red-600 mb-3'>{errors.apellido}</Text>}

                <Text className='font-bold text-lg mb-1 mt-3'>Correo Electronico</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-1'
                  keyboardType='email-address'
                  autoCapitalize='none'
                  placeholder='correo@gmail.com'
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                />
                {errors.email && touched.email && <Text className='text-red-600 mb-3'>{errors.email}</Text>}

                <Text className='font-bold text-lg mb-1 mt-3'>Contraseña</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-1'
                  secureTextEntry={true}
                  placeholder='********'
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  value={values.password}
                />
                {errors.password && touched.password && <Text className='text-red-600 mb-3'>{errors.password}</Text>}

                <Text className='font-bold text-lg mb-1 mt-3'>Confirmar contraseña</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-1'
                  secureTextEntry={true}
                  placeholder='********'
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  value={values.confirmPassword}
                />
                {errors.confirmPassword && touched.confirmPassword && (
                  <Text className='text-red-600 mb-3'>{errors.confirmPassword}</Text>
                )}

                <TouchableOpacity
                  className='bg-green-600 rounded-2xl p-4 w-[50%] justify-center items-center mx-auto mt-4'
                  onPress={async () => {
                    const validationErrors = await validateForm();
                    if (Object.keys(validationErrors).length === 0) {
                      handleSubmit();
                    } else {
                      setTouched({
                        nombre: true,
                        apellido: true,
                        email: true,
                        password: true,
                        confirmPassword: true
                      });
                    }
                  }}
                >
                  <Text className="text-lg font-bold text-white">CONTINUAR</Text>
                </TouchableOpacity>

                <View className='flex-row justify-center mt-4'>
                  <Text className='text-md'>¿Ya tienes una cuenta?</Text>
                  <TouchableOpacity onPress={goToLogin}>
                    <Text className='text-md text-green-600 font-bold'> Inicia Sesión aquí</Text>
                  </TouchableOpacity>
                </View>

              </View>
            )}
          </Formik>
        </View>

      ) : (
        <ScrollView className="flex-1 bg-gray-300">
          <Formik
            initialValues={{
              alias: "",
              userIdentifier: ""
            }}
            validationSchema={registrationNextStep}
            onSubmit={handleRegister}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
              <View className="pt-20 px-10">

                <Text className='text-2xl font-bold text-green-600 text-center mb-8'>
                  Ya casi terminamos
                </Text>

                <Text className='font-bold text-md mb-3'>Nombre de usuario</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-3'
                  placeholder='Nombre de usuario'
                  onChangeText={handleChange('alias')}
                  onBlur={handleBlur('alias')}
                  value={values.alias}
                />
                {errors.alias && touched.alias && (
                  <Text className='text-red-600 mb-3'>{errors.alias}</Text>
                )}

                <Text className='font-bold text-md mb-3'>Elige tu identificador</Text>
                <TextInput
                  className='border-2 rounded-xl p-3 w-full mb-3'
                  placeholder='@MiIdentificador'
                  onChangeText={handleChange('userIdentifier')}
                  onBlur={handleBlur('userIdentifier')}
                  value={values.userIdentifier}
                />
                {errors.userIdentifier && touched.userIdentifier && (
                  <Text className='text-red-600 mb-3'>{errors.userIdentifier}</Text>
                )}

                <TouchableOpacity
                  className='bg-green-600 rounded-2xl p-4 w-[50%] justify-center items-center mx-auto mt-4'
                  onPress={() => handleSubmit()}
                >
                  <Text className='text-lg font-bold text-white'>Registrarse</Text>
                </TouchableOpacity>

              </View>
            )}
          </Formik>

        </ScrollView>
      )}

      <StatusBar style="auto" />
    </ScrollView>
  );
}