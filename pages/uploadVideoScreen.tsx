import { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
} from "react-native";
// ASEGÚRATE DE QUE ESTA RUTA SEA CORRECTA (ej: "../components/uploadVideo" o "../services/uploadVideo")
import uploadVideo from "../components/uploadVideo"; 
import * as VideoThumbnails from "expo-video-thumbnails";
import * as Notifications from "expo-notifications";
import { CommonActions } from "@react-navigation/native";

// COMPONENTE DE ANIMACIÓN DE PUNTITOS
const AnimatedDots = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={{ color: "white", fontSize: 18, marginTop: 10 }}>
      {dots}
    </Text>
  );
};


// Renombramos a UploadVideoScreen para alinearnos con App.tsx
export default function UploadVideoScreen({ route, navigation }: any) { 
  
  // Protección contra crash si route.params es undefined al hacer reset
  const { uri } = route.params || {}; 
  
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("");
  const [thumbUri, setThumbUri] = useState<string | null>(route.params?.thumbUri || null);

  // PROGRESO 0–100
  const [progress, setProgress] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  const animateBar = (value: number) => {
    Animated.timing(barAnim, {
      toValue: value,
      duration: 200, 
      useNativeDriver: false,
    }).start();
  };

  // Generar miniatura
  useEffect(() => {
    if (thumbUri || !uri) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
        if (!cancelled) setThumbUri(result.uri);
      } catch (error) {
        console.error("Error generando miniatura:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [uri, thumbUri]);

  const notify = async (title: string, body: string) => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== "granted") await Notifications.requestPermissionsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {}
  };

  // ⚠️ FUNCIÓN DE NAVEGACIÓN CORREGIDA
  const irAlHome = () => {
    // 1. Sintaxis correcta para navigation.reset
    // 2. Apunta al contenedor "BottomTap" (nombre en App.tsx)
    // 3. Forzamos la carga de la pestaña interna "Home"
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "BottomTap",
          // Aquí sustituimos el estado interno del BottomTap: solo 1 ruta (Home)
          state: {
            index: 0,
            routes: [
              { name: "Home" }
            ]
          }
        }
      ]
    })
  );
    
    // Reseteamos el estado local de la pantalla
    setEstado("");
    setProgress(0);
    setDescripcion(""); 
  };

  const subir = async () => {
    if (!thumbUri || !uri) {
      Alert.alert("Error", "La miniatura aún no se ha generado o falta el URI.");
      return;
    }

    try {
      setEstado("Iniciando carga...");
      barAnim.setValue(0);
      setProgress(0);

      const final = await uploadVideo(
        uri,
        descripcion,
        thumbUri,
        // Callback 1: CAMBIOS DE FASE (String)
        (status) => {
          if (status === "VERIFYING") setEstado("Verificando video con IA...");
          if (status === "APROBADO") setEstado("✅ Video aprobado");
          if (status === "RECHAZADO") setEstado("🚫 Video rechazado");
          if (status === "ERROR") setEstado("❌ Error al subir");
        },
        // Callback 2: PORCENTAJE (Número) -> Mueve la barra
        (pct) => {
          setProgress(pct);
          animateBar(pct);
          setEstado(`Subiendo... ${pct}%`);
        }
      );

      // LÓGICA FINAL - SIEMPRE VA AL HOME
      if (final === "APROBADO") {
        await notify("Video aprobado", "Tu video ya es público.");
      } else if (final === "RECHAZADO") {
        await notify("Video rechazado", "El video infringe nuestras normas.");
      } else {
        Alert.alert("Error", "Hubo un problema al subir el video.");
      }
      
      irAlHome(); // ⬅️ Ejecutamos el reset después de la notificación

    } catch (err) {
      console.error(err);
      setEstado("❌ Error crítico");
      irAlHome();
    }
  };

  // Bloqueo si no hay URI
  if (!uri) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "white" }}>No hay video seleccionado.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("BottomTap", { screen: "Home" })} style={{ marginTop: 20 }}>
          <Text style={{ color: "#ff0050", fontWeight: "bold" }}>Ir al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: "#aaa" }}>Cargando miniatura...</Text>
        </View>
      )}

      <Text style={styles.label}>Descripción</Text>

      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Escribe algo sobre tu video..."
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <TouchableOpacity 
        style={[styles.uploadBtn, (estado !== "") && { opacity: 0.5 }]} 
        onPress={subir} 
        disabled={estado !== ""}
      >
        <Text style={styles.btnText}>
           {estado === "" ? "Subir video" : "Procesando..."}
        </Text>
      </TouchableOpacity>

        {estado !== "" && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <Text style={styles.estado}>{estado}</Text>

            {/* Animación de puntos */}
            <AnimatedDots />
          </View>
        )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "black" },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#111",
  },
  label: { color: "white", marginBottom: 10, fontSize: 18 },
  input: {
    backgroundColor: "#222",
    color: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  uploadBtn: {
    backgroundColor: "#ff0050",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  estado: {
    marginBottom: 10,
    color: "white",
    textAlign: "center",
    fontSize: 14,
  },
  progressBar: {
    width: "100%",
    height: 10,
    backgroundColor: "#333",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ff0050",
  },
});