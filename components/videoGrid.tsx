// ASUMIENDO QUE ESTE COMPONENTE ES EL COMPONENTE 'VideoGrid'
import { View, FlatList, TouchableOpacity, Image } from "react-native";

type props = {
  navigation: any;
  videos: any;
};

export default function VideoGrid({ navigation, videos }: props) {
  const imageError = require("../assets/broken-image.png");

  const renderItem = ({ item: video }: any) => (
    <TouchableOpacity
      style={{
        flex: 1 / 3,
        height: 120,
        margin: 5,
      }}
      onPress={() =>
        // 🚨 CORRECCIÓN CLAVE: Aseguramos que pasamos el ID del video con la clave 'video'
        navigation.navigate("VideoFullScreen", { video: video?.id }) 
      }
    >
      <Image
        source={{ uri: video?.thumbnailURL }} 
        defaultSource={imageError} 
        style={{ width: "100%", height: "100%", borderRadius: 8 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 2 }}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        className="bg-gray-900"
      />
    </View>
  );
}