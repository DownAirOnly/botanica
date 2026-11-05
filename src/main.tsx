import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {AccountProvider} from './state/AccountContext';
import {AccountGate} from './components/AccountGate';
import {AppProvider} from './state/AppContext';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountProvider><AccountGate><AppProvider><App/></AppProvider></AccountGate></AccountProvider></React.StrictMode>);
