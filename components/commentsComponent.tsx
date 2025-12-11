import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
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

const API_URL = process.env.EXPO_PUBLIC_AWS_API_URL;
// NOTA: Si usas 'require', asegúrate de que la ruta del placeholder sea correcta.
// const userImgPlaceholder = require("../assets/user.png"); 

// --- INTERFACES ---
interface Answer {
  id: number;
  user: {
    username: string;
    profileImage?: string; // URL de la imagen de perfil
  };
  content: string;
  createdAt: string;
}

interface Comment {
  id: number;
  user: {
    username: string;
    profileImage?: string; // URL de la imagen de perfil
  };
  content: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  userReaction?: 'LIKE' | 'DISLIKE' | null;
  answers?: Answer[]; 
  answerCount?: number; 
  showAnswers?: boolean; 
  isAnswersLoading?: boolean;
}

interface CommentsComponentProps {
  videoId: string | null;
  onClose?: () => void;
}

async function getToken() {
    const rawToken = await SecureStore.getItemAsync('accessToken'); 
    return rawToken ? rawToken.trim() : null;
}

// ----------------------------------------------------------------------
// Componente funcional para renderizar la imagen o placeholder
const ProfileAvatar = ({ imageUrl, size = 44 }: { imageUrl?: string; size?: number }) => {
    // Si la URL existe y es una cadena válida, la usamos
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0) {
        // console.log("[DEBUG AVATAR] Intentando cargar:", imageUrl); // Puedes descomentar esto si aún falla

        // 🛑 Importante: En React Native, las imágenes externas SIEMPRE requieren HTTPS.
        // Si tu URL de S3 no tiene HTTPS, debes configurar excepciones en iOS/Android.
        return (
            <Image
                source={{ uri: imageUrl }}
                style={{ 
                    width: size, 
                    height: size, 
                    borderRadius: size / 2, 
                    marginRight: 10, 
                    backgroundColor: '#333' 
                }}
                // En caso de error de carga, fallback al icono
                onError={(e) => {
                    console.error("Error cargando imagen de perfil (URI):", imageUrl, e.nativeEvent.error);
                }}
            />
        );
    }
    // Si no hay URL, mostramos el placeholder/icono
    return (
        <Ionicons name="person-circle-outline" size={size} color="white" style={{ marginRight: 10 }} />
    );
};
// ----------------------------------------------------------------------


