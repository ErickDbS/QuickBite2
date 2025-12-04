import { 
  Text, 
  View, 
  ScrollView, 
  TouchableWithoutFeedback, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  Keyboard,
  Animated,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as SecureStore from 'expo-secure-store'; 

const icon = require("../assets/profile-example.png");
const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;

// --- Interfaces ---

interface Comment {
  id: number;
  user: {
    username: string;
    profileImage?: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  userReaction?: 'LIKE' | 'DISLIKE' | null;
}

interface CommentsComponentProps {
  videoId: string | null;
  onClose?: () => void;
}

/**
 * Función auxiliar para obtener el Access Token de SecureStore.
 * Aplica .trim() para limpiar posibles espacios en blanco que causan 401.
 */
async function getToken() {
    const rawToken = await SecureStore.getItemAsync('accessToken'); 
    return rawToken ? rawToken.trim() : null;
}

// --- Componente Principal ---

export default function CommentsComponent({ videoId, onClose }: CommentsComponentProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLogged, setIsLogged] = useState(false); 

  const inputRef = useRef<TextInput>(null);
  const [keyboardHeight] = useState(new Animated.Value(0));

  /**
   * Obtiene los comentarios del video.
   * Depende solo del videoId y del estado de refreshing.
   */
  const fetchComments = useCallback(async () => {
    // LOG de Depuración: ID del Video
    console.log("ID del Video para comentarios:", videoId); 

    if (!videoId || !API_URL) {
      setComments([]);
      setLoading(false);
      return;
    }

    // Si no estamos refrescando manualmente, mostramos el spinner de carga
    if (!refreshing) {
        setLoading(true);
    }
    
    try {
      const token = await getToken();
      // LOG DE DEPURACIÓN: Muestra longitud para verificar si el token es válido
      console.log("AccessToken para fetchComments:", token ? `Token encontrado (Longitud: ${token.length})` : "Token no encontrado");
        
      setIsLogged(!!token); 
      const config = token ? {
          headers: {
              'Authorization': `Bearer ${token}` // Incluir el Access Token
          }
      } : {};

      // Endpoint: GET /comments/video/{videoId}
      const response = await axios.get(
        `${API_URL}/comments/video/${videoId}?page=0&size=10`, 
        config 
      );
      
      if (response && response.data) {
        const commentsData = Array.isArray(response.data) ? response.data.map((comment: any) => ({
          id: comment.id,
          user: {
            username: comment.creator?.handle || 'Usuario Anónimo',
            profileImage: comment.creator?.profileImage
          },
          content: comment.comment || comment.content,
          createdAt: comment.createdAt,
          likes: comment.likes || 0,
          dislikes: comment.dislikes || 0,
          userReaction: comment.userReaction || null
        })) : [];
        
        setComments(commentsData);
        setError(null);
      } else {
        setComments([]);
      }
    } catch (err: any) {
        console.error('Error fetching comments:', err?.response?.status, err?.message);
        
        if (err?.response?.status === 401) {
             setError('No autorizado. Por favor, inicia sesión para ver reacciones y comentar.');
        } else {
             setError('Error al cargar los comentarios');
        }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [videoId, refreshing]); // Depende del videoId y refreshing

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null); 
    fetchComments();
  }, [fetchComments]);

  // CORRECCIÓN CLAVE: useEffect para manejar el cambio de videoId
  useEffect(() => {
    // 1. Limpia el estado y el error inmediatamente al cambiar el videoId
    setComments([]);
    setError(null);
    
    // 2. Ejecuta la búsqueda de comentarios
    fetchComments();
  }, [videoId, fetchComments]); // Depende del videoId y la función fetchComments

  // Manejo del Teclado
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        Animated.timing(keyboardHeight, {
          toValue: event.endCoordinates.height,
          duration: Platform.OS === "ios" ? event.duration : 100,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === "ios" ? 200 : 100,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  /**
   * Envía un nuevo comentario. Requiere token.
   */
  const handleSendComment = async () => {
    const trimmedComment = newComment.trim();
    if (!videoId || !trimmedComment || sending || !API_URL) return;
    
    try {
      setSending(true);
      
      const token = await getToken();
      if (!token) {
           Alert.alert('Error de Sesión', 'Debes iniciar sesión para comentar.');
           return;
      }
      
      // LOG DE DEPURACIÓN
      console.log("AccessToken para handleSendComment:", token ? `Token encontrado (Longitud: ${token.length})` : "Token no encontrado");

      // Endpoint: POST /comments/videos/{videoId}
      const response = await axios.post(
        `${API_URL}/comments/videos/${videoId}`, 
        { content: trimmedComment },
        { 
            headers: { 
                'Authorization': `Bearer ${token}` 
            } 
        }
      );

      const newCommentData = {
          id: response.data.id || Date.now(), 
          user: {
            username: response.data.creator?.handle || 'Tú',
            profileImage: response.data.creator?.profileImage
          },
          content: response.data.comment || response.data.content || trimmedComment,
          createdAt: response.data.createdAt || new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          userReaction: null
      };

      // Agrega el nuevo comentario al inicio de la lista
      setComments(prev => [newCommentData, ...prev]);
      setNewComment('');
      Keyboard.dismiss();
    } catch (err: any) {
      console.error('Error posting comment:', err?.response?.status, err?.message);
      Alert.alert('Error', 'No se pudo publicar el comentario. Asegúrate de haber iniciado sesión y tener permisos.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Maneja las reacciones (LIKE/DISLIKE). Requiere token.
   */
  const handleReaction = async (commentId: number, reaction: 'LIKE' | 'DISLIKE') => {
    if (sending || !API_URL) return; 
    
    const token = await getToken();
    if (!token) {
         Alert.alert('Error de Sesión', 'Debes iniciar sesión para reaccionar.');
         return;
    }
    
    // Actualización optimista
    setComments(prev =>
      prev.map(comment => {
        if (comment.id === commentId) {
          const updatedComment = { ...comment };
          const oppositeReaction = reaction === 'LIKE' ? 'DISLIKE' : 'LIKE';
          
          if (comment.userReaction === reaction) {
            // Eliminar reacción
            updatedComment.userReaction = null;
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']--;
          } 
          else if (comment.userReaction === oppositeReaction) {
            // Cambiar reacción
            updatedComment[oppositeReaction === 'LIKE' ? 'likes' : 'dislikes']--;
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']++;
            updatedComment.userReaction = reaction;
          } 
          else {
            // Nueva reacción
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']++;
            updatedComment.userReaction = reaction;
          }
          
          return updatedComment;
        }
        return comment;
      })
    );

    try {
      // LOG DE DEPURACIÓN
      console.log("AccessToken para handleReaction:", token ? `Token encontrado (Longitud: ${token.length})` : "Token no encontrado");
        
      // Llamada a la API para registrar la reacción
      await axios.post(
        `${API_URL}/comments/${commentId}/react`, // Endpoint: POST /comments/{commentId}/react
        { reaction },
        { 
            headers: { 
                'Authorization': `Bearer ${token}` 
            } 
        }
      );
    } catch (err) {
      console.error('Error updating reaction:', err);
      // Revertir a la versión del servidor si hay un error
      fetchComments(); 
      Alert.alert('Error', 'No se pudo registrar la reacción.');
    }
  };

  /**
   * Formatea la fecha a un formato relativo.
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diffInMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} d`;
    if (hours > 0) return `${hours} h`;
    if (minutes > 0) return `${minutes} m`;
    return 'Ahora';
  };

  // --- Renderizado del Componente ---

    // Manejo de estado de videoId nulo
    if (!videoId) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
            <Text style={{ color: 'white', textAlign: 'center', padding: 20 }}>
              No se pudo identificar el video.
            </Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={{ 
                marginTop: 10, 
                padding: 10, 
                backgroundColor: '#4CAF50', 
                borderRadius: 5 
              }}
            >
              <Text style={{ color: 'white' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        );
    }

    // Manejo de estado de carga inicial
    // Solo muestra el ActivityIndicator si no hay comentarios Y está cargando.
    if (loading && comments.length === 0 && !refreshing) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ color: 'white', marginTop: 10 }}>Cargando comentarios...</Text>
          </View>
        );
    }

    // Manejo de estado de error inicial (si no se pudo cargar NADA)
    if (error && comments.length === 0) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
            <Text style={{ color: 'white', textAlign: 'center', padding: 20 }}>{error}</Text>
            <TouchableOpacity 
              onPress={fetchComments} 
              style={{ 
                marginTop: 10, 
                padding: 10, 
                backgroundColor: '#4CAF50', 
                borderRadius: 5 
              }}
            >
              <Text style={{ color: 'white' }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        );
    }


  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* Encabezado del Modal */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Comentarios ({comments.length})</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Scroll de Comentarios */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 60 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Muestra el error si hay comentarios (ej: error 401 después de la carga inicial) */}
        {error && comments.length > 0 && (
          <View style={{ padding: 10, alignItems: 'center', backgroundColor: '#333' }}>
            <Text style={{ color: 'red' }}>{error}</Text>
            <TouchableOpacity onPress={fetchComments}><Text style={{ color: 'white', textDecorationLine: 'underline' }}>Toca para reintentar la carga</Text></TouchableOpacity>
          </View>
        )}

        {comments.length === 0 && !loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: 'gray' }}>No hay comentarios aún. ¡Sé el primero en comentar!</Text>
          </View>
        ) : (
          comments.map((item) => (
            <View className="flex-row items-start w-full mb-4 px-4 py-2 border-b border-b-gray-800" key={item.id}>
              {item.user?.profileImage ? (
                <Image
                  source={{ uri: item.user.profileImage }}
                  style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={44}
                  color="white"
                  style={{ marginRight: 10 }}
                />
              )}
              <View className="flex-1">
                <Text className="text-lg text-green-400">{item.user?.username || 'Usuario'}</Text>
                <Text className="text-white text-base">{item.content}</Text>
                <View className="flex-row items-center mt-1">
                  <Text style={{ marginRight: 15, color: "gray", fontSize: 12 }}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <View className="flex-row items-center">
                    {/* Botón de LIKE */}
                    <TouchableWithoutFeedback 
                      onPress={() => handleReaction(item.id, 'LIKE')}
                      disabled={sending || !isLogged}
                    >
                      <View className="flex-row items-center mr-4">
                        <Ionicons 
                          name={item.userReaction === 'LIKE' ? 'heart' : 'heart-outline'} 
                          size={18} 
                          color={item.userReaction === 'LIKE' ? '#FF3B30' : 'white'} 
                          style={{ marginRight: 4 }}
                        />
                        <Text style={{ color: 'white', fontSize: 12 }}>{item.likes}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                    {/* Botón de DISLIKE */}
                    <TouchableWithoutFeedback 
                      onPress={() => handleReaction(item.id, 'DISLIKE')}
                      disabled={sending || !isLogged}
                    >
                      <View className="flex-row items-center">
                        <Ionicons 
                          name={item.userReaction === 'DISLIKE' ? 'thumbs-down' : 'thumbs-down-outline'} 
                          size={18} 
                          color={item.userReaction === 'DISLIKE' ? '#FF3B30' : 'white'} 
                          style={{ marginRight: 4 }}
                        />
                        <Text style={{ color: 'white', fontSize: 12 }}>{item.dislikes}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input de Comentario Flotante */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: keyboardHeight,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "black",
          paddingHorizontal: 10,
          paddingVertical: 8,
          zIndex: 10,
          borderTopWidth: 1,
          borderTopColor: '#333',
        }}
      >
        <Image
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            marginRight: 10,
          }}
          source={icon}
        />

        <View style={{ flex: 1, position: "relative" }}>
          <TextInput
            ref={inputRef}
            style={{
              color: "white",
              backgroundColor: "#1d1d1d",
              borderRadius: 20,
              width: "100%",
              height: 40,
              paddingLeft: 15,
              paddingRight: 40,
              fontSize: 14,
            }}
            placeholder={isLogged ? "Escribe un comentario..." : "Inicia sesión para comentar..."}
            placeholderTextColor={"#666"}
            value={newComment}
            onChangeText={setNewComment}
            onSubmitEditing={handleSendComment}
            returnKeyType="send"
            // Solo se puede editar si el usuario está logueado y no se está enviando
            editable={!sending && isLogged} 
          />

          <TouchableOpacity
            onPress={handleSendComment}
            // Deshabilitar si no hay texto, si se está enviando, o si no está logueado
            disabled={!newComment.trim() || sending || !isLogged} 
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              // Opacidad basada en si está listo para enviar
              opacity: (newComment.trim() && isLogged) ? 1 : 0.5,
            }}
          >
            {sending ? (
                <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
                <Ionicons 
                    name="send" 
                    size={20} 
                    color={(newComment.trim() && isLogged) ? "#4CAF50" : "gray"} 
                />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}