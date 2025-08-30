'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// --- Types ---
type Mission = {
  id: number;
  title: string;
  description: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
};

type Astronaut = {
  id: number;
  name: string;
  email: string;
};

// --- Components ---

const AstronautFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  astronaut,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  astronaut?: Astronaut | null;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!astronaut;

  useEffect(() => {
    if (isOpen && astronaut) {
      setName(astronaut.name);
      setEmail(astronaut.email);
    } else if (isOpen) {
      setName('');
      setEmail('');
    }
    setError('');
  }, [isOpen, astronaut]);

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
    const url = isEditMode ? `http://127.0.0.1:8000/astronauts/${astronaut.id}` : 'http://127.0.0.1:8000/astronauts/';
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
    } catch (err: any) {
      setError(err.message);
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

const MissionsModal = ({
  isOpen,
  onClose,
  astronaut,
}: {
  isOpen: boolean;
  onClose: () => void;
  astronaut: Astronaut | null;
}) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchMissions = async () => {
      if (!astronaut) return;
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      try {
        const response = await fetch(`http://127.0.0.1:8000/astronauts/${astronaut.id}/missions/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch missions.');
        const data = await response.json();
        setMissions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchMissions();
    }
  }, [isOpen, astronaut]);
  
  const handleCreateMission = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !astronaut) return;

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`http://127.0.0.1:8000/astronauts/${astronaut.id}/missions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title, description, status: 'Pending' }),
        });
        if (!response.ok) throw new Error('Failed to create mission.');
        const newMission = await response.json();
        setMissions([...missions, newMission]);
        setTitle('');
        setDescription('');
    } catch (error) {
        console.error(error);
    }
  };

  if (!isOpen || !astronaut) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Misiones de {astronaut.name}</h2>
        <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Asignar Nueva Misión</h3>
            <form onSubmit={handleCreateMission} className="flex flex-col sm:flex-row gap-4">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la misión" className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500" />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500" />
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150">Asignar</button>
            </form>
        </div>
        <div>
            <h3 className="text-xl font-semibold mb-3">Misiones Asignadas</h3>
            {isLoading ? <p>Cargando misiones...</p> : (
                <ul className="space-y-3 max-h-60 overflow-y-auto">
                    {missions.length > 0 ? missions.map(mission => (
                        <li key={mission.id} className="bg-gray-700 p-3 rounded-md">
                            <p className="font-bold">{mission.title}</p>
                            <p className="text-sm text-gray-400">{mission.description}</p>
                            <span className="text-xs text-yellow-400">{mission.status}</span>
                        </li>
                    )) : <p className="text-gray-400">Este astronauta no tiene misiones asignadas.</p>}
                </ul>
            )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition duration-150">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function HomePage() {
  const [astronauts, setAstronauts] = useState<Astronaut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
  const [selectedAstronaut, setSelectedAstronaut] = useState<Astronaut | null>(null);
  const router = useRouter();

  const fetchAstronauts = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/astronauts/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) handleLogout();
        throw new Error('No se pudieron obtener los datos de los astronautas.');
      }
      const data: Astronaut[] = await response.json();
      setAstronauts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAstronauts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/');
  };

  const openCreateModal = () => {
    setSelectedAstronaut(null);
    setIsFormModalOpen(true);
  };
  
  const openEditModal = (astronaut: Astronaut) => {
    setSelectedAstronaut(astronaut);
    setIsFormModalOpen(true);
  };

  const openMissionsModal = (astronaut: Astronaut) => {
    setSelectedAstronaut(astronaut);
    setIsMissionsModalOpen(true);
  };

  const handleDelete = async (astronautId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este astronauta?')) {
      return;
    }
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`http://127.0.0.1:8000/astronauts/${astronautId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('No se pudo eliminar el astronauta.');
      await fetchAstronauts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">Cargando...</div>;
  }

  return (
    <>
      <AstronautFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchAstronauts}
        astronaut={selectedAstronaut}
      />
      <MissionsModal
        isOpen={isMissionsModalOpen}
        onClose={() => setIsMissionsModalOpen(false)}
        astronaut={selectedAstronaut}
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
                        <button onClick={() => openMissionsModal(astro)} className="bg-green-600 hover:bg-green-500 text-white font-semibold py-1 px-3 rounded text-xs mr-2 transition duration-150">Misiones</button>
                        <button onClick={() => openEditModal(astro)} className="text-indigo-400 hover:text-indigo-300 font-semibold mr-2 transition duration-150">Editar</button>
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