export default function CommentsComponent({ videoId, onClose }: CommentsComponentProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLogged, setIsLogged] = useState(false); 
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const inputRef = useRef<TextInput>(null);
  const [keyboardHeight] = useState(new Animated.Value(0));

  
  // FUNCIÓN PARA CARGAR RESPUESTAS INDIVIDUALES
  const fetchAnswersForComment = useCallback(async (commentId: number, shouldShow: boolean = true) => {
    if (!API_URL) return;

    setComments(prev => 
        prev.map(c => c.id === commentId ? { ...c, isAnswersLoading: true } : c)
    );

    try {
        const token = await getToken();
        const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
        
        const url = `${API_URL}/answers/comment/${commentId}?page=0&size=10`;
        const response = await axios.get(url, config);
        
        const fetchedAnswers = Array.isArray(response.data) ? response.data.map((ans: any) => {
            const profileImageUrl = ans.creator?.imageURl;
            // 🛑 DEPURACIÓN: Imprime la URL de la respuesta anidada
            console.log(`[DEBUG AVATAR - ANSWER] URL recibida para ${ans.creator?.handle || 'Anónimo'}:`, profileImageUrl);

            return {
                id: ans.id,
                user: {
                    username: ans.creator?.handle || 'Anónimo',
                    profileImage: profileImageUrl 
                },
                content: ans.answer || ans.content, 
                createdAt: ans.createdAt
            };
        }) : [];


        setComments(prev => 
            prev.map(c => 
                c.id === commentId 
                    ? { 
                        ...c, 
                        answers: fetchedAnswers, 
                        showAnswers: shouldShow, 
                        isAnswersLoading: false,
                        answerCount: fetchedAnswers.length
                      } 
                    : c
            )
        );
    } catch (error: any) {
        console.error(`[ANSWERS FETCH] Error al obtener respuestas para Comentario ${commentId}:`, error?.response?.status || error?.message);

        setComments(prev => 
            prev.map(c => c.id === commentId ? { ...c, isAnswersLoading: false } : c)
        );
    }
  }, []);


  // FUNCIÓN PRINCIPAL PARA CARGAR COMENTARIOS
  const fetchComments = useCallback(async () => {

    if (!videoId || !API_URL) {
      setComments([]);
      setLoading(false);
      return;
    }

    if (!refreshing) {
        setLoading(true);
    }
    
    try {
      const token = await getToken();        
      setIsLogged(!!token); 
      const config = token ? {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      } : {};

      const response = await axios.get(
        `${API_URL}/comments/video/${videoId}?page=0&size=10`, 
        config 
      );
      
      if (response && response.data) {
        const commentsData = Array.isArray(response.data) ? response.data.map((comment: any) => {
            const profileImageUrl = comment.creator?.imageURl;
            // 🛑 DEPURACIÓN: Imprime la URL del comentario principal
            console.log(`[DEBUG AVATAR - COMMENT] URL recibida para ${comment.creator?.handle || 'Anónimo'}:`, profileImageUrl);

            return {
                id: comment.id,
                user: {
                    username: comment.creator?.handle || 'Usuario Anónimo',
                    profileImage: profileImageUrl 
                },
                content: comment.comment || comment.content,
                createdAt: comment.createdAt,
                likes: comment.likes || 0,
                dislikes: comment.dislikes || 0,
                userReaction: comment.userReaction || null,
                answers: [], 
                answerCount: comment.answerCount || (comment.answers ? comment.answers.length : 0),
                showAnswers: false, 
                isAnswersLoading: false
            };
        }) : [];
        
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
  }, [videoId, refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null); 
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    setComments([]);
    setError(null);
    setReplyingTo(null);
    fetchComments();
  }, [videoId, fetchComments]);

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

  const handleInitiateReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
    Keyboard.dismiss();
  };
  
  const handleToggleAnswers = (comment: Comment) => {
    if (comment.answers && comment.answers.length > 0) {
        setComments(prev => 
            prev.map(c => 
                c.id === comment.id 
                    ? { ...c, showAnswers: !c.showAnswers } 
                    : c
            )
        );
    } 
    else if (comment.answerCount && comment.answerCount > 0 && !comment.isAnswersLoading) {
        fetchAnswersForComment(comment.id);
    }
  };


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

      const config = {
          headers: { 'Authorization': `Bearer ${token}` }
      };

      const parentCommentId = replyingTo?.id;
      const newCommentText = trimmedComment;
      setNewComment('');
      setReplyingTo(null); 
      Keyboard.dismiss();

      if (parentCommentId) {
        // Envío de respuesta
        await axios.post(
          `${API_URL}/answers`, 
          {
            commentId: parentCommentId, 
            answer: newCommentText 
          },
          config
        );
        
        // Recargar respuestas y mostrarlas
        await fetchAnswersForComment(parentCommentId, true); 

      } else {
        // Enviar comentario principal
        const response = await axios.post(
          `${API_URL}/comments`, 
          { 
            videoId,
            comment: newCommentText 
          },
          config
        );

        const newCommentData = response.data;
        
        // Actualización optimista de comentarios principales
        setComments(prev => [{
          id: newCommentData.id,
          user: {
            username: newCommentData.creator?.handle || 'Tú', 
            // ✅ Mapeamos la URL del perfil desde la propiedad 'imageURl'
            profileImage: newCommentData.creator?.imageURl 
          },
          content: newCommentData.content || newCommentData.comment,
          createdAt: newCommentData.createdAt || new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          userReaction: null,
          answers: [],
          answerCount: 0,
          showAnswers: false,
          isAnswersLoading: false
        }, ...prev]);
      }
      
    } catch (err: any) {
      console.error('Error posting:', err?.response?.status, err?.message);
      Alert.alert('Error', 'No se pudo publicar. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (commentId: number, reaction: 'LIKE' | 'DISLIKE') => {
    if (sending || !API_URL) return; 
    
    const token = await getToken();
    if (!token) {
         Alert.alert('Error de Sesión', 'Debes iniciar sesión para reaccionar.');
         return;
    }
    
    // Optimistic update 
    setComments(prev =>
      prev.map(comment => {
        if (comment.id === commentId) {
          const updatedComment = { ...comment };
          const oppositeReaction = reaction === 'LIKE' ? 'DISLIKE' : 'LIKE';
          
          if (comment.userReaction === reaction) {
            updatedComment.userReaction = null;
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']--;
          } 
          else if (comment.userReaction === oppositeReaction) {
            updatedComment[oppositeReaction === 'LIKE' ? 'likes' : 'dislikes']--;
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']++;
            updatedComment.userReaction = reaction;
          } 
          else {
            updatedComment[reaction === 'LIKE' ? 'likes' : 'dislikes']++;
            updatedComment.userReaction = reaction;
          }
          
          return updatedComment;
        }
        return comment;
      })
    );

    try {
      await axios.post(
        `${API_URL}/comments/${commentId}/react`,
        { reaction },
        { 
            headers: { 
                'Authorization': `Bearer ${token}` 
            } 
        }
      );
    } catch (err) {
      console.error('Error updating reaction:', err);
      fetchComments(); 
      Alert.alert('Error', 'No se pudo registrar la reacción.');
    }
  };

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

    if (!videoId) return null; 

    if (loading && comments.length === 0 && !refreshing) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ color: 'white', marginTop: 10 }}>Cargando comentarios...</Text>
          </View>
        );
    }
    if (error && comments.length === 0) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
            <Text style={{ color: 'white', textAlign: 'center', padding: 20 }}>{error}</Text>
            <TouchableOpacity onPress={fetchComments} style={{ marginTop: 10, padding: 10, backgroundColor: '#4CAF50', borderRadius: 5 }}>
              <Text style={{ color: 'white' }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        );
    }


  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Comentarios</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 100 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />
        }
      >
        {comments.length === 0 && !loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: 'gray' }}>No hay comentarios aún. ¡Sé el primero en comentar! ✍️</Text>
          </View>
        ) : (
          comments.map((item) => (
            <View className="flex-col w-full mb-4 px-4 py-2 border-b border-b-gray-800" key={item.id}>
              {/* Contenido del Comentario Principal */}
              <View className="flex-row items-start">
                
                <ProfileAvatar imageUrl={item.user.profileImage} size={44} />
                
                <View className="flex-1">
                  <Text className="text-lg text-green-400">{item.user?.username || 'Usuario'}</Text>
                  <Text className="text-white text-base">{item.content}</Text>
                </View>
              </View>

              <View style={{ marginLeft: 54, marginTop: 5 }}>
                  <View className="flex-row items-center justify-between pr-4">
                      <View className="flex-col">
                          <View className="flex-row items-center gap-6">
                              <Text style={{ color: "gray", fontSize: 12, marginRight: 10 }}>
                                {formatDate(item.createdAt)}
                              </Text>
                              <TouchableOpacity onPress={() => handleInitiateReply(item)}>
                                  <Text style={{ color: "#999", fontSize: 12, fontWeight: 'bold' }}>
                                    Responder
                                  </Text>
                              </TouchableOpacity>
                          </View>
                          {item.answerCount && item.answerCount > 0 && (
                              <View className="mt-1">
                                  <TouchableOpacity onPress={() => handleToggleAnswers(item)}>
                                      <Text style={{ color: "#999", fontSize: 12, fontWeight: 'bold' }}>
                                          {item.isAnswersLoading 
                                              ? 'Cargando...' 
                                              : (item.showAnswers 
                                                  ? 'Ocultar Respuestas' 
                                                  : `Ver Respuestas (${item.answerCount})`)}
                                      </Text>
                                  </TouchableOpacity>
                              </View>
                          )}
                      </View>
                  </View>

                  {/* --- RENDERIZADO DE RESPUESTAS ANIDADAS (SOLO SI showAnswers es TRUE) --- */}
                  {(item.answers && item.answers.length > 0 && item.showAnswers) && (
                      <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#444' }}>
                          {item.answers.map((answer) => (
                              <View key={answer.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' }}>
                                  
                                  <ProfileAvatar imageUrl={answer.user.profileImage} size={28} />
                                  
                                  <View style={{ flex: 1 }}>
                                      <Text style={{ color: '#ccc', fontSize: 14 }}>
                                          <Text style={{ fontWeight: 'bold', color: '#6AA84F' }}>
                                              {answer.user?.username || 'Usuario'}
                                          </Text>
                                          {' '}{answer.content}
                                      </Text>
                                      <Text style={{ color: "gray", fontSize: 10, marginTop: 1 }}>
                                          {formatDate(answer.createdAt)}
                                      </Text>
                                  </View>
                              </View>
                          ))}
                      </View>
                  )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* INPUT AREA */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: keyboardHeight,
          left: 0,
          right: 0,
          backgroundColor: "black",
          zIndex: 10,
          borderTopWidth: 1,
          borderTopColor: '#333',
        }}
      >
        {/* BARRA DE "RESPONDIENDO A..." */}
        {replyingTo && (
            <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingHorizontal: 15, 
                paddingVertical: 8,
                backgroundColor: '#1a1a1a' 
            }}>
                <Text style={{ color: '#ccc', fontSize: 13 }}>
                    Respondiendo a <Text style={{ fontWeight: 'bold', color: 'white' }}>{replyingTo.user.username}</Text>
                </Text>
                <TouchableOpacity onPress={handleCancelReply}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            </View>
        )}

        {/* CAJA DE TEXTO */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
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
                placeholder={replyingTo ? "Escribe tu respuesta..." : (isLogged ? "Escribe un comentario..." : "Inicia sesión...")}
                placeholderTextColor={"#666"}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
                editable={!sending && isLogged} 
            />

            <TouchableOpacity
                onPress={handleSendComment}
                disabled={!newComment.trim() || sending || !isLogged} 
                style={{
                position: "absolute",
                right: 10,
                top: 10,
                opacity: (newComment.trim() && isLogged) ? 1 : 0.5,
                }}
            >
                {sending ? (
                    <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                    <Ionicons name="send" size={20} color={(newComment.trim() && isLogged) ? "#4CAF50" : "gray"} />
                )}
            </TouchableOpacity>
            </View>
        </View>
      </Animated.View>
    </View>
  );
}