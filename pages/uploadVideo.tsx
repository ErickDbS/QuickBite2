import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState, useEffect } from "react"; // 🚨 Agregamos useEffect
import { TouchableOpacity, StyleSheet, View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";


export default function RecordScreen() {
  // Permisos de Cámara
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [recording, setRecording] = useState(false);
  const navigation = useNavigation<any>();
  
  // 🚨 CORRECCIÓN CLAVE: Estado para los permisos de la Galería
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<ImagePicker.PermissionResponse | null>(null);

  // 🚨 CORRECCIÓN CLAVE: Solicitud de Permisos de Galería al inicio
  useEffect(() => {
    (async () => {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
             // Intentamos solicitarlo una vez al montar el componente
             const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
             setMediaLibraryPermission(newPermission);
        } else {
             setMediaLibraryPermission({ granted: true } as ImagePicker.PermissionResponse);
        }
    })();
  }, []);


  // --- Renderizado de Permisos ---
  // Si no hay permiso de cámara
  if (!cameraPermission) return <View />;
  if (!cameraPermission.granted)
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
          <Text style={styles.permissionText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  
  // Si falta permiso de Galería (y ya solicitamos el de cámara)
  if (!mediaLibraryPermission || !mediaLibraryPermission.granted) {
     return (
        <View style={styles.center}>
            <TouchableOpacity style={styles.permissionBtn} onPress={() => ImagePicker.requestMediaLibraryPermissionsAsync().then(setMediaLibraryPermission)}>
                 <Text style={styles.permissionText}>Permitir Galería</Text>
            </TouchableOpacity>
            <Text style={{color: 'white', marginTop: 10}}>Necesitas acceso a la Galería para subir videos.</Text>
        </View>
    );
  }
  // --- Fin de Renderizado de Permisos ---

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
    // 🚨 Eliminamos la solicitud de permisos aquí, ya que se manejó en useEffect.
    // Solo verificamos el estado (que sabemos que debe ser 'granted' para llegar aquí).
    
    try {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false, 
          quality: 1,
        });

        if (!result.canceled) {
          const uri = result.assets?.[0]?.uri;

          if (!uri) {
            Alert.alert("Error de archivo", "No se pudo obtener la URI del video seleccionado.");
            console.error("ImagePicker no devolvió una URI válida.");
            return;
          }
          
          safeNavigateToPreview(uri, uri);
        }
    } catch (e) {
        // Captura cualquier error nativo que ocurra durante el lanzamiento del picker
        console.error("Error al lanzar ImagePicker:", e);
        Alert.alert("Error de Galería", "Hubo un error al abrir la galería. Asegúrate de tener la app actualizada.");
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" }, // Aseguramos fondo negro

  permissionBtn: {
    backgroundColor: "red", // Cambiamos a rojo para enfocar la acción
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  permissionText: {
    color: "white",
    fontSize: 16,
    fontWeight: 'bold',
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