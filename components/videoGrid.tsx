import { View, FlatList, TouchableOpacity, Image } from "react-native";

type props = {
  navigation: any;
  videos: any;
};

export default function ProfilePage({ navigation, videos }: props) {
  const imageError = require("../assets/broken-image.png");

  console.log("videos", videos);

  const renderItem = ({ video }: any) => (
    <TouchableOpacity
      style={{
        flex: 1 / 3,
        height: 120,
        margin: 5,
      }}
      onPress={() =>
        navigation.navigate("VideoFullScreen", { video: video?.id })
      }
    >
      <Image
        source={video?.thumbnails || imageError}
        style={{ width: "100%", height: "100%", borderRadius: 8 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 2 }}>
      <FlatList
        data={videos}
        keyExtractor={(_, i) => i.toString()}
        numColumns={3}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        className="bg-gray-900"
      />
    </View>
  );
}
