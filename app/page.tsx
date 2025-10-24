"use client";

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Trash2, Plus, Check } from 'lucide-react';


interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  synced: boolean;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    initDB();
    loadTodosFromDB();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncTodos();
    }
  }, [isOnline]);

  const initDB = () => {
    const request = indexedDB.open('TodoDB', 1);
    request.onerror = () => console.error('Database failed to open');
    request.onsuccess = () => console.log('Database opened successfully');
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('todos')) {
        db.createObjectStore('todos', { keyPath: 'id' });
      }
    };
  };

  const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TodoDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const loadTodosFromDB = async () => {
    try {
      const db = await getDB();
      const transaction = db.transaction(['todos'], 'readonly');
      const objectStore = transaction.objectStore('todos');
      const request = objectStore.getAll();
      request.onsuccess = () => setTodos(request.result);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  const saveTodoDB = async (todo: Todo) => {
    try {
      const db = await getDB();
      const transaction = db.transaction(['todos'], 'readwrite');
      const objectStore = transaction.objectStore('todos');
      objectStore.put(todo);
    } catch (error) {
      console.error('Error saving todo:', error);
    }
  };

  const deleteTodoDB = async (id: string) => {
    try {
      const db = await getDB();
      const transaction = db.transaction(['todos'], 'readwrite');
      const objectStore = transaction.objectStore('todos');
      objectStore.delete(id);
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const syncTodos = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const syncedTodos = todos.map(todo => ({ ...todo, synced: true }));
    for (const todo of syncedTodos) {
      await saveTodoDB(todo);
    }
    setTodos(syncedTodos);
    setIsSyncing(false);
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
      synced: isOnline,
    };

    await saveTodoDB(todo);
    setTodos([...todos, todo]);
    setNewTodo('');

    if (isOnline) {
      console.log('Syncing new todo to server...');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const toggleTodo = async (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed, synced: isOnline } : todo
    );
    setTodos(updatedTodos);
    const todo = updatedTodos.find(t => t.id === id);
    if (todo) await saveTodoDB(todo);
    if (isOnline) {
      console.log('Syncing toggle to server...');
    }
  };

  const deleteTodo = async (id: string) => {
    await deleteTodoDB(id);
    setTodos(todos.filter(todo => todo.id !== id));
    if (isOnline) {
      console.log('Syncing deletion to server...');
    }
  };

  const unsyncedCount = todos.filter(t => !t.synced).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">My Todos</h1>
            <div className="flex items-center gap-3">
              {isSyncing && (
                <span className="text-sm text-gray-500 animate-pulse">Syncing...</span>
              )}
              {isOnline ? (
                <Cloud className="w-6 h-6 text-green-500" />
              ) : (
                <CloudOff className="w-6 h-6 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {unsyncedCount > 0 && !isOnline && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                {unsyncedCount} {unsyncedCount === 1 ? 'item' : 'items'} pending sync
              </p>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new todo..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addTodo}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No todos yet. Add one to get started!</p>
            ) : (
              todos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      todo.completed
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300 hover:border-indigo-600'
                    }`}
                  >
                    {todo.completed && <Check className="w-4 h-4 text-white" />}
                  </button>

                  <span
                    className={`flex-1 ${
                      todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {todo.text}
                  </span>

                  {!todo.synced && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Pending
                    </span>
                  )}

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {todos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>{todos.filter(t => !t.completed).length} active</span>
                <span>{todos.filter(t => t.completed).length} completed</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Offline Sync Features:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Works completely offline using IndexedDB</li>
            <li>Auto-syncs when connection is restored</li>
            <li>Shows pending sync status for offline changes</li>
            <li>Real-time online/offline detection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}