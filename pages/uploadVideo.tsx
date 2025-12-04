import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

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

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      setRecording(false);

      if (!video?.uri) return;

      navigation.getParent()?.navigate("Preview", { uri: video.uri });

    } catch (err) {
      console.error("Error al grabar:", err);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    setRecording(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} mode="video" />

      <View style={styles.buttons}>
        {!recording ? (
          <TouchableOpacity style={styles.recordBtn} onPress={startRecording} />
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} />
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
    alignItems: "center",
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
});
