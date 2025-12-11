// components/FollowListModal.tsx

import React, { useState, useEffect, useCallback } from "react";
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    Modal,
    SafeAreaView,
    Image,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

interface FollowListModalProps {
    isVisible: boolean;
    onClose: () => void;
    type: 'following' | 'followers';
    userId: string; 
    navigation: any;
}

interface UserListItem {
    id: string;
    alias: string;
    handle: string;
    image: string | null;
}

async function getToken() {
  const rawToken = await SecureStore.getItemAsync('accessToken');
  return rawToken ? rawToken.trim() : null;
}

export default function FollowListModal({ 
    isVisible, 
    onClose, 
    type, 
    userId, 
    navigation 
}: FollowListModalProps) {

    const [list, setList] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(false);

    const title = type === 'following' ? 'Siguiendo' : 'Seguidores';

 const fetchList = useCallback(async () => {
    setLoading(true);
    const token = await getToken();

    if (!token) {
        Alert.alert("Error de Sesión", "Debes iniciar sesión para ver esta lista.");
        setList([]);
        setLoading(false);
        return;
    }

    try {
        const endpoint = type === 'following' 
            ? `${API_URL}/user/following` 
            : `${API_URL}/user/followers`;

        const res = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 200 && Array.isArray(res.data)) {
            setList(res.data.map((item: any) => ({
                id: item.id,
                alias: item.alias || item.name,
                handle: item.handle,
                image: item.imageURl || null,
            })));
        } else {
            setList([]);
        }
    } catch (error: any) {
        console.error(`Error fetching ${type} list:`, error);
        Alert.alert("Error de Carga", `No se pudo cargar la lista de ${title}.`);
        setList([]);
    } finally {
        setLoading(false);
    }
}, [type]);


    // ⚡ Solo ejecutamos fetchList cuando se abre el modal
    useEffect(() => {
        if (isVisible) {
            fetchList();
        } else {
            // Limpiamos la lista cuando se cierra el modal
            setList([]);
        }
    }, [isVisible, fetchList]);

    const handleUserPress = (targetUserId: string) => {
        onClose(); 
        navigation.navigate("UserProfile", { userId: targetUserId });
    };

    const renderItem = ({ item }: { item: UserListItem }) => (
        <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-700"
            onPress={() => handleUserPress(item.id)}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    className="w-10 h-10 rounded-full"
                />
            ) : (
                <Ionicons name="person-circle-outline" size={40} color="white" />
            )}
            <View className="ml-3">
                <Text className="text-white font-bold">{item.alias}</Text>
                <Text className="text-gray-400 text-sm">{item.handle}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60">
                <SafeAreaView className="bg-gray-900 flex-1 rounded-t-2xl overflow-hidden mt-16">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
                        <Text className="text-white text-xl font-bold">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    ) : list.length > 0 ? (
                        <FlatList
                            data={list}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            className="flex-1"
                        />
                    ) : (
                        <View className="flex-1 justify-center items-center">
                            <Text className="text-gray-400 text-lg">
                                {type === 'following' ? 'No sigues a nadie.' : 'Nadie te sigue aún.'}
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}
