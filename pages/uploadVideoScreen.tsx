import { useEffect, useState } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import uploadVideo from "../components/uploadVideo";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as Notifications from "expo-notifications";

export default function UploadScreen({ route, navigation }: any) {
  const { uri } = route.params;
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("");
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
        if (!cancelled) setThumbUri(result.uri);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const notify = async (title: string, body: string) => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {}
  };

  const subir = async () => {
    try {
      setEstado("Subiendo...");

      const final = await uploadVideo(uri, descripcion, (phase) => {
        if (phase === "UPLOADING") setEstado("Subiendo...");
        if (phase === "VERIFYING") setEstado("Verificando video...");
        if (phase === "APROBADO") setEstado("✅ Video aprobado");
        if (phase === "RECHAZADO") setEstado("🚫 Video rechazado");
        if (phase === "ERROR") setEstado("❌ Error al subir o verificar");
      });

      if (final === "APROBADO") {
        await notify("Video aprobado", "Tu video fue aprobado por la IA");
      }
      if (final === "RECHAZADO") {
        await notify("Video rechazado", "Tu video fue rechazado por la IA");
        navigation.reset({
          index: 0,
          routes: [{ name: "BottomTap", params: { screen: "Upload" } }],
        });
        return;
      }

      if (final === "ERROR") {
        await notify("Error", "Hubo un error al subir o verificar tu video");
      }

    } catch (err) {
      console.error(err);
      setEstado("❌ Error al subir el video");
      await notify("Error", "Hubo un error al subir o verificar tu video");
    }
  };

  return (
    <View style={styles.container}>
      {thumbUri && (
        <Image source={{ uri: thumbUri }} style={styles.thumbnail} resizeMode="cover" />
      )}
      <Text style={styles.label}>Descripción</Text>

      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Descripción del video"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={subir}>
        <Text style={styles.btnText}>Subir video</Text>
      </TouchableOpacity>

      {estado !== "" && <Text style={styles.estado}>{estado}</Text>}
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
    marginTop: 20,
    color: "white",
    textAlign: "center",
  },
});
