import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Tipos para mayor claridad
type UploadStatus = 'UPLOADING' | 'VERIFYING' | 'APROBADO' | 'RECHAZADO' | 'ERROR';

// -------- POLLING (Consultar estado) --------
async function pollStatus(
  videoId: number,
  token: string,
  onStatus?: (phase: UploadStatus) => void,
  attempt = 1
): Promise<UploadStatus> {

  try {
    const res = await axios.get(
      `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/${videoId}/status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const status = res.data.status;
    console.log(`⏳ Intento #${attempt}: Estado -> ${status}`);

    if (status === "APROBADO") return 'APROBADO';
    if (status === "RECHAZADO") return 'RECHAZADO';
    if (status === "ERROR") return 'ERROR';

    // Si sigue procesando, espera 3 segundos y reintenta
    onStatus?.('VERIFYING');
    await new Promise(r => setTimeout(r, 3000));
    return pollStatus(videoId, token, onStatus, attempt + 1);

  } catch (err: any) {
    console.log("❌ Error consultando estado:", err.message);
    return 'ERROR';
  }
}

// -------- REFRESH TOKEN --------
async function refreshAccessToken() {
  const refresh = await SecureStore.getItemAsync("refreshToken");
  if (!refresh) return null;

  try {
    const res = await axios.post(
      `${process.env.EXPO_PUBLIC_AWS_API_URL}/auth/refreshToken`,
      { refreshToken: refresh }
    );

    const newAccess = res.data.accessToken;
    await SecureStore.setItemAsync("accessToken", newAccess);
    // Nota: Si la API devuelve un nuevo Refresh Token, también deberías guardarlo
    return newAccess;

  } catch {
    return null;
  }
}

// -------- SUBIR VIDEO + PROGRESO --------
export default async function uploadVideo(
  uri: string,
  descripcion: string,
  thumbUri: string | null,
  onStatus?: (phase: UploadStatus) => void,
  onProgress?: (progress: number) => void   // <-- CALLBACK DE PROGRESO
): Promise<UploadStatus> {

  let token = await SecureStore.getItemAsync("accessToken");
  if (!token) token = await refreshAccessToken();
  if (!token) return 'ERROR';

  const form = new FormData();
  form.append("file", {
    uri,
    name: "video.mp4",
    type: "video/mp4",
  } as any);

  if (thumbUri) {
    form.append("thumbnail", {
      uri: thumbUri,
      name: "thumbnail.jpeg",
      type: "image/jpeg",
    } as any);
  }

  form.append("description", descripcion);

  const performUpload = async (authToken: string) => {
    return await axios.post(
      `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/upload`,
      form,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 600000, 
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total;
          if (total) {
            const percent = Math.round((progressEvent.loaded * 100) / total);
            // Aquí enviamos el % a la pantalla (0-100)
            if (onProgress) onProgress(percent); 
          }
        },
      }
    );
  };

  try {
    onStatus?.('UPLOADING');
    
    const res = await performUpload(token);
    const videoId = res.data.id;
    if (!videoId) return 'ERROR';

    onStatus?.('VERIFYING');
    const final = await pollStatus(videoId, token, onStatus);
    return final;

  } catch (err: any) {
    console.log("❌ Error upload:", err.response?.status || err.message);

    if (err.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return 'ERROR';

      try {
        const res2 = await performUpload(newToken);
        const videoId = res2.data.id;
        if (!videoId) return 'ERROR';

        onStatus?.('VERIFYING');
        const final = await pollStatus(videoId, newToken, onStatus);
        return final;
      } catch {
        return 'ERROR';
      }
    }

    return 'ERROR';
  }
}