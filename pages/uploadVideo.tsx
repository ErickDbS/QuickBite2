import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState, useCallback } from "react";
import { TouchableOpacity, StyleSheet, View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";


export default function RecordScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [recording, setRecording] = useState(false);
  const navigation = useNavigation<any>();

  if (!permission) return <View />;

  if (!permission.granted)
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );

  // Función auxiliar de navegación para evitar repetición y asegurar estabilidad
  const safeNavigateToPreview = (uri: string, thumbUri: string | null = null) => {
    try {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate("Preview", { uri, thumbUri });
        } else {
          navigation.navigate("Preview", { uri, thumbUri }); 
        }
    } catch (e) {
        console.error("Error crítico de navegación a Preview:", e);
        Alert.alert("Error de navegación", "No se pudo abrir la pantalla de previsualización.");
    }
  };


  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      setRecording(false);

      if (!video?.uri) return;

      let thumbUri = null;
      try {
        const thumbnailResult = await VideoThumbnails.getThumbnailAsync(video.uri, { time: 1000 });
        thumbUri = thumbnailResult.uri;
      } catch (err) {
        console.error("Error al generar miniatura después de grabar:", err);
      }
      
      safeNavigateToPreview(video.uri, thumbUri);

    } catch (err) {
      console.error("Error al grabar:", err);
      Alert.alert("Error de Grabación", "Asegúrate de tener permisos de cámara y micrófono.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    setRecording(false);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso Requerido", "Necesitamos acceso a la galería para subir videos.");
      return;
    }
    
    // 🚨 CORRECCIÓN CLAVE: Mantenemos allowsEditing: false por seguridad.
    // Si necesitas reintroducir la edición (lo cual no es recomendable para videos largos), 
    // debes investigar errores nativos específicos de tu dispositivo/versión de Expo.
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false, 
      quality: 1,
    });

    if (!result.canceled) {
      // 🚨 USO DE OPERADOR DE ENCADENAMIENTO OPCIONAL EN ASSETS
      const uri = result.assets?.[0]?.uri;

      if (!uri) {
        Alert.alert("Error de archivo", "No se pudo obtener la URI del video seleccionado.");
        console.error("ImagePicker no devolvió una URI válida.");
        return;
      }
      
      // La URI del video se usa como input para generar la miniatura en UploadScreen
      safeNavigateToPreview(uri, uri);
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} mode="video" />

      <View style={styles.buttons}>
        
        {!recording && (
          <TouchableOpacity 
            style={styles.galleryBtn} 
            onPress={pickVideo}
            disabled={recording}
          >
            <Ionicons name="image-outline" size={30} color="white" />
          </TouchableOpacity>
        )}

        <View style={styles.recordContainer}>
          {!recording ? (
            <TouchableOpacity style={styles.recordBtn} onPress={startRecording} />
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} />
          )}
        </View>

        {!recording && (
          <View style={styles.galleryBtnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  permissionBtn: {
    backgroundColor: "black",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  permissionText: {
    color: "white",
    fontSize: 16,
  },

  buttons: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: "center",
    paddingHorizontal: 20,
  },
  
  recordContainer: {
    flex: 1,
    alignItems: 'center',
  },

  recordBtn: {
    width: 70,
    height: 70,
    backgroundColor: "red",
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "white",
  },

  stopBtn: {
    width: 70,
    height: 70,
    backgroundColor: "white",
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "red",
  },
  
  galleryBtn: {
    padding: 10,
  },
  
  galleryBtnPlaceholder: {
      width: 50,
      height: 50,
      opacity: 0,
  }
});