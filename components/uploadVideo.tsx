import axios from "axios";
import * as SecureStore from "expo-secure-store";

// 🔁 -------- POLLING (CONSULTAR ESTADO DEL VIDEO) ---------
async function pollStatus(
  videoId: number,
  token: string,
  onStatus?: (phase: 'VERIFYING', attempt?: number) => void,
  attempt = 1
): Promise<'APROBADO' | 'RECHAZADO' | 'ERROR'> {
  try {
    const res = await axios.get(
      `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/${videoId}/status`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const status = res.data.status;
    console.log(`⏳ Intento #${attempt}: Estado -> ${status}`);

    if (status === "APROBADO") {
      console.log("🎉 ¡ÉXITO! El video fue aprobado por la IA.");
      return 'APROBADO';
    }

    if (status === "RECHAZADO") {
      console.log("🚫 El video fue rechazado por la IA.");
      return 'RECHAZADO';
    }

    if (status === "ERROR") {
      console.log("❌ Error interno en el procesamiento del video.");
      return 'ERROR';
    }

    // Si sigue PROCESANDO
    onStatus?.('VERIFYING', attempt);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return pollStatus(videoId, token, onStatus, attempt + 1);

  } catch (err: any) {
    console.log("❌ Error consultando estado:", err.message);
    return 'ERROR';
  }
}

// 🔐 -------- REFRESH TOKEN --------
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
    return newAccess;

  } catch (e: any) {
    console.log("No se pudo refrescar:", e.response?.data);
    return null;
  }
}


// 📤 -------- SUBIR VIDEO CON FLUJO COMPLETO --------
export default async function uploadVideo(
  uri: string,
  descripcion: string,
  // 🚨 CORRECCIÓN 1: Agregar el parámetro para la URI de la miniatura
  thumbUri: string | null, 
  onStatus?: (phase: 'UPLOADING' | 'VERIFYING' | 'APROBADO' | 'RECHAZADO' | 'ERROR') => void
): Promise<'APROBADO' | 'RECHAZADO' | 'ERROR'> {

  let token = await SecureStore.getItemAsync("accessToken");
  if (!token) token = await refreshAccessToken();
  if (!token) return 'ERROR';

  // Crear FormData
  const form = new FormData();
  
  // Video
  form.append("file", {
    uri,
    name: "video.mp4",
    type: "video/mp4",
  } as any);
  
  // 🚨 CORRECCIÓN 2: Adjuntar la miniatura al FormData si existe
  if (thumbUri) {
    form.append("thumbnail", {
      uri: thumbUri,
      name: "thumbnail.jpeg",
      type: "image/jpeg", // Asumiendo que VideoThumbnails genera JPEG
    } as any);
  }
  
  form.append("description", descripcion);

  try {
    console.log("🚀 Iniciando subida rápida del video…");
    onStatus?.('UPLOADING');

    const t0 = Date.now();

    const res = await axios.post(
      `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/upload`,
      form,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 500000,
      }
    );

    const t1 = Date.now();

    console.log(`✅ Respuesta recibida en ${(t1 - t0) / 1000} segundos`);
    console.log("📄 Respuesta del backend:", res.data);

    const videoId = res.data.id;

    if (!videoId) {
      console.log("❌ El backend NO devolvió videoId. Revisa tu DTO.");
      return 'ERROR';
    }

    console.log(`\n🔍 Iniciando Polling para el video ID: ${videoId}...\n`);
    onStatus?.('VERIFYING');
    const final = await pollStatus(videoId, token, () => onStatus?.('VERIFYING'));
    onStatus?.(final);
    return final;

  } catch (err: any) {
    console.log("Error upload 1:", err.response?.status, err.response?.data);

    if (err.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return 'ERROR';

      try {
        const res = await axios.post(
          `${process.env.EXPO_PUBLIC_AWS_API_URL}/videos/upload`,
          form, // Reutilizamos el mismo formulario (con la miniatura)
          {
            headers: { Authorization: `Bearer ${newToken}` },
            timeout: 500000,
          }
        );

        console.log("Video subido después del refresh:", res.data);

        const videoId = res.data.id;
        if (!videoId) {
          console.log("❌ El backend no devolvió videoId después del refresh.");
          return 'ERROR';
        }

        onStatus?.('VERIFYING');
        const final = await pollStatus(videoId, newToken, () => onStatus?.('VERIFYING'));
        onStatus?.(final);
        return final;

      } catch (err2: any) {
        console.log("Error upload después del refresh:", err2.response);
        return 'ERROR';
      }
    }
    return 'ERROR';
  }
}