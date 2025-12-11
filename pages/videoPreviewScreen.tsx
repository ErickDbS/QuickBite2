import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Video, ResizeMode } from "expo-av";

export default function VideoPreviewScreen({ route, navigation }: any) {
  const { uri } = route.params;

  return (
    <View style={styles.container}>
      <Video
        source={{ uri }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping
      />

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => navigation.navigate("UploadVideoScreen", { uri })}
      >
        <Text style={styles.btnText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center" },

  video: {
    width: "100%",
    height: "80%",
  },

  nextBtn: {
    backgroundColor: "#ff0050",
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: "center",
  },

  btnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});
