import { 
  FaWarehouse, FaWater, FaShieldAlt, FaWind, 
  FaArchway, FaFilter, FaTint, FaFlask, 
  FaTractor, FaSeedling, FaLeaf,
  FaHome,
  FaTelegram
} from 'react-icons/fa';

// Configuración de las secciones del formulario
export const formSections = [
  {
    id: 'datos-generales',
    title: 'Datos Generales',
    description: 'Información básica del proyecto',
    icon: FaTelegram,
    color: '#3498db',
    orderRanges: [
      { min: 1, max: 6 },
      { min: 215, max: 218 },
      { min: 223, max: 223 }
    ],
    expanded: true,
    idFirstQuestion: null
  },
  {
    id: 'invernaderos',
    title: 'Invernaderos',
    description: 'Especificaciones técnicas de invernaderos',
    icon: FaWarehouse,
    color: '#2ecc71',
    orderRanges: [{ min: 7, max: 58 }],
    expanded: false,
    idFirstQuestion: "a3c6c678-3a65-495e-b36f-f345ca8e1af4"
  },
    {
    id: 'casamalla',
    title: 'Casamalla',
    description: 'Estructuras de malla y protección',
    icon: FaHome,
    color: '#f39c12', // Color naranja para diferenciarla
    orderRanges: [{ min: 58.1, max: 59.7 }],
    expanded: false,
    idFirstQuestion: null // Se deberá establecer cuando esté disponible
  },
  {
    id: 'pantallas',
    title: 'Pantallas',
    description: 'Sistemas de pantallas y sombreo',
    icon: FaShieldAlt,
    color: '#9b59b6',
    orderRanges: [{ min: 59, max: 67 }],
    expanded: false,
    idFirstQuestion: "c28fe531-847d-4160-9aeb-da32e0c81a09"
  },
  {
    id: 'riego',
    title: 'Sistemas de Riego',
    description: 'Configuración de sistemas de riego',
    icon: FaWater,
    color: '#3498db',
    orderRanges: [{ min: 68, max: 98 }],
    expanded: false,
    idFirstQuestion: "1b580d4e-d2c2-4845-9ac3-7bdd643a4667"
  },
  {
    id: 'drenajes',
    title: 'Recogida de Drenajes',
    description: 'Sistemas de recogida y gestión de drenajes',
    icon: FaTint,
    color: '#1abc9c',
    orderRanges: [{ min: 99, max: 114 }],
    expanded: false,
    idFirstQuestion: "9701d818-fe0d-4c39-9eb3-0d6ed70cb252"
  },
  {
    id: 'depositos',
    title: 'Depósitos de Chapa',
    description: 'Especificaciones de depósitos',
    icon: FaArchway,
    color: '#e74c3c',
    orderRanges: [{ min: 116, max: 122 }],
    expanded: false,
    idFirstQuestion: "8aa4b5aa-b756-4990-9194-52262f38c2a5"
  },
  {
    id: 'embalse',
    title: 'Revestimiento de Embalse',
    description: 'Características del revestimiento',
    icon: FaWind,
    color: '#f39c12',
    orderRanges: [{ min: 123, max: 130 }],
    expanded: false,
    idFirstQuestion: "12ada762-d944-4faf-a148-b5bb6b62d149"
  },
  {
    id: 'osmosis',
    title: 'Planta de Ósmosis',
    description: 'Configuración de planta de ósmosis',
    icon: FaFilter,
    color: '#16a085',
    orderRanges: [{ min: 131, max: 137 }],
    expanded: false,
    idFirstQuestion: "731c8a1a-b730-4902-903f-a7de15502244"
  },
  {
    id: 'fitosanitarios',
    title: 'Sistemas Fitosanitarios',
    description: 'Protección y tratamientos',
    icon: FaFlask,
    color: '#27ae60',
    orderRanges: [{ min: 188, max: 190 }],
    expanded: false,
    idFirstQuestion: "ba3d6a21-2f5d-4d19-8400-eb0f1f95d6d5"
  },
  {
    id: 'carros',
    title: 'Carros de Trabajo',
    description: 'Equipamiento y carros de trabajo',
    icon: FaTractor,
    color: '#d35400',
    orderRanges: [{ min: 191, max: 205 }],
    expanded: false,
    idFirstQuestion: "32095b26-8a0f-48e5-bf65-e85056548310"
  },
  {
    id: 'semillero',
    title: 'Complementos Semillero',
    description: 'Elementos para semilleros',
    icon: FaSeedling,
    color: '#2ecc71',
    orderRanges: [{ min: 206, max: 214 }],
    expanded: false,
    idFirstQuestion: "0b39128b-0d61-428a-bb50-e6828b93cdda"
  },
  {
    id: 'hojas',
    title: 'Hojas de Cultivo',
    description: 'Especificaciones de hojas de cultivo',
    icon: FaLeaf,
    color: '#8e44ad',
    orderRanges: [{ min: 219, max: 296 }],
    expanded: false,
    idFirstQuestion: "a2f3b0d4-5c1b-4f7c-9a6d-0e5f3c8b1a2d"
  }
];

// Añade estas funciones al archivo sectionConfig.js si no existen

export const findQuestionSection = (questionId, questions) => {
  // Primero buscamos la pregunta por su ID
  const question = questions.find(q => q.IDQuestion === questionId);
  
  // Si no encontramos la pregunta o no tiene Orden, retornamos null
  if (!question || typeof question.Orden !== 'number') return null;
  
  // Buscamos la sección a la que pertenece según su Orden
  return formSections.find(section => 
    section.orderRanges.some(range => 
      question.Orden >= range.min && question.Orden <= range.max
    )
  ) || null;
};

export const findNextQuestion = (questions, formData, sectionId = null) => {
  // Filtrar preguntas por sección si se proporciona un sectionId
  const filteredQuestions = sectionId 
    ? questions.filter(q => {
        if (!q || typeof q.Orden !== 'number') return false;
        
        const section = formSections.find(s => s.id === sectionId);
        if (!section) return false;
        
        return section.orderRanges.some(range => 
          q.Orden >= range.min && q.Orden <= range.max
        );
      })
    : [...questions];
    
  // Ordenar las preguntas por su número de orden
  const sortedQuestions = filteredQuestions.sort((a, b) => {
    // Primero por orden de aparición
    if (a.Orden && b.Orden) {
      return a.Orden - b.Orden;
    }
    return 0;
  });
  
  // Buscar la primera pregunta vacía
  const nextQuestion = sortedQuestions.find(q => {
    // Verificar que la pregunta sea válida y tenga un ID
    if (!q || !q.IDQuestion) return false;
    
    // Verificar si el campo está vacío
    const value = formData[q.IDQuestion];
    return value === undefined || value === null || value === '';
  });
  
  return nextQuestion || null;
};