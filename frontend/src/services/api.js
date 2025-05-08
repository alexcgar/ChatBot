// API service for the application

// URLs para las diferentes APIs
export const LOCAL_API_URL = 'http://127.0.0.1:5002';
const AUTH_URL = 'https://dinasa.wskserver.com:56544/api/login/authenticate';
const EXTERNAL_API_URL = 'https://dinasa.wskserver.com:56544/api/HTDV2/consult';

// Función para obtener el token de autenticación
const getAuthToken = async () => {
  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "Username": "apiuser",
        "Password": "XFBORp6srOlNY96qFLmr"
      }),
    });

    if (!response.ok) {
      throw new Error(`Error de autenticación: ${response.status}`);
    }

    // Imprime la respuesta cruda para depuración
    const responseText = (await response.text()).trim();
    console.log('Respuesta cruda de autenticación:', responseText);

    let token = responseText;

    // Si viene entre comillas dobles, quítalas
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    if (/^eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/.test(token)) {
      sessionStorage.setItem('auth_token', token);
      return token;
    }

    // Intentar parsear como JSON (fallback)
    try {
      const authData = JSON.parse(responseText);
      console.log('Respuesta parseada como JSON:', authData);
      if (authData && authData.token) {
        sessionStorage.setItem('auth_token', authData.token);
        return authData.token;
      }
    } catch (e) {
      console.log('No es JSON válido:', e);
    }

    throw new Error('No se pudo obtener un token válido');
  } catch (error) {
    console.error('Error en autenticación:', error);
    throw error;
  }
};

// Función para obtener las preguntas del formulario
export const fetchPreguntas = async () => {
  try {
    // Usar la API externa con autenticación
    const token = await getAuthToken();
    
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      // Si necesitas enviar datos en el cuerpo
      body: JSON.stringify({
        // Incluye parámetros aquí si son necesarios
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Datos recibidos de la API externa:', data);
    
    // IMPORTANTE: Devuelve el objeto completo en lugar de intentar procesarlo
    return data;
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    throw error;
  }
};

// Función para enviar respuestas del formulario (sigue usando la API local)
export const enviarRespuestas = async (respuestas) => {
  try {
    // Crear un session_id único para esta sesión
    const session_id = `session_${Date.now()}`;
    
    // Primero iniciar una sesión
    const initResponse = await fetch(`${LOCAL_API_URL}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        session_id: session_id,
        existing_answers: {} 
      }),
    });
    
    if (!initResponse.ok) {
      throw new Error(`Error al iniciar sesión: ${initResponse.status}`);
    }
    
    // Enviar cada respuesta en secuencia
    for (const [_, respuesta] of Object.entries(respuestas)) {
      const answerResponse = await fetch(`${LOCAL_API_URL}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session_id,
          answer: respuesta
        }),
      });
      
      if (!answerResponse.ok) {
        throw new Error(`Error al enviar respuesta: ${answerResponse.status}`);
      }
    }
    
    return { success: true, session_id };
  } catch (error) {
    console.error('Error al enviar respuestas:', error);
    throw error;
  }
};