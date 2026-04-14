import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: JSON.parse(localStorage.getItem('smarteye_user') || 'null'),
  token: localStorage.getItem('smarteye_token') || null,
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, loading: false, user: action.payload.user, token: action.payload.token, error: null };
    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, token: null, error: null };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.token && !state.user) {
      authAPI.getMe()
        .then(res => dispatch({ type: 'AUTH_SUCCESS', payload: { user: res.data, token: state.token } }))
        .catch(() => dispatch({ type: 'LOGOUT' }));
    }
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await authAPI.login({ email, password });
      localStorage.setItem('smarteye_token', res.data.token);
      localStorage.setItem('smarteye_user', JSON.stringify(res.data.user));
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      throw new Error(msg);
    }
  };

  const register = async (data) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await authAPI.register(data);
      localStorage.setItem('smarteye_token', res.data.token);
      localStorage.setItem('smarteye_user', JSON.stringify(res.data.user));
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('smarteye_token');
    localStorage.removeItem('smarteye_user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
