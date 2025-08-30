'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// --- Types ---
type Mission = {
  id: number;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
};

type Astronaut = {
  id: number;
  name: string;
  email: string;
  missions: Mission[];
};


// --- Components ---

const AstronautFormModal = ({ isOpen, onClose, onSuccess, astronaut }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; astronaut?: Astronaut | null; }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!astronaut;

  useEffect(() => {
    if (isOpen) {
      setName(isEditMode ? astronaut.name : '');
      setEmail(isEditMode ? astronaut.email : '');
      setError('');
    }
  }, [isOpen, astronaut, isEditMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!name || !email) {
      setError('Nombre y email son obligatorios.');
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const url = isEditMode ? `${apiUrl}/astronauts/${astronaut.id}` : `${apiUrl}/astronauts/`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'La operación falló.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{isEditMode ? 'Editar Astronauta' : 'Crear Nuevo Astronauta'}</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} disabled={isLoading} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50">{isLoading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const MissionModal = ({ isOpen, onClose, astronaut, onSuccess }: { isOpen: boolean; onClose: () => void; astronaut: Astronaut | null; onSuccess: () => void; }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !astronaut) return null;

  const handleAddMission = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title) {
      setError('El título de la misión es obligatorio.');
      return;
    }
    
    setIsLoading(true);
    const token = localStorage.getItem('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    
    try {
      const response = await fetch(`${apiUrl}/astronauts/${astronaut.id}/missions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, status: 'PENDING' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'No se pudo añadir la misión.');
      }

      onSuccess();
      setTitle('');
      setDescription('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Misiones de {astronaut.name}</h2>
        
        <div className="mb-6 max-h-48 overflow-y-auto">
          {astronaut.missions.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {astronaut.missions.map(mission => (
                <li key={mission.id}>
                  <strong className="font-semibold">{mission.title}</strong> ({mission.status})
                  {mission.description && <p className="text-sm text-gray-400 ml-5">{mission.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Este astronauta no tiene misiones asignadas.</p>
          )}
        </div>

        <hr className="border-gray-600 my-4" />

        <h3 className="text-xl font-bold mb-4">Añadir Nueva Misión</h3>
        <form onSubmit={handleAddMission}>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="mb-4">
            <label htmlFor="mission-title" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
            <input type="text" id="mission-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
          </div>
          <div className="mb-4">
            <label htmlFor="mission-desc" className="block text-sm font-medium text-gray-300 mb-1">Descripción (Opcional)</label>
            <textarea id="mission-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" rows={2}></textarea>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} disabled={isLoading} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cerrar</button>
            <button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">{isLoading ? 'Añadiendo...' : 'Añadir Misión'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function HomePage() {
  const [astronauts, setAstronauts] = useState<Astronaut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAstroModalOpen, setIsAstroModalOpen] = useState(false);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  
  const [selectedAstronaut, setSelectedAstronaut] = useState<Astronaut | null>(null);
  const router = useRouter();

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    router.push('/');
  }, [router]);

  const fetchAstronauts = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      handleLogout();
      return;
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
      const response = await fetch(`${apiUrl}/astronauts/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) handleLogout();
        throw new Error('No se pudieron obtener los datos de los astronautas.');
      }
      const data: Astronaut[] = await response.json();
      setAstronauts(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    fetchAstronauts();
  }, [fetchAstronauts]);


  const openCreateModal = () => {
    setSelectedAstronaut(null);
    setIsAstroModalOpen(true);
  };
  
  const openEditModal = (astronaut: Astronaut) => {
    setSelectedAstronaut(astronaut);
    setIsAstroModalOpen(true);
  };

  const openMissionModal = (astronaut: Astronaut) => {
    setSelectedAstronaut(astronaut);
    setIsMissionModalOpen(true);
  };

  const handleDelete = async (astronautId: number) => {
    if (typeof window !== 'undefined' && !window.confirm('¿Estás seguro de que quieres eliminar a este astronauta?')) {
      return;
    }
    const token = localStorage.getItem('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    try {
      const response = await fetch(`${apiUrl}/astronauts/${astronautId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('No se pudo eliminar el astronauta.');
      
      await fetchAstronauts();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">Cargando...</div>;
  }

  return (
    <>
      <AstronautFormModal 
        isOpen={isAstroModalOpen}
        onClose={() => setIsAstroModalOpen(false)}
        onSuccess={fetchAstronauts}
        astronaut={selectedAstronaut}
      />
      <MissionModal
        isOpen={isMissionModalOpen}
        onClose={() => setIsMissionModalOpen(false)}
        astronaut={selectedAstronaut}
        onSuccess={fetchAstronauts}
      />

      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <h1 className="text-3xl font-bold mb-4 sm:mb-0">Gestión de Astronautas</h1>
            <div className="flex items-center gap-4">
              <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150">+ Crear Astronauta</button>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150">Cerrar Sesión</button>
            </div>
          </header>

          {error && <p className="text-red-400 bg-red-900/50 p-3 rounded mb-4">{error}</p>}
          
          <div className="bg-gray-800 shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-700 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-700 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-700 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {astronauts.length > 0 ? (
                  astronauts.map((astro) => (
                    <tr key={astro.id} className="hover:bg-gray-700">
                      <td className="px-5 py-4 border-b border-gray-700 text-sm">
                        <p className="text-gray-200 whitespace-no-wrap">{astro.name}</p>
                      </td>
                      <td className="px-5 py-4 border-b border-gray-700 text-sm">
                        <p className="text-gray-200 whitespace-no-wrap">{astro.email}</p>
                      </td>
                      <td className="px-5 py-4 border-b border-gray-700 text-sm whitespace-nowrap">
                        <button onClick={() => openMissionModal(astro)} className="text-green-400 hover:text-green-300 font-semibold mr-4 transition duration-150">Misiones</button>
                        <button onClick={() => openEditModal(astro)} className="text-indigo-400 hover:text-indigo-300 font-semibold mr-4 transition duration-150">Editar</button>
                        <button onClick={() => handleDelete(astro.id)} className="text-red-400 hover:text-red-300 font-semibold transition duration-150">Eliminar</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-gray-400">No hay astronautas registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

