import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Plus,
  Search,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  LogOut,
  User,
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  PlayCircle,
  X,
  AlertCircle,
  Menu,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Info,
  Sun,
  Moon
} from 'lucide-react';

// Color Palette Guidelines:
// Dark Theme:
//   - Main BG: #2f242c
//   - Containers & Sidebar: #502274
//   - Primary Accents: #a42cd6
//   - Secondary text & Badges: #c179b9
//   - Highlights & Text: #e2c2c6
// Light Theme:
//   - Main BG: #f8f4f9 (soft lavender white)
//   - Containers & Cards: #ffffff
//   - Borders & Dividers: #e2c2c6 / #dfc8d9
//   - Primary Headers & Text: #2f242c / #502274
//   - Primary Accents: #a42cd6
//   - Secondary Badges & Subtext: #502274 / #7b3896

const SEED_USERS = [
  {
    id: 'user-demo-1',
    name: 'Maria Silva',
    email: 'demo@taskflow.com',
    password: 'password123'
  }
];

const SEED_TASKS = [
  {
    id: 'task-1',
    userId: 'user-demo-1',
    title: 'Elaborar arquitetura da API TaskFlow',
    description: 'Definir os endpoints RESTful, esquema de banco de dados e integrações com JWT.',
    status: 'EM_ANDAMENTO',
    dueDate: '2026-11-20',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    userId: 'user-demo-1',
    title: 'Criar testes unitários do serviço de Usuário',
    description: 'Implementar suíte de testes com Jest para cadastro, login e validações de e-mail.',
    status: 'PENDENTE',
    dueDate: '2026-11-15',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    userId: 'user-demo-1',
    title: 'Configurar pipeline CI/CD no GitHub Actions',
    description: 'Automatizar build, testes e deploy contínuo em ambiente de homologação.',
    status: 'CONCLUIDA',
    dueDate: '2026-11-05',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-4',
    userId: 'user-demo-1',
    title: 'Revisar documentação de requisitos',
    description: 'Validar com a equipe de produto as regras de travamento de tarefas concluídas.',
    status: 'PENDENTE',
    dueDate: '2026-11-25',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('taskflow_theme');
    return savedTheme || 'dark';
  });

  // Initialize LocalStorage Data
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('taskflow_users');
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('taskflow_tasks');
    return saved ? JSON.parse(saved) : SEED_TASKS;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('taskflow_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Forms State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authErrors, setAuthErrors] = useState({});

  // Dashboard Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc' | 'none'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Task Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  });
  const [taskErrors, setTaskErrors] = useState({});

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('taskflow_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('taskflow_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('taskflow_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('taskflow_current_user');
    }
  }, [currentUser]);

  // Toggle Theme Handler
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(`Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'} ativado.`, 'info');
  };

  // Toast Helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Auth Handlers
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (authMode === 'register' && !authForm.name.trim()) {
      errors.name = 'O nome é obrigatório.';
    }

    if (!authForm.email.trim() || !/\S+@\S+\.\S+/.test(authForm.email)) {
      errors.email = 'Informe um e-mail válido.';
    }

    if (!authForm.password || authForm.password.length < 6) {
      errors.password = 'A senha deve conter no mínimo 6 caracteres.';
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      return;
    }

    setAuthErrors({});

    if (authMode === 'login') {
      const user = users.find(
        (u) => u.email.toLowerCase() === authForm.email.toLowerCase() && u.password === authForm.password
      );
      if (user) {
        setCurrentUser(user);
        showToast(`Bem-vindo(a) de volta, ${user.name}!`, 'success');
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        setAuthErrors({ form: 'E-mail ou senha incorretos.' });
      }
    } else {
      const existing = users.find((u) => u.email.toLowerCase() === authForm.email.toLowerCase());
      if (existing) {
        setAuthErrors({ email: 'Este e-mail já está cadastrado.' });
        return;
      }

      const newUser = {
        id: `user-${Date.now()}`,
        name: authForm.name.trim(),
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password
      };

      setUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      showToast(`Conta criada com sucesso! Bem-vindo(a), ${newUser.name}!`, 'success');
      setAuthForm({ name: '', email: '', password: '' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Você saiu do sistema.', 'info');
  };

  const handleFillDemo = () => {
    setAuthForm({
      name: '',
      email: 'demo@taskflow.com',
      password: 'password123'
    });
    setAuthMode('login');
  };

  // Task Validations
  const validateTaskForm = () => {
    const errors = {};
    const titleLen = taskForm.title.trim().length;

    if (titleLen < 3 || titleLen > 200) {
      errors.title = 'O Nome da tarefa deve possuir entre 3 e 200 caracteres.';
    }

    if (taskForm.description && taskForm.description.length > 2000) {
      errors.description = 'A Descrição deve conter no máximo 2000 caracteres.';
    }

    setTaskErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Task
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!validateTaskForm()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      userId: currentUser.id,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      dueDate: taskForm.dueDate || null,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };

    setTasks((prev) => [newTask, ...prev]);
    setIsCreateOpen(false);
    setTaskForm({ title: '', description: '', dueDate: '' });
    showToast('Tarefa criada com sucesso!', 'success');
  };

  // Edit Task
  const handleOpenEdit = (task) => {
    if (task.status === 'CONCLUIDA') {
      showToast('Esta tarefa está concluída e travada para alterações de status.', 'info');
    }
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || ''
    });
    setTaskErrors({});
  };

  const handleUpdateTask = (e) => {
    e.preventDefault();
    if (!validateTaskForm()) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: taskForm.title.trim(),
              description: taskForm.description.trim(),
              dueDate: taskForm.dueDate || null
            }
          : t
      )
    );

    setEditingTask(null);
    setTaskForm({ title: '', description: '', dueDate: '' });
    showToast('Tarefa atualizada com sucesso!', 'success');
  };

  // Delete Task
  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
    setTaskToDelete(null);
    showToast('Tarefa removida permanentemente.', 'info');
  };

  // Status Change Logic & Drag-and-Drop Rules
  const moveTaskStatus = (taskId, targetStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // RULE ENFORCEMENT: Locked completed task cannot move back!
    if (task.status === 'CONCLUIDA' && targetStatus !== 'CONCLUIDA') {
      showToast('Ação bloqueada! Tarefas concluídas ficam travadas e não podem voltar de status.', 'error');
      return;
    }

    if (task.status === targetStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    if (targetStatus === 'CONCLUIDA') {
      showToast('Parabéns! Tarefa concluída e travada permanentemente.', 'success');
    } else {
      showToast(`Status alterado para: ${getStatusLabel(targetStatus)}`, 'info');
    }
  };

  // Drag Handlers
  const handleDragStart = (e, task) => {
    if (task.status === 'CONCLUIDA') {
      showToast('Tarefas concluídas estão travadas e não podem ser arrastadas para outras colunas!', 'error');
      e.preventDefault();
      return;
    }
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (id) {
      moveTaskStatus(id, targetStatus);
    }
    setDraggedTaskId(null);
  };

  // Filter & Sort Tasks for Logged In User
  const userTasks = useMemo(() => {
    if (!currentUser) return [];

    return tasks.filter((t) => {
      if (t.userId !== currentUser.id) return false;

      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = t.title.toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'none') return 0;

      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();

      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [tasks, currentUser, searchQuery, statusFilter, sortOrder]);

  const pendingTasks = useMemo(() => userTasks.filter((t) => t.status === 'PENDENTE'), [userTasks]);
  const inProgressTasks = useMemo(() => userTasks.filter((t) => t.status === 'EM_ANDAMENTO'), [userTasks]);
  const completedTasks = useMemo(() => userTasks.filter((t) => t.status === 'CONCLUIDA'), [userTasks]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'CONCLUIDA':
        return 'Concluída';
      default:
        return status;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sem prazo';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const isOverdue = (dateStr, status) => {
    if (!dateStr || status === 'CONCLUIDA') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    return due < today;
  };

  // Dynamic Theme CSS Helpers
  const isDark = theme === 'dark';

  const themeClasses = {
    bgMain: isDark ? 'bg-[#2f242c] text-[#e2c2c6]' : 'bg-[#f8f4f9] text-[#2f242c]',
    bgSidebar: isDark ? 'bg-[#502274] border-[#c179b9]/20' : 'bg-white border-[#e2c2c6] shadow-sm',
    bgHeader: isDark ? 'bg-[#502274]/90 border-[#c179b9]/20' : 'bg-white/95 border-[#e2c2c6] shadow-sm',
    bgCardSidebar: isDark ? 'bg-[#2f242c]/60 border-[#c179b9]/20' : 'bg-[#f8f4f9] border-[#e2c2c6]',
    bgFilterSection: isDark ? 'bg-[#2f242c] border-[#c179b9]/10' : 'bg-[#f8f4f9] border-[#e2c2c6]',
    bgFilterInput: isDark
      ? 'bg-[#502274]/50 border-[#c179b9]/30 text-white placeholder-[#e2c2c6]/50 focus:border-[#a42cd6]'
      : 'bg-white border-[#e2c2c6] text-[#2f242c] placeholder-[#502274]/40 focus:border-[#a42cd6] shadow-sm',
    bgAuthCard: isDark
      ? 'bg-[#502274]/80 border-[#c179b9]/30 text-[#e2c2c6]'
      : 'bg-white/95 border-[#e2c2c6] text-[#2f242c] shadow-2xl',
    bgAuthInput: isDark
      ? 'bg-[#2f242c]/80 border-[#c179b9]/40 text-white placeholder-[#e2c2c6]/40'
      : 'bg-[#f8f4f9] border-[#e2c2c6] text-[#2f242c] placeholder-[#502274]/40',
    bgColumn: isDark ? 'bg-[#502274]/40' : 'bg-white/70 border-[#e2c2c6]',
    bgTaskCard: isDark
      ? 'bg-[#2f242c] border-[#c179b9]/30 text-[#e2c2c6] hover:border-[#a42cd6]/60'
      : 'bg-[#ffffff] border-[#e2c2c6] text-[#2f242c] hover:border-[#a42cd6]/80 shadow-sm',
    textHeader: isDark ? 'text-white' : 'text-[#2f242c]',
    textSub: isDark ? 'text-[#e2c2c6]/70' : 'text-[#502274]/80',
    textTitle: isDark ? 'text-white' : 'text-[#2f242c]',
    textDesc: isDark ? 'text-[#e2c2c6]/80' : 'text-[#502274]/90',
    bgModal: isDark ? 'bg-[#502274] border-[#c179b9]/30 text-white' : 'bg-white border-[#e2c2c6] text-[#2f242c]',
    bgModalInput: isDark
      ? 'bg-[#2f242c] border-[#c179b9]/40 text-white placeholder-[#e2c2c6]/40'
      : 'bg-[#f8f4f9] border-[#e2c2c6] text-[#2f242c] placeholder-[#502274]/40',
    buttonToggle: isDark
      ? 'bg-[#2f242c] text-amber-300 hover:bg-[#2f242c]/80 border-[#c179b9]/30'
      : 'bg-[#f8f4f9] text-[#502274] hover:bg-[#e2c2c6]/30 border-[#e2c2c6]'
  };

  // RENDER AUTH SCREEN (If no user is logged in)
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${themeClasses.bgMain} flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans transition-colors duration-300`}>
        {/* Decorative background glow */}
        <div className={`absolute -top-32 -left-32 w-96 h-96 ${isDark ? 'bg-[#a42cd6] opacity-20' : 'bg-[#c179b9] opacity-25'} blur-3xl rounded-full pointer-events-none`}></div>
        <div className={`absolute -bottom-32 -right-32 w-96 h-96 ${isDark ? 'bg-[#502274] opacity-40' : 'bg-[#a42cd6] opacity-15'} blur-3xl rounded-full pointer-events-none`}></div>

        {/* Top Right Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-md transition-all ${themeClasses.buttonToggle}`}
            title="Alternar entre Modo Claro e Escuro"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-[#502274]" />}
            <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </div>

        <div className={`w-full max-w-md backdrop-blur-md rounded-2xl border p-8 z-10 transition-colors duration-300 ${themeClasses.bgAuthCard}`}>
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-gradient-to-tr from-[#a42cd6] to-[#c179b9] rounded-xl shadow-lg mb-3">
              <Layout className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${themeClasses.textHeader}`}>TaskFlow</h1>
            <p className={`text-sm mt-1 ${themeClasses.textSub}`}>Gerenciador de Tarefas no estilo Kanban</p>
          </div>

          {/* Toggle Login / Register */}
          <div className={`flex p-1 rounded-xl mb-6 border ${isDark ? 'bg-[#2f242c]/60 border-[#c179b9]/20' : 'bg-[#f8f4f9] border-[#e2c2c6]'}`}>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthErrors({});
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-[#a42cd6] text-white shadow'
                  : `${isDark ? 'text-[#e2c2c6]/70 hover:text-white' : 'text-[#502274]/70 hover:text-[#502274]'}`
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthErrors({});
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-[#a42cd6] text-white shadow'
                  : `${isDark ? 'text-[#e2c2c6]/70 hover:text-white' : 'text-[#502274]/70 hover:text-[#502274]'}`
              }`}
            >
              Criar Conta
            </button>
          </div>

          {authErrors.form && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authErrors.form}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSub}`}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#a42cd6] focus:ring-1 focus:ring-[#a42cd6] transition ${themeClasses.bgAuthInput}`}
                />
                {authErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{authErrors.name}</p>
                )}
              </div>
            )}

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSub}`}>
                E-mail
              </label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#a42cd6] focus:ring-1 focus:ring-[#a42cd6] transition ${themeClasses.bgAuthInput}`}
              />
              {authErrors.email && (
                <p className="text-red-400 text-xs mt-1">{authErrors.email}</p>
              )}
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSub}`}>
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#a42cd6] focus:ring-1 focus:ring-[#a42cd6] transition ${themeClasses.bgAuthInput}`}
              />
              {authErrors.password && (
                <p className="text-red-400 text-xs mt-1">{authErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#a42cd6] hover:bg-[#a42cd6]/90 text-white font-bold rounded-lg shadow-lg hover:shadow-[#a42cd6]/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? 'Acessar Dashboard' : 'Cadastrar Conta'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Button */}
          <div className={`mt-6 pt-4 border-t text-center ${isDark ? 'border-[#c179b9]/20' : 'border-[#e2c2c6]'}`}>
            <button
              onClick={handleFillDemo}
              type="button"
              className={`text-xs font-semibold hover:underline flex items-center justify-center gap-1 mx-auto transition ${
                isDark ? 'text-[#c179b9] hover:text-[#e2c2c6]' : 'text-[#502274] hover:text-[#a42cd6]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Preencher dados de teste (demo@taskflow.com)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER MAIN DASHBOARD
  return (
    <div className={`min-h-screen ${themeClasses.bgMain} flex flex-col md:flex-row font-sans overflow-x-hidden transition-colors duration-300`}>
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md transition-all animate-bounce ${
            toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-100'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
              : isDark
              ? 'bg-[#502274]/95 border-[#a42cd6]/50 text-white'
              : 'bg-white border-[#a42cd6]/50 text-[#2f242c] shadow-lg'
          }`}
        >
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {toast.type === 'success' && <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-[#a42cd6] shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`w-full md:w-64 border-r flex flex-col shrink-0 transition-all duration-300 ${themeClasses.bgSidebar} ${
          isSidebarOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-[#c179b9]/20' : 'border-[#e2c2c6]'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#a42cd6] rounded-xl shadow-md">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`font-extrabold text-lg tracking-wide ${themeClasses.textHeader}`}>TaskFlow</h2>
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                isDark ? 'text-[#c179b9] bg-[#2f242c]' : 'text-[#502274] bg-[#f8f4f9] border border-[#e2c2c6]'
              }`}>
                Workspace
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`md:hidden ${isDark ? 'text-[#e2c2c6]/70 hover:text-white' : 'text-[#502274]/70 hover:text-[#502274]'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card inside Sidebar */}
        <div className={`p-4 m-4 rounded-xl border flex flex-col gap-3 ${themeClasses.bgCardSidebar}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#a42cd6] to-[#c179b9] flex items-center justify-center font-bold text-white shadow">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className={`text-sm font-bold truncate ${themeClasses.textTitle}`}>{currentUser.name}</p>
              <p className={`text-xs truncate ${themeClasses.textSub}`}>{currentUser.email}</p>
            </div>
          </div>
          <div className={`pt-2 border-t text-xs flex justify-between ${isDark ? 'border-[#c179b9]/10 text-[#e2c2c6]/60' : 'border-[#e2c2c6] text-[#502274]/70'}`}>
            <span>Suas Tarefas:</span>
            <span className="font-bold text-[#a42cd6]">{userTasks.length}</span>
          </div>
        </div>

        {/* Board Stats */}
        <div className="px-5 py-2 flex-1 space-y-2 text-xs">
          <p className={`font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#c179b9]' : 'text-[#502274]'}`}>Resumo Geral</p>
          <div className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-[#2f242c]/40' : 'bg-[#f8f4f9] border border-[#e2c2c6]'}`}>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Pendentes
            </span>
            <span className={`font-bold px-2 py-0.5 rounded ${isDark ? 'bg-[#2f242c] text-white' : 'bg-white text-[#502274] border'}`}>
              {pendingTasks.length}
            </span>
          </div>
          <div className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-[#2f242c]/40' : 'bg-[#f8f4f9] border border-[#e2c2c6]'}`}>
            <span className="flex items-center gap-2">
              <PlayCircle className="w-3.5 h-3.5 text-[#a42cd6]" /> Em Andamento
            </span>
            <span className={`font-bold px-2 py-0.5 rounded ${isDark ? 'bg-[#2f242c] text-white' : 'bg-white text-[#502274] border'}`}>
              {inProgressTasks.length}
            </span>
          </div>
          <div className={`flex justify-between items-center p-2.5 rounded-lg ${isDark ? 'bg-[#2f242c]/40' : 'bg-[#f8f4f9] border border-[#e2c2c6]'}`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Concluídas (Travadas)
            </span>
            <span className={`font-bold px-2 py-0.5 rounded ${isDark ? 'bg-[#2f242c] text-white' : 'bg-white text-[#502274] border'}`}>
              {completedTasks.length}
            </span>
          </div>
        </div>

        {/* Rule note in sidebar */}
        <div className={`p-4 m-4 rounded-xl border text-xs flex items-start gap-2 ${
          isDark
            ? 'bg-[#a42cd6]/10 border-[#a42cd6]/30 text-[#e2c2c6]/80'
            : 'bg-[#a42cd6]/10 border-[#a42cd6]/30 text-[#502274]'
        }`}>
          <Lock className="w-4 h-4 text-[#a42cd6] shrink-0 mt-0.5" />
          <p>
            <strong>Regra do Quadro:</strong> Tarefas na coluna <em>Concluída</em> ficam totalmente travadas!
          </p>
        </div>

        {/* Footer Logout */}
        <div className={`p-4 border-t ${isDark ? 'border-[#c179b9]/20' : 'border-[#e2c2c6]'}`}>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR */}
        <header className={`backdrop-blur-md border-b p-4 sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 transition-colors duration-300 ${themeClasses.bgHeader}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`md:hidden p-2 rounded-lg ${isDark ? 'bg-[#2f242c] text-white' : 'bg-[#f8f4f9] text-[#2f242c] border'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className={`text-xl font-bold tracking-wide flex items-center gap-2 ${themeClasses.textHeader}`}>
              Quadro de Tarefas
            </h1>
          </div>

          {/* Action buttons, Theme Switcher & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-sm transition-all ${themeClasses.buttonToggle}`}
              title="Alternar entre Modo Claro e Escuro"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-[#502274]" />}
              <span className="hidden sm:inline">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            <button
              onClick={() => {
                setTaskForm({ title: '', description: '', dueDate: '' });
                setTaskErrors({});
                setIsCreateOpen(true);
              }}
              className="py-2.5 px-4 bg-[#a42cd6] hover:bg-[#a42cd6]/90 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>

            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className={`py-2.5 px-3 border rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                isDark
                  ? 'bg-[#2f242c] text-[#e2c2c6] border-[#c179b9]/30 hover:bg-[#2f242c]/80'
                  : 'bg-[#f8f4f9] text-[#2f242c] border-[#e2c2c6] hover:bg-[#e2c2c6]/30'
              }`}
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* FILTERS & SEARCH BAR */}
        <section className={`p-4 md:px-6 border-b transition-colors duration-300 ${themeClasses.bgFilterSection}`}>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a42cd6]" />
              <input
                type="text"
                placeholder="Filtrar por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm transition ${themeClasses.bgFilterInput}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter by Status & Sort Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Select */}
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs ${
                isDark ? 'bg-[#502274]/50 border-[#c179b9]/30 text-white' : 'bg-white border-[#e2c2c6] text-[#2f242c] shadow-sm'
              }`}>
                <Filter className="w-3.5 h-3.5 text-[#a42cd6]" />
                <span className="opacity-70 hidden sm:inline">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="ALL" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Todos</option>
                  <option value="PENDENTE" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Pendente</option>
                  <option value="EM_ANDAMENTO" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Em Andamento</option>
                  <option value="CONCLUIDA" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Concluída</option>
                </select>
              </div>

              {/* Sort by Due Date Select */}
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs ${
                isDark ? 'bg-[#502274]/50 border-[#c179b9]/30 text-white' : 'bg-white border-[#e2c2c6] text-[#2f242c] shadow-sm'
              }`}>
                <ArrowUpDown className="w-3.5 h-3.5 text-[#a42cd6]" />
                <span className="opacity-70 hidden sm:inline">Vencimento:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-transparent border-none focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="asc" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Crescente ↑</option>
                  <option value="desc" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Decrescente ↓</option>
                  <option value="none" className={isDark ? 'bg-[#502274]' : 'bg-white'}>Sem Ordenação</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* KANBAN BOARD 3 COLUMNS */}
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start min-w-[768px] md:min-w-0">
            {/* COLUMN 1: PENDENTE */}
            <KanbanColumn
              title="Pendente"
              statusKey="PENDENTE"
              badgeColor={isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'}
              borderColor={isDark ? 'border-amber-500/30' : 'border-[#e2c2c6]'}
              icon={<Clock className="w-4 h-4 text-amber-500" />}
              tasks={pendingTasks}
              dragOverColumn={dragOverColumn}
              onDragOver={(e) => handleDragOver(e, 'PENDENTE')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'PENDENTE')}
              onDragStart={handleDragStart}
              onEdit={handleOpenEdit}
              onDelete={(task) => setTaskToDelete(task)}
              onQuickMove={moveTaskStatus}
              formatDate={formatDate}
              isOverdue={isOverdue}
              isDark={isDark}
              themeClasses={themeClasses}
            />

            {/* COLUMN 2: EM ANDAMENTO */}
            <KanbanColumn
              title="Em Andamento"
              statusKey="EM_ANDAMENTO"
              badgeColor={isDark ? 'bg-[#a42cd6]/30 text-[#e2c2c6] border-[#a42cd6]/50' : 'bg-[#a42cd6]/15 text-[#502274] border-[#a42cd6]/30'}
              borderColor={isDark ? 'border-[#a42cd6]/40' : 'border-[#e2c2c6]'}
              icon={<PlayCircle className="w-4 h-4 text-[#a42cd6]" />}
              tasks={inProgressTasks}
              dragOverColumn={dragOverColumn}
              onDragOver={(e) => handleDragOver(e, 'EM_ANDAMENTO')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'EM_ANDAMENTO')}
              onDragStart={handleDragStart}
              onEdit={handleOpenEdit}
              onDelete={(task) => setTaskToDelete(task)}
              onQuickMove={moveTaskStatus}
              formatDate={formatDate}
              isOverdue={isOverdue}
              isDark={isDark}
              themeClasses={themeClasses}
            />

            {/* COLUMN 3: CONCLUÍDA */}
            <KanbanColumn
              title="Concluída (Travada)"
              statusKey="CONCLUIDA"
              badgeColor={isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}
              borderColor={isDark ? 'border-emerald-500/40' : 'border-[#e2c2c6]'}
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              isLockedColumn={true}
              tasks={completedTasks}
              dragOverColumn={dragOverColumn}
              onDragOver={(e) => handleDragOver(e, 'CONCLUIDA')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'CONCLUIDA')}
              onDragStart={handleDragStart}
              onEdit={handleOpenEdit}
              onDelete={(task) => setTaskToDelete(task)}
              onQuickMove={moveTaskStatus}
              formatDate={formatDate}
              isOverdue={isOverdue}
              isDark={isDark}
              themeClasses={themeClasses}
            />
          </div>
        </main>
      </div>

      {/* MODAL: CREATE TASK */}
      {isCreateOpen && (
        <TaskModal
          title="Nova Tarefa"
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          taskErrors={taskErrors}
          onSubmit={handleCreateTask}
          onClose={() => setIsCreateOpen(false)}
          submitLabel="Criar Tarefa"
          themeClasses={themeClasses}
          isDark={isDark}
        />
      )}

      {/* MODAL: EDIT TASK */}
      {editingTask && (
        <TaskModal
          title="Editar Tarefa"
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          taskErrors={taskErrors}
          onSubmit={handleUpdateTask}
          onClose={() => setEditingTask(null)}
          submitLabel="Salvar Alterações"
          isCompleted={editingTask.status === 'CONCLUIDA'}
          themeClasses={themeClasses}
          isDark={isDark}
        />
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transition-all ${themeClasses.bgModal}`}>
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Excluir Tarefa?</h3>
            </div>
            <p className={`text-sm mb-6 ${themeClasses.textSub}`}>
              Você tem certeza que deseja excluir "<strong>{taskToDelete.title}</strong>"? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isDark ? 'bg-[#2f242c] text-[#e2c2c6]' : 'bg-[#f8f4f9] text-[#2f242c] border'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KANBAN COLUMN COMPONENT
function KanbanColumn({
  title,
  statusKey,
  badgeColor,
  borderColor,
  icon,
  tasks,
  dragOverColumn,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onEdit,
  onDelete,
  onQuickMove,
  formatDate,
  isOverdue,
  isDark,
  themeClasses
}) {
  const isOver = dragOverColumn === statusKey;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border rounded-2xl flex flex-col min-h-[500px] transition-all duration-200 ${themeClasses.bgColumn} ${borderColor} ${
        isOver ? 'ring-2 ring-[#a42cd6] scale-[1.01]' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-[#c179b9]/20' : 'border-[#e2c2c6]'}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`font-bold text-sm tracking-wide ${themeClasses.textHeader}`}>{title}</h3>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}`}>
          {tasks.length}
        </span>
      </div>

      {/* Cards List Area */}
      <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
        {tasks.length === 0 ? (
          <div className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 ${
            isDark ? 'border-[#c179b9]/20 text-[#e2c2c6]/40' : 'border-[#e2c2c6] text-[#502274]/50'
          }`}>
            <p className="text-xs font-medium">Nenhuma tarefa nesta coluna</p>
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);

            return (
              <div
                key={task.id}
                draggable={task.status !== 'CONCLUIDA'}
                onDragStart={(e) => onDragStart(e, task)}
                className={`group rounded-xl p-4 transition-all relative ${themeClasses.bgTaskCard} ${
                  task.status === 'CONCLUIDA'
                    ? 'opacity-85 cursor-not-allowed border-emerald-500/40'
                    : 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5'
                }`}
              >
                {/* Top Task Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    onClick={() => onEdit(task)}
                    className={`font-bold text-sm hover:text-[#a42cd6] cursor-pointer line-clamp-2 ${themeClasses.textTitle}`}
                  >
                    {task.title}
                  </h4>
                  {task.status === 'CONCLUIDA' ? (
                    <span
                      title="Tarefa Concluída e Travada!"
                      className="p-1 bg-emerald-500/20 text-emerald-500 rounded-md border border-emerald-500/40 shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span
                      title="Clique e arraste para alterar o status"
                      className="p-1 opacity-40 group-hover:opacity-100 hover:text-[#a42cd6] shrink-0 transition"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Description Preview */}
                {task.description && (
                  <p className={`text-xs mb-3 line-clamp-3 leading-relaxed whitespace-pre-line ${themeClasses.textDesc}`}>
                    {task.description}
                  </p>
                )}

                {/* Task Footer */}
                <div className={`pt-2 border-t flex items-center justify-between text-xs mt-2 ${
                  isDark ? 'border-[#c179b9]/15' : 'border-[#e2c2c6]'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`w-3.5 h-3.5 ${overdue ? 'text-red-500' : 'text-[#a42cd6]'}`} />
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        overdue
                          ? 'bg-red-500/20 text-red-500 border border-red-500/40 font-bold'
                          : isDark
                          ? 'bg-[#502274] text-[#e2c2c6]'
                          : 'bg-[#f8f4f9] text-[#502274] border border-[#e2c2c6]'
                      }`}
                    >
                      {formatDate(task.dueDate)}
                      {overdue && ' (Atrasada)'}
                    </span>
                  </div>

                  {/* Quick Action Icons */}
                  <div className="flex items-center gap-1">
                    {task.status === 'PENDENTE' && (
                      <button
                        onClick={() => onQuickMove(task.id, 'EM_ANDAMENTO')}
                        title="Mover para Em Andamento"
                        className="p-1.5 hover:bg-[#a42cd6]/20 text-[#a42cd6] rounded-lg transition"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    )}
                    {task.status !== 'CONCLUIDA' && (
                      <button
                        onClick={() => onQuickMove(task.id, 'CONCLUIDA')}
                        title="Concluir e Travar"
                        className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onEdit(task)}
                      title="Editar detalhes"
                      className="p-1.5 opacity-70 hover:opacity-100 rounded-lg transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(task)}
                      title="Excluir tarefa"
                      className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// TASK FORM MODAL (CREATE / EDIT)
function TaskModal({
  title,
  taskForm,
  setTaskForm,
  taskErrors,
  onSubmit,
  onClose,
  submitLabel,
  isCompleted,
  themeClasses,
  isDark
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border relative transition-all ${themeClasses.bgModal}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 opacity-70 hover:opacity-100 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${themeClasses.textHeader}`}>
          {title}
        </h3>

        {isCompleted && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Esta tarefa foi marcada como Concluída e não pode ter seu status alterado.</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Title input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${themeClasses.textSub}`}>
                Nome da Tarefa <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] opacity-60">
                {taskForm.title.length} / 200
              </span>
            </div>
            <input
              type="text"
              placeholder="Digite o título da tarefa (3 a 200 caracteres)"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              maxLength={200}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#a42cd6] transition ${themeClasses.bgModalInput}`}
            />
            {taskErrors.title && (
              <p className="text-red-500 text-xs mt-1">{taskErrors.title}</p>
            )}
          </div>

          {/* Description input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${themeClasses.textSub}`}>
                Descrição <span className="text-[10px] font-normal opacity-60">(Opcional)</span>
              </label>
              <span className="text-[10px] opacity-60">
                {taskForm.description.length} / 2000
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Adicione detalhes ou notas para esta tarefa (até 2000 caracteres)"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              maxLength={2000}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#a42cd6] transition ${themeClasses.bgModalInput}`}
            />
            {taskErrors.description && (
              <p className="text-red-500 text-xs mt-1">{taskErrors.description}</p>
            )}
          </div>

          {/* Due Date Input */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${themeClasses.textSub}`}>
              Data de Vencimento <span className="text-[10px] font-normal opacity-60">(Opcional)</span>
            </label>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#a42cd6] transition ${themeClasses.bgModalInput}`}
            />
          </div>

          {/* Buttons */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? 'border-[#c179b9]/20' : 'border-[#e2c2c6]'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                isDark ? 'bg-[#2f242c] text-[#e2c2c6]' : 'bg-[#f8f4f9] text-[#2f242c] border'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#a42cd6] hover:bg-[#a42cd6]/90 text-white rounded-xl text-sm font-bold shadow-lg transition active:scale-95"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}