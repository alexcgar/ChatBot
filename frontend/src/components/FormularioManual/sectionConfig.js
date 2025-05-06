import { 
  FaWarehouse, FaWater, FaShieldAlt, FaWind, 
  FaArchway, FaFilter, FaTint, FaFlask, 
  FaTractor, FaSeedling, FaLeaf
} from 'react-icons/fa';

// Configuración de las secciones del formulario
export const formSections = [
  {
    id: 'datos-generales',
    title: 'Datos Generales',
    description: 'Información básica del proyecto',
    icon: FaWarehouse,
    color: '#3498db',
    minOrder: 1,
    maxOrder: 6,
    expanded: true, // Inicialmente expandida
    idFirstQuestion: null // No tiene pregunta principal
  },
  {
    id: 'invernaderos',
    title: 'Invernaderos',
    description: 'Especificaciones técnicas de invernaderos',
    icon: FaWarehouse,
    color: '#2ecc71',
    minOrder: 7,
    maxOrder: 58,
    expanded: false,
    idFirstQuestion: "a3c6c678-3a65-495e-b36f-f345ca8e1af4"
  },
  {
    id: 'pantallas',
    title: 'Pantallas',
    description: 'Sistemas de pantallas y sombreo',
    icon: FaShieldAlt,
    color: '#9b59b6',
    minOrder: 59,
    maxOrder: 67,
    expanded: false,
    idFirstQuestion: "c28fe531-847d-4160-9aeb-da32e0c81a09"
  },
  {
    id: 'riego',
    title: 'Sistemas de Riego',
    description: 'Configuración de sistemas de riego',
    icon: FaWater,
    color: '#3498db',
    minOrder: 68,
    maxOrder: 98,
    expanded: false,
    idFirstQuestion: "1b580d4e-d2c2-4845-9ac3-7bdd643a4667"
  },
  {
    id: 'drenajes',
    title: 'Recogida de Drenajes',
    description: 'Sistemas de recogida y gestión de drenajes',
    icon: FaTint,
    color: '#1abc9c',
    minOrder: 99,
    maxOrder: 114,
    expanded: false,
    idFirstQuestion: "9701d818-fe0d-4c39-9eb3-0d6ed70cb252"
  },
  {
    id: 'depositos',
    title: 'Depósitos de Chapa',
    description: 'Especificaciones de depósitos',
    icon: FaArchway,
    color: '#e74c3c',
    minOrder: 116,
    maxOrder: 122,
    expanded: false,
    idFirstQuestion: "8aa4b5aa-b756-4990-9194-52262f38c2a5"
  },
  {
    id: 'embalse',
    title: 'Revestimiento de Embalse',
    description: 'Características del revestimiento',
    icon: FaWind,
    color: '#f39c12',
    minOrder: 123,
    maxOrder: 130,
    expanded: false,
    idFirstQuestion: "12ada762-d944-4faf-a148-b5bb6b62d149"
  },
  {
    id: 'osmosis',
    title: 'Planta de Ósmosis',
    description: 'Configuración de planta de ósmosis',
    icon: FaFilter,
    color: '#16a085',
    minOrder: 131,
    maxOrder: 137,
    expanded: false,
    idFirstQuestion: "731c8a1a-b730-4902-903f-a7de15502244"
  },
  {
    id: 'fitosanitarios',
    title: 'Sistemas Fitosanitarios',
    description: 'Protección y tratamientos',
    icon: FaFlask,
    color: '#27ae60',
    minOrder: 188,
    maxOrder: 190,
    expanded: false,
    idFirstQuestion: "ba3d6a21-2f5d-4d19-8400-eb0f1f95d6d5"
  },
  {
    id: 'carros',
    title: 'Carros de Trabajo',
    description: 'Equipamiento y carros de trabajo',
    icon: FaTractor,
    color: '#d35400',
    minOrder: 191,
    maxOrder: 205,
    expanded: false,
    idFirstQuestion: "32095b26-8a0f-48e5-bf65-e85056548310"
  },
  {
    id: 'semillero',
    title: 'Complementos Semillero',
    description: 'Elementos para semilleros',
    icon: FaSeedling,
    color: '#2ecc71',
    minOrder: 206,
    maxOrder: 214,
    expanded: false,
    idFirstQuestion: "0b39128b-0d61-428a-bb50-e6828b93cdda"
  }
];

// Función auxiliar para encontrar la sección de una pregunta
export const findQuestionSection = (question) => {
  if (!question || !question.Orden) return null;
  
  return formSections.find(
    section => question.Orden >= section.minOrder && question.Orden <= section.maxOrder
  );
};