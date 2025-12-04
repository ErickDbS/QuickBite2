import { View, FlatList, TouchableOpacity, Image } from "react-native";

const videos = [
  { id: "1", source: require("../assets/video 1.mp4") },
  { id: "2", source: require("../assets/video 2.mp4") },
  { id: "3", source: require("../assets/video 3.mp4") },
  { id: "4", source: require("../assets/video 4.mp4") },
];

// Miniaturas precargadas para pruebas
const thumbnails = [
  require("../assets/foto1.png"),
  require("../assets/foto2.png"),
  require("../assets/foto3.png"),
  require("../assets/foto4.png"),
];

export default function ProfilePage({ navigation }: any) {
  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity
      style={{
        flex: 1 / 3, // 3 columnas
        height: 120, // mantiene cuadrado
        margin: 5, // espacio entre miniaturas
      }}
      onPress={() =>
        navigation.navigate("VideoFullScreen", { video: videos[index].source })
      }
    >
      <Image
        source={thumbnails[index]}
        style={{ width: "100%", height: "100%", borderRadius: 8 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 2 }}>
      <FlatList
        data={thumbnails}
        keyExtractor={(_, i) => i.toString()}
        numColumns={3} // 3 columnas
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        className="bg-gray-900"
      />
    </View>
  );
}
